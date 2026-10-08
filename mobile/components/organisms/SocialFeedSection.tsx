import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useTheme } from '../../theme';
import { Icon } from '../../icons';
import { Avatar } from '../atoms/Avatar';
import { useAuth } from '../../features/auth/AuthContext';
import { ImagePickerService } from '../../services/imagePicker.service';
import { FeedService, FeedPostItem } from '../../services/feed.service';

export type SocialFeedPost = FeedPostItem;

// Component to dynamically display photos in any natural aspect ratio edge-to-edge
export const FeedPostImage: React.FC<{ uri: string }> = ({ uri }) => {
  const [aspectRatio, setAspectRatio] = useState<number>(1.77);

  useEffect(() => {
    if (!uri) return;
    Image.getSize(
      uri,
      (width, height) => {
        if (width > 0 && height > 0) {
          // Clamp ratio between 0.6 (tall portrait) and 2.2 (wide panorama) for ideal mobile UX
          const naturalRatio = width / height;
          const clamped = Math.max(0.6, Math.min(2.2, naturalRatio));
          setAspectRatio(clamped);
        }
      },
      () => {
        setAspectRatio(1.77);
      }
    );
  }, [uri]);

  return (
    <View style={styles.fullBleedImageContainer}>
      <Image
        source={{ uri }}
        style={[styles.fullBleedImage, { aspectRatio }]}
        resizeMode="cover"
      />
    </View>
  );
};

interface SocialFeedSectionProps {
  onChallengeUser?: (userId: string, username: string) => void;
  onViewProfile?: (userId: string) => void;
  onAddFriends?: () => void;
  maxPosts?: number;
  edgeToEdge?: boolean;
}

