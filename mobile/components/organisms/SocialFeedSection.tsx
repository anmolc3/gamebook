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
import { GameLogo } from '../atoms/GameLogo';
import { useAuth } from '../../features/auth/AuthContext';
import { ImagePickerService } from '../../services/imagePicker.service';
import { FeedService, FeedPostItem } from '../../services/feed.service';
import { ImageCropperModal } from './ImageCropperModal';
import { GameSelectorModal } from './GameSelectorModal';
import { GAME_CAPABILITIES } from '../../constants/gameCapabilities';

export type SocialFeedPost = FeedPostItem;

/**
 * Filter out legacy 'Social Arena Update' placeholder tag or empty tags.
 * Only explicit game tags are displayed.
 */
export function shouldShowGameBadge(tag?: string | null): boolean {
  if (!tag) return false;
  const trimmed = tag.trim();
  if (!trimmed) return false;
  const lower = trimmed.toLowerCase();
  if (lower.includes('social arena update')) return false;
  if (lower === 'none') return false;
  return true;
}

/**
 * Resolves canonical game name from game ID or clean legacy title.
 */
export function getGameDisplayName(tag: string): string {
  if (!tag) return '';
  const trimmed = tag.trim();
  if (GAME_CAPABILITIES[trimmed]?.name) {
    return GAME_CAPABILITIES[trimmed].name;
  }
  const norm = trimmed.toUpperCase().replace(/[\s\-]+/g, '_');
  if (GAME_CAPABILITIES[norm]?.name) {
    return GAME_CAPABILITIES[norm].name;
  }
  const cleaned = trimmed
    .replace(/^[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\s]+/u, '')
    .split('•')[0]
    .trim();
  return cleaned || trimmed;
}

// Component to dynamically display photos in any natural aspect ratio without unexpected cropping
export const FeedPostImage: React.FC<{ uri: string }> = ({ uri }) => {
  const [aspectRatio, setAspectRatio] = useState<number | null>(null);

  useEffect(() => {
    if (!uri) return;
    Image.getSize(
      uri,
      (width, height) => {
        if (width > 0 && height > 0) {
          setAspectRatio(width / height);
        }
      },
      () => {
        // Fallback for data URIs / unmeasured
      }
    );
  }, [uri]);

  return (
    <View style={styles.fullBleedImageContainer}>
      <Image
        source={{ uri }}
        onLoad={(e) => {
          const { width, height } = e.nativeEvent.source;
          if (width > 0 && height > 0) {
            setAspectRatio(width / height);
          }
        }}
        style={[
          styles.fullBleedImage,
          aspectRatio ? { aspectRatio } : { height: 260 },
        ]}
        resizeMode="contain"
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
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const [isGameSelectorVisible, setIsGameSelectorVisible] = useState(false);
  const [cropperImageUri, setCropperImageUri] = useState<string | null>(null);
  const [isCropperVisible, setIsCropperVisible] = useState(false);
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

  // Pick photo from device local storage in ANY aspect ratio and open ImageCropperModal
  const handlePickLocalImage = async () => {
    const res = await ImagePickerService.pickImageFromDevice({
      allowsEditing: false, // Let user crop using full in-app cropper with all ratio options
      quality: 0.88,
    });
    if (res && !res.canceled && res.uri) {
      setCropperImageUri(res.uri);
      setIsCropperVisible(true);
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
        gameTag: selectedGameId ? selectedGameId : undefined,
      });

      // Optimistically add or ensure in state
      setPosts((prev) => {
        if (prev.some((p) => p.id === createdPost.id)) return prev;
        return [createdPost, ...prev];
      });

      setNewPostText('');
      setNewPostImage(null);
      setSelectedGameId(null);
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

        {/* Attached photo preview with tap-to-crop */}
        {newPostImage && (
          <View style={styles.attachedImageWrap}>
            <TouchableOpacity
              activeOpacity={0.88}
              onPress={() => {
                setCropperImageUri(newPostImage);
                setIsCropperVisible(true);
              }}
              style={styles.attachedImageTouchable}
            >
              <Image source={{ uri: newPostImage }} style={styles.attachedImagePreview} resizeMode="contain" />
              <View style={[styles.cropHintBadge, { backgroundColor: 'rgba(0,0,0,0.65)' }]}>
                <Icon name="crop" size={12} color="#FFFFFF" />
                <Text style={styles.cropHintText}>Tap to crop / adjust</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setNewPostImage(null)}
              style={styles.removeImageBtn}
              activeOpacity={0.7}
              accessibilityLabel="Remove photo"
            >
              <Icon name="close" size={14} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        )}

        {/* Selected Game Tag Chip (if chosen) */}
        {selectedGameId && (
          <View style={styles.composerGameRow}>
            <View
              style={[
                styles.selectedGameBadge,
                {
                  backgroundColor: theme.colors.cardTintMint || 'rgba(62, 213, 152, 0.12)',
                  borderColor: theme.colors.primary,
                },
              ]}
            >
              <GameLogo gameType={selectedGameId} size={18} borderRadius={4} />
              <Text
                style={[styles.selectedGameText, { color: theme.colors.primary }]}
                numberOfLines={1}
              >
                {getGameDisplayName(selectedGameId)}
              </Text>
              <TouchableOpacity
                onPress={() => setIsGameSelectorVisible(true)}
                style={styles.changeGameBtn}
                activeOpacity={0.7}
              >
                <Text style={[styles.changeGameBtnText, { color: theme.colors.textMuted }]}>
                  Change
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setSelectedGameId(null)}
                style={styles.removeGameBtn}
                activeOpacity={0.7}
                accessibilityLabel="Remove game tag"
              >
                <Icon name="close" size={12} color={theme.colors.primary} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Action toolbar */}
        <View style={[styles.composerToolbar, { borderTopColor: theme.colors.divider }]}>
          <View style={styles.toolbarLeftActions}>
            <TouchableOpacity
              onPress={handlePickLocalImage}
              style={styles.attachPhotoBtn}
              activeOpacity={0.8}
              accessibilityLabel="Attach Photo"
            >
              <Icon name="camera" size={24} color={theme.colors.primary} />
            </TouchableOpacity>

            {/* Optional Related Game Trigger Button */}
            <TouchableOpacity
              onPress={() => setIsGameSelectorVisible(true)}
              style={[
                styles.tagGameActionBtn,
                {
                  borderColor: selectedGameId ? theme.colors.primary : theme.colors.border,
                  backgroundColor: selectedGameId
                    ? theme.colors.cardTintMint || 'rgba(62, 213, 152, 0.12)'
                    : theme.colors.surfaceElevated,
                },
              ]}
              activeOpacity={0.75}
              accessibilityLabel="Select Related Game"
            >
              <Icon
                name="gamepad"
                size={16}
                color={selectedGameId ? theme.colors.primary : theme.colors.textSecondary}
              />
              <Text
                style={[
                  styles.tagGameActionText,
                  { color: selectedGameId ? theme.colors.primary : theme.colors.textSecondary },
                ]}
                numberOfLines={1}
              >
                {selectedGameId ? getGameDisplayName(selectedGameId) : 'Related Game'}
              </Text>
            </TouchableOpacity>
          </View>

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
                {shouldShowGameBadge(post.gameTag) && (
                  <View style={[styles.gameTagPill, { backgroundColor: theme.colors.cardTintMint, flexDirection: 'row', alignItems: 'center', gap: 6 }]}>
                    <GameLogo
                      gameType={post.gameTag}
                      size={16}
                      borderRadius={4}
                      fallbackIcon="gamepad"
                    />
                    <Text style={[styles.gameTagText, { color: theme.colors.primary }]} numberOfLines={1}>
                      {getGameDisplayName(post.gameTag!)}
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
      {/* Photo Cropper Modal with all aspect ratios (Original, 1:1, 4:5, 3:4, 16:9, Free) and Done button */}
      <ImageCropperModal
        visible={isCropperVisible}
        imageUri={cropperImageUri}
        onClose={() => setIsCropperVisible(false)}
        onCropDone={(resultUri, _ratioId) => {
          setNewPostImage(resultUri);
          setIsCropperVisible(false);
        }}
      />

      {/* Optional Related Game Selector Modal */}
      <GameSelectorModal
        visible={isGameSelectorVisible}
        selectedGameId={selectedGameId}
        onSelectGame={(gameId) => setSelectedGameId(gameId)}
        onClose={() => setIsGameSelectorVisible(false)}
      />
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
  attachedImageTouchable: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  attachedImagePreview: {
    width: '100%',
    height: '100%',
  },
  cropHintBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  cropHintText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
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
  composerGameRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectedGameBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    maxWidth: '100%',
  },
  selectedGameText: {
    fontSize: 12,
    fontWeight: '700',
    maxWidth: 160,
  },
  changeGameBtn: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  changeGameBtnText: {
    fontSize: 11,
    fontWeight: '600',
  },
  removeGameBtn: {
    padding: 3,
  },
  composerToolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  toolbarLeftActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  attachPhotoBtn: {
    padding: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagGameActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  tagGameActionText: {
    fontSize: 12,
    fontWeight: '600',
    maxWidth: 140,
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