export const SocialFeedSection: React.FC<SocialFeedSectionProps> = ({
  onChallengeUser,
  onViewProfile,
  onAddFriends,
  maxPosts,
  edgeToEdge = true,
}) => {
  const { theme } = useTheme();
  const { user } = useAuth();

  const [posts, setPosts] = useState<SocialFeedPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newPostText, setNewPostText] = useState('');
  const [newPostImage, setNewPostImage] = useState<string | null>(null);
  const [isPosting, setIsPosting] = useState(false);
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [submittingCommentId, setSubmittingCommentId] = useState<string | null>(null);

  // 1. Load Real-Time Feeds from Backend
  const loadFeeds = useCallback(async () => {
    try {
      const data = await FeedService.getFeeds();
      setPosts(data);
    } catch (err) {
      console.log('Error fetching feeds:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFeeds();

    // 2. Real-Time WebSocket Listeners for Instant Synchronization
    const unsubNewPost = FeedService.onNewPost((incomingPost) => {
      setPosts((prev) => {
        // Prevent duplicate if already in state
        if (prev.some((p) => p.id === incomingPost.id)) return prev;
        return [incomingPost, ...prev];
      });
    });

    const unsubLiked = FeedService.onPostLiked((data) => {
      setPosts((prev) =>
        prev.map((p) => {
          if (p.id === data.postId) {
            return {
              ...p,
              likesCount: data.likesCount,
              isLikedByMe: user?.id === data.userId ? data.isLiked : p.isLikedByMe,
            };
          }
          return p;
        })
      );
    });

    const unsubComment = FeedService.onNewComment((data) => {
      setPosts((prev) =>
        prev.map((p) => {
          if (p.id === data.postId) {
            const currentComments = p.comments || [];
            // Prevent duplicate
            if (currentComments.some((c) => c.id === data.comment.id)) return p;
            return {
              ...p,
              commentsCount: data.commentsCount,
              comments: [...currentComments, data.comment],
            };
          }
          return p;
        })
      );
    });

    const unsubDeleted = FeedService.onPostDeleted((data) => {
      setPosts((prev) => prev.filter((p) => p.id !== data.postId));
    });

    return () => {
      unsubNewPost();
      unsubLiked();
      unsubComment();
      unsubDeleted();
    };
  }, [loadFeeds, user?.id]);

  // Pick photo from device local storage in ANY aspect ratio
  const handlePickLocalImage = async () => {
    const res = await ImagePickerService.pickImageFromDevice({
      allowsEditing: false, // Preserves natural aspect ratio (square, portrait, landscape, etc.)
      quality: 0.88,
    });
    if (res && !res.canceled && res.uri) {
      setNewPostImage(res.uri);
    }
  };

  // Publish a new real post
  const handleCreatePost = async () => {
    if (!newPostText.trim() && !newPostImage) {
      Alert.alert('Post Content Required', 'Please write something or attach a photo to share.');
      return;
    }

    setIsPosting(true);
    try {
      const createdPost = await FeedService.createPost({
        content: newPostText.trim(),
        imageUrl: newPostImage || undefined,
        gameTag: '🎮 Social Arena Update',
      });

      // Optimistically add or ensure in state
      setPosts((prev) => {
        if (prev.some((p) => p.id === createdPost.id)) return prev;
        return [createdPost, ...prev];
      });

      setNewPostText('');
      setNewPostImage(null);
    } catch (err: any) {
      Alert.alert('Failed to Publish', err.message || 'Could not connect to feed server.');
    } finally {
      setIsPosting(false);
    }
  };

  // Real-Time Like / Unlike
  const handleToggleLike = async (postId: string) => {
    // Optimistic UI update
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id === postId) {
          const nextLiked = !p.isLikedByMe;
          return {
            ...p,
            isLikedByMe: nextLiked,
            likesCount: nextLiked ? p.likesCount + 1 : Math.max(0, p.likesCount - 1),
          };
        }
        return p;
      })
    );

    try {
      const res = await FeedService.toggleLike(postId);
      setPosts((prev) =>
        prev.map((p) => {
          if (p.id === postId) {
            return {
              ...p,
              likesCount: res.likesCount,
              isLikedByMe: res.isLiked,
            };
          }
          return p;
        })
      );
    } catch (err) {
      // Revert if failed
      setPosts((prev) =>
        prev.map((p) => {
          if (p.id === postId) {
            const reverted = !p.isLikedByMe;
            return {
              ...p,
              isLikedByMe: reverted,
              likesCount: reverted ? p.likesCount + 1 : Math.max(0, p.likesCount - 1),
            };
          }
          return p;
        })
      );
    }
  };

  // Real-Time Add Comment
  const handleAddComment = async (postId: string) => {
    const text = commentInputs[postId]?.trim();
    if (!text) return;

    setSubmittingCommentId(postId);
    try {
      const comment = await FeedService.addComment(postId, text);
      setPosts((prev) =>
        prev.map((p) => {
          if (p.id === postId) {
            const existing = p.comments || [];
            if (existing.some((c) => c.id === comment.id)) return p;
            return {
              ...p,
              commentsCount: p.commentsCount + 1,
              comments: [...existing, comment],
            };
          }
          return p;
        })
      );
      setCommentInputs((prev) => ({ ...prev, [postId]: '' }));
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not add comment');
    } finally {
      setSubmittingCommentId(null);
    }
  };

  // Delete own post
  const handleDeletePost = (postId: string) => {
    Alert.alert('Delete Post', 'Are you sure you want to delete this post?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await FeedService.deletePost(postId);
            setPosts((prev) => prev.filter((p) => p.id !== postId));
          } catch (err: any) {
            Alert.alert('Error', err.message || 'Could not delete post');
          }
        },
      },
    ]);
  };

  const displayedPosts = maxPosts ? posts.slice(0, maxPosts) : posts;

  return (
    <View style={[styles.container, edgeToEdge && styles.edgeToEdgeContainer]}>
      {/* 1. Edge-to-Edge Quick Post Composer */}
      <View
        style={[
          styles.composerCard,
          {
            backgroundColor: theme.colors.surface,
            borderBottomColor: theme.colors.divider,
          },
        ]}
      >
        <View style={styles.composerHeaderRow}>
          <Avatar
            displayName={user?.displayName || 'Player'}
            avatarUrl={user?.avatarUrl}
            size="sm"
            status="online"
          />
          <TextInput
            style={[
              styles.composerInput,
              {
                color: theme.colors.textPrimary,
                backgroundColor: theme.colors.surfaceElevated,
                borderColor: theme.colors.border,
              },
            ]}
            placeholder="Share a game win, rematch callout, or photo..."
            placeholderTextColor={theme.colors.textMuted}
            value={newPostText}
            onChangeText={setNewPostText}
            multiline
            maxLength={280}
          />
        </View>

        {/* Attached photo preview */}
        {newPostImage && (
          <View style={styles.attachedImageWrap}>
            <Image source={{ uri: newPostImage }} style={styles.attachedImagePreview} resizeMode="cover" />
            <TouchableOpacity
              onPress={() => setNewPostImage(null)}
              style={styles.removeImageBtn}
              activeOpacity={0.7}
            >
              <Icon name="close" size={14} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        )}

        {/* Action toolbar */}
        <View style={[styles.composerToolbar, { borderTopColor: theme.colors.divider }]}>
          <TouchableOpacity
            onPress={handlePickLocalImage}
            style={styles.attachPhotoBtn}
            activeOpacity={0.8}
            accessibilityLabel="Attach Photo"
          >
            <Icon name="camera" size={26} color={theme.colors.primary} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleCreatePost}
            disabled={isPosting}
            style={[
              styles.postSubmitBtn,
              { backgroundColor: theme.colors.primary, opacity: isPosting ? 0.6 : 1 },
            ]}
            activeOpacity={0.82}
          >
            {isPosting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.postSubmitBtnText}>Post Feed</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Loading state indicator */}
      {isLoading && (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.textMuted }]}>
            Connecting to real-time feed...
          </Text>
        </View>
      )}

      {/* Empty State */}
      {!isLoading && displayedPosts.length === 0 && (
        <View style={styles.emptyBox}>
          <View
            style={[
              styles.emptyIconCircle,
              {
                backgroundColor: theme.colors.surfaceElevated,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <Icon name="users" size={32} color={theme.colors.primary} />
          </View>
          <Text style={[styles.emptyTitleText, { color: theme.colors.textPrimary }]}>
            Add friends to see feeds and play with them
          </Text>
          <Text style={[styles.emptySubText, { color: theme.colors.textSecondary }]}>
            Connect with players around you to discover their gaming moments, share high scores, and send instant match invites!
          </Text>
          {onAddFriends && (
            <TouchableOpacity
              onPress={onAddFriends}
              style={[styles.emptyActionBtn, { backgroundColor: theme.colors.primary }]}
              activeOpacity={0.8}
            >
              <Icon name="userPlus" size={16} color={theme.colors.textOnPrimary} />
              <Text style={[styles.emptyActionBtnText, { color: theme.colors.textOnPrimary }]}>
                Find Players Around You
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* 2. Edge-to-Edge Feed Stream Items */}
      {displayedPosts.map((post) => {
        const isCommentsOpen = !!expandedComments[post.id];
        const isMyPost = user?.id && post.authorId === user.id;

        return (
          <View
            key={post.id}
            style={[
              styles.edgePostItem,
              {
                backgroundColor: theme.colors.surface,
                borderBottomColor: theme.colors.divider,
              },
            ]}
          >
            {/* Post Header: Author info & Game tag */}
            <View style={styles.postHeaderRow}>
              <TouchableOpacity
                onPress={() => onViewProfile && onViewProfile(post.authorId)}
                style={styles.authorMeta}
                activeOpacity={0.7}
              >
                <Avatar
                  displayName={post.authorName}
                  avatarUrl={post.authorAvatar}
                  size="md"
                  status="online"
                />
                <View style={styles.authorTextContainer}>
                  <Text style={[styles.authorName, { color: theme.colors.textPrimary }]}>
                    {post.authorName}
                  </Text>
                  <Text style={[styles.authorUsername, { color: theme.colors.textMuted }]}>
                    @{post.authorUsername} • {post.timeAgo}
                  </Text>
                </View>
              </TouchableOpacity>

              <View style={styles.headerRightActions}>
                {post.gameTag && (
                  <View style={[styles.gameTagPill, { backgroundColor: theme.colors.cardTintMint }]}>
                    <Text style={[styles.gameTagText, { color: theme.colors.primary }]}>
                      {post.gameTag}
                    </Text>
                  </View>
                )}

                {isMyPost && (
                  <TouchableOpacity
                    onPress={() => handleDeletePost(post.id)}
                    style={styles.deletePostBtn}
                    activeOpacity={0.7}
                  >
                    <Icon name="close" size={14} color={theme.colors.textMuted} />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Post Text Content */}
            {post.content ? (
              <Text style={[styles.postContentText, { color: theme.colors.textPrimary }]}>
                {post.content}
              </Text>
            ) : null}

            {/* Attached Image Artwork: Full-bleed Edge to Edge in any ratio */}
            {post.imageUrl ? (
              <FeedPostImage uri={post.imageUrl} />
            ) : null}

            {/* Action Bar: Like, Comment, Challenge */}
            <View style={[styles.postActionBar, { borderTopColor: theme.colors.divider }]}>
              {/* Like Button */}
              <TouchableOpacity
                onPress={() => handleToggleLike(post.id)}
                style={styles.actionBtn}
                activeOpacity={0.7}
              >
                <Icon
                  name="heart"
                  size={18}
                  color={post.isLikedByMe ? '#FF4757' : theme.colors.textMuted}
                />
                <Text
                  style={[
                    styles.actionBtnText,
                    { color: post.isLikedByMe ? '#FF4757' : theme.colors.textSecondary },
                  ]}
                >
                  {post.likesCount}
                </Text>
              </TouchableOpacity>

              {/* Comment Button */}
              <TouchableOpacity
                onPress={() =>
                  setExpandedComments((prev) => ({
                    ...prev,
                    [post.id]: !prev[post.id],
                  }))
                }
                style={styles.actionBtn}
                activeOpacity={0.7}
              >
                <Icon name="chat" size={18} color={theme.colors.textMuted} />
                <Text style={[styles.actionBtnText, { color: theme.colors.textSecondary }]}>
                  {post.commentsCount}
                </Text>
              </TouchableOpacity>

              {/* 1-Tap Challenge Button */}
              {onChallengeUser && post.authorId !== user?.id && (
                <TouchableOpacity
                  onPress={() => onChallengeUser(post.authorId, post.authorUsername)}
                  style={[styles.challengeActionBtn, { backgroundColor: theme.colors.surfaceElevated }]}
                  activeOpacity={0.8}
                >
                  <Icon name="gamepad" size={14} color={theme.colors.primary} />
                  <Text style={[styles.challengeActionText, { color: theme.colors.primary }]}>
                    Challenge
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Expanded Comments Drawer */}
            {isCommentsOpen && (
              <View style={[styles.commentsSection, { borderTopColor: theme.colors.divider }]}>
                {post.comments && post.comments.length > 0 ? (
                  post.comments.map((comment) => (
                    <View key={comment.id} style={styles.commentItem}>
                      <Avatar
                        displayName={comment.authorName}
                        avatarUrl={comment.authorAvatar}
                        size="sm"
                      />
                      <View style={styles.commentBubble}>
                        <Text style={[styles.commentAuthor, { color: theme.colors.textPrimary }]}>
                          {comment.authorName}
                        </Text>
                        <Text style={[styles.commentText, { color: theme.colors.textSecondary }]}>
                          {comment.text}
                        </Text>
                      </View>
                    </View>
                  ))
                ) : (
                  <Text style={[styles.noCommentsText, { color: theme.colors.textMuted }]}>
                    No comments yet. Be the first to reply!
                  </Text>
                )}

                {/* Comment Input */}
                <View style={styles.commentInputRow}>
                  <TextInput
                    style={[
                      styles.commentInput,
                      {
                        backgroundColor: theme.colors.surfaceElevated,
                        color: theme.colors.textPrimary,
                        borderColor: theme.colors.border,
                      },
                    ]}
                    placeholder="Write a live reply..."
                    placeholderTextColor={theme.colors.textMuted}
                    value={commentInputs[post.id] || ''}
                    onChangeText={(val) => setCommentInputs((prev) => ({ ...prev, [post.id]: val }))}
                  />
                  <TouchableOpacity
                    onPress={() => handleAddComment(post.id)}
                    disabled={submittingCommentId === post.id}
                    style={[styles.sendCommentBtn, { backgroundColor: theme.colors.primary }]}
                    activeOpacity={0.8}
                  >
                    {submittingCommentId === post.id ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Icon name="arrowRight" size={14} color={theme.colors.textOnPrimary} />
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  edgeToEdgeContainer: {
    marginHorizontal: -16,
    width: 'auto',
  },
  composerCard: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    marginBottom: 8,
  },
  composerHeaderRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  composerInput: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 13,
    minHeight: 52,
  },
  attachedImageWrap: {
    marginTop: 10,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    height: 150,
  },
  attachedImagePreview: {
    width: '100%',
    height: '100%',
  },
  removeImageBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.65)',
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },
  composerToolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  attachPhotoBtn: {
    padding: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  postSubmitBtn: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  postSubmitBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  loadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 20,
  },
  loadingText: {
    fontSize: 12,
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
    gap: 10,
  },
  emptyIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitleText: {
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  emptySubText: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    paddingHorizontal: 28,
  },
  emptyActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 14,
    marginTop: 6,
  },
  emptyActionBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  emptyText: {
    fontSize: 13,
  },
  // Edge-to-Edge Feed Post Item
  edgePostItem: {
    width: '100%',
    borderBottomWidth: 8,
    paddingVertical: 14,
  },
  postHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  authorMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  authorTextContainer: {
    flex: 1,
  },
  authorName: {
    fontSize: 14,
    fontWeight: '700',
  },
  authorUsername: {
    fontSize: 11,
    marginTop: 1,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  gameTagPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    maxWidth: 160,
  },
  gameTagText: {
    fontSize: 10,
    fontWeight: '800',
  },
  deletePostBtn: {
    padding: 6,
  },
  postContentText: {
    fontSize: 13,
    lineHeight: 20,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  // Full-bleed artwork edge-to-edge in any ratio
  fullBleedImageContainer: {
    width: '100%',
    backgroundColor: '#05070B',
    marginBottom: 10,
    overflow: 'hidden',
  },
  fullBleedImage: {
    width: '100%',
  },
  postActionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  challengeActionBtn: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  challengeActionText: {
    fontSize: 12,
    fontWeight: '700',
  },
  commentsSection: {
    marginTop: 12,
    paddingTop: 10,
    paddingHorizontal: 16,
    borderTopWidth: 1,
  },
  commentItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 8,
  },
  commentBubble: {
    flex: 1,
  },
  commentAuthor: {
    fontSize: 12,
    fontWeight: '700',
  },
  commentText: {
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 16,
  },
  noCommentsText: {
    fontSize: 12,
    fontStyle: 'italic',
    marginBottom: 8,
  },
  commentInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  commentInput: {
    flex: 1,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 12,
  },
  sendCommentBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
