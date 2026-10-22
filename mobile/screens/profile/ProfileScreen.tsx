import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  StatusBar,
  Image,
  Modal,
  TextInput,
  Alert,
  Share,
  BackHandler,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from '../../theme';
import { Icon, IconName } from '../../icons';
import { Avatar } from '../../components/atoms/Avatar';
import { EditProfileModal } from '../../components/organisms/EditProfileModal';
import { SettingsModal, SettingsPage } from '../../components/organisms/SettingsModal';
import { ImageCropperModal } from '../../components/organisms/ImageCropperModal';
import { useAuth } from '../../features/auth/AuthContext';
import {
  ProfileService,
  UserProfile,
  RelationshipState,
} from '../../services/profile.service';
import { ImagePickerService } from '../../services/imagePicker.service';
import { FeedService, FeedPostItem } from '../../services/feed.service';
import { FeedPostImage } from '../../components/organisms/SocialFeedSection';
import { FriendsService } from '../../services/friends.service';

export interface ProfileScreenProps {
  userId?: string;
  onBack?: () => void;
  onNavigateToChat?: (userId: string, username: string) => void;
  onChallenge?: (userId: string, username: string) => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  userId,
  onBack,
  onNavigateToChat,
  onChallenge,
}) => {
  const { theme } = useTheme();
  const { user: authUser, logout, updateUser } = useAuth();
  const isOwnProfile = !userId || userId === authUser?.id;

  const isDark = theme.mode === 'dark';
  const sheetBg = isDark ? '#10141D' : '#FFFFFF';
  const sheetBorder = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)';
  const sheetGrabBar = isDark ? 'rgba(255, 255, 255, 0.22)' : 'rgba(0, 0, 0, 0.16)';
  const sheetTitleColor = isDark ? '#FFFFFF' : theme.colors.textPrimary;
  const sheetCloseColor = isDark ? '#7E8B9B' : '#64748B';
  const sheetItemBorder = isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)';
  const sheetItemTitle = isDark ? '#FFFFFF' : theme.colors.textPrimary;
  const sheetItemDesc = isDark ? '#7E8B9B' : theme.colors.textSecondary;
  const sheetChevronColor = isDark ? '#4B5565' : '#94A3B8';
  const sheetIconColor = isDark ? '#94A3B8' : '#64748B';

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isSettingsModalVisible, setIsSettingsModalVisible] = useState(false);
  const [settingsInitialPage, setSettingsInitialPage] = useState<SettingsPage>('root');
  const [isMenuModalVisible, setIsMenuModalVisible] = useState(false);
  const [isPeerMenuModalVisible, setIsPeerMenuModalVisible] = useState(false);
  const [fullSizeImage, setFullSizeImage] = useState<string | null>(null);
  const [cropperImageUri, setCropperImageUri] = useState<string | null>(null);
  const [isCropperVisible, setIsCropperVisible] = useState(false);
  const [activeSlide, setActiveSlide] = useState<'posts' | 'stats'>('posts');

  // Real-time Posts State for Profile
  const [userPosts, setUserPosts] = useState<FeedPostItem[]>([]);
  const [isLoadingPosts, setIsLoadingPosts] = useState<boolean>(false);
  const [newPostText, setNewPostText] = useState('');
  const [newPostImage, setNewPostImage] = useState<string | null>(null);
  const [isPosting, setIsPosting] = useState(false);

  const loadProfile = useCallback(async () => {
    try {
      setErrorMsg(null);
      let data: UserProfile;
      if (isOwnProfile) {
        data = await ProfileService.fetchMyProfile();
      } else {
        data = await ProfileService.fetchUserProfile(userId!);
      }
      setProfile(data);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load profile');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [isOwnProfile, userId]);

  const loadUserPosts = useCallback(async () => {
    try {
      setIsLoadingPosts(true);
      const allFeeds = await FeedService.getFeeds();
      const targetUserId = userId || authUser?.id;
      const filtered = allFeeds.filter(
        (p) => p.authorId === targetUserId || (isOwnProfile && p.authorId === authUser?.id)
      );
      setUserPosts(filtered);
    } catch {
      // ignore
    } finally {
      setIsLoadingPosts(false);
    }
  }, [userId, authUser?.id, isOwnProfile]);

  useEffect(() => {
    loadProfile();
    loadUserPosts();

    const unsubNewPost = FeedService.onNewPost((newPost) => {
      const targetUserId = userId || authUser?.id;
      if (newPost.authorId === targetUserId) {
        setUserPosts((prev) => {
          if (prev.some((p) => p.id === newPost.id)) return prev;
          return [newPost, ...prev];
        });
      }
    });

    const unsubLiked = FeedService.onPostLiked((data) => {
      setUserPosts((prev) =>
        prev.map((p) =>
          p.id === data.postId
            ? { ...p, likesCount: data.likesCount, isLikedByMe: data.userId === authUser?.id ? data.isLiked : p.isLikedByMe }
            : p
        )
      );
    });

    const unsubComment = FeedService.onNewComment((data) => {
      setUserPosts((prev) =>
        prev.map((p) =>
          p.id === data.postId
            ? { ...p, commentsCount: data.commentsCount, comments: [...(p.comments || []), data.comment] }
            : p
        )
      );
    });

    const unsubDeleted = FeedService.onPostDeleted((data) => {
      setUserPosts((prev) => prev.filter((p) => p.id !== data.postId));
    });

    return () => {
      unsubNewPost();
      unsubLiked();
      unsubComment();
      unsubDeleted();
    };
  }, [loadProfile, loadUserPosts, userId, authUser?.id]);

  // Handle Android hardware Back button
  useEffect(() => {
    if (!onBack) return;
    const backAction = () => {
      if (fullSizeImage) {
        setFullSizeImage(null);
        return true;
      }
      if (isCropperVisible) {
        setIsCropperVisible(false);
        return true;
      }
      if (isSettingsModalVisible) {
        setIsSettingsModalVisible(false);
        return true;
      }
      if (isMenuModalVisible) {
        setIsMenuModalVisible(false);
        return true;
      }
      if (isPeerMenuModalVisible) {
        setIsPeerMenuModalVisible(false);
        return true;
      }
      if (isEditModalVisible) {
        setIsEditModalVisible(false);
        return true;
      }
      onBack();
      return true;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [
    onBack,
    fullSizeImage,
    isCropperVisible,
    isSettingsModalVisible,
    isMenuModalVisible,
    isPeerMenuModalVisible,
    isEditModalVisible,
  ]);

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadProfile();
    loadUserPosts();
  }, [loadProfile, loadUserPosts]);

  const handlePickPostImage = async () => {
    const res = await ImagePickerService.pickImageFromDevice({
      allowsEditing: false, // allows any aspect ratio in custom cropper
      quality: 0.88,
    });
    if (res && !res.canceled && res.uri) {
      setCropperImageUri(res.uri);
      setIsCropperVisible(true);
    }
  };

  const handleCreateProfilePost = async () => {
    if (!newPostText.trim() && !newPostImage) {
      Alert.alert('Post Content Required', 'Please enter some text or attach an image.');
      return;
    }
    setIsPosting(true);
    try {
      const created = await FeedService.createPost({
        content: newPostText.trim(),
        imageUrl: newPostImage || undefined,
        gameTag: '🏆 Player Highlight',
      });
      setUserPosts((prev) => [created, ...prev]);
      setNewPostText('');
      setNewPostImage(null);
    } catch (err: any) {
      Alert.alert('Post Failed', err.message || 'Could not publish feed post.');
    } finally {
      setIsPosting(false);
    }
  };

  const handleToggleLike = async (postId: string) => {
    try {
      const updated = await FeedService.toggleLike(postId);
      setUserPosts((prev) =>
        prev.map((p) =>
          p.id === postId ? { ...p, likesCount: updated.likesCount, isLikedByMe: updated.isLiked } : p
        )
      );
    } catch {}
  };

  const handleDeletePost = (postId: string) => {
    Alert.alert('Delete Post', 'Are you sure you want to remove this post?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await FeedService.deletePost(postId);
            setUserPosts((prev) => prev.filter((p) => p.id !== postId));
          } catch {}
        },
      },
    ]);
  };

  const handleProfileUpdated = (updated: UserProfile) => {
    setProfile(updated);
    if (isOwnProfile) {
      updateUser({
        displayName: updated.displayName,
        bio: updated.bio,
        avatarUrl: updated.avatarUrl,
      });
    }
  };

  const handlePickBanner = async () => {
    const res = await ImagePickerService.pickImageFromDevice({
      aspect: [16, 9],
      quality: 0.5,
    });
    if (res && !res.canceled && res.uri) {
      try {
        const updated = await ProfileService.updateMyProfile({ bannerUrl: res.uri });
        handleProfileUpdated(updated);
      } catch (err) {
        console.warn('Could not update banner:', err);
      }
    }
  };

  const formatJoinDate = (dateString?: string) => {
    if (!dateString) return 'Joined Recently';
    try {
      const date = new Date(dateString);
      return `Joined ${date.toLocaleString('en-US', { month: 'short', year: 'numeric' })}`;
    } catch {
      return 'Joined 2026';
    }
  };

  const handleSendFriendRequest = async () => {
    if (!profile) return;
    try {
      await FriendsService.sendRequest(profile.id);
      setProfile((prev) => (prev ? { ...prev, relationship: 'REQUEST_SENT' } : null));
      Alert.alert('Request Sent', `Friend request sent to ${profile.displayName}!`);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not send friend request');
    }
  };

  const handleAcceptFriendRequest = async () => {
    if (!profile) return;
    try {
      const requests = await FriendsService.fetchRequests();
      const match = requests.incoming.find((r) => r.user.id === profile.id);
      if (match) {
        await FriendsService.acceptRequest(match.requestId);
        setProfile((prev) => (prev ? { ...prev, relationship: 'FRIENDS' } : null));
        Alert.alert('Friend Added', `You and ${profile.displayName} are now friends!`);
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not accept friend request');
    }
  };

  const handleRemoveFriend = () => {
    if (!profile) return;
    Alert.alert(
      'Remove Friend',
      `Are you sure you want to remove ${profile.displayName} (@${profile.username}) from your friends?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unfriend',
          style: 'destructive',
          onPress: async () => {
            try {
              await FriendsService.removeFriend(profile.id);
              setProfile((prev) => (prev ? { ...prev, relationship: 'NONE' } : null));
              Alert.alert('Friend Removed', `${profile.displayName} has been removed from your friends.`);
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Could not remove friend');
            }
          },
        },
      ]
    );
  };

  if (isLoading && !profile) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
        <StatusBar barStyle={theme.mode === 'dark' ? 'light-content' : 'dark-content'} />
        <View style={[styles.navBar, { borderBottomColor: theme.colors.border }]}>
          {onBack ? (
            <TouchableOpacity
              onPress={onBack}
              style={[styles.navIconButton, { backgroundColor: theme.colors.surfaceElevated }]}
              activeOpacity={0.7}
              accessibilityLabel="Back"
            >
              <Icon name="chevronLeft" size={20} color={theme.colors.textPrimary} />
            </TouchableOpacity>
          ) : (
            <View style={styles.navIconButtonPlaceholder} />
          )}
          <Text style={[styles.navTitle, { color: theme.colors.textPrimary }]}>
            Loading Profile...
          </Text>
          <View style={styles.navIconButtonPlaceholder} />
        </View>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
            Loading Player Profile...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (errorMsg && !profile) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
        <StatusBar barStyle={theme.mode === 'dark' ? 'light-content' : 'dark-content'} />
        <View style={[styles.navBar, { borderBottomColor: theme.colors.border }]}>
          {onBack ? (
            <TouchableOpacity
              onPress={onBack}
              style={[styles.navIconButton, { backgroundColor: theme.colors.surfaceElevated }]}
              activeOpacity={0.7}
              accessibilityLabel="Back"
            >
              <Icon name="chevronLeft" size={20} color={theme.colors.textPrimary} />
            </TouchableOpacity>
          ) : (
            <View style={styles.navIconButtonPlaceholder} />
          )}
          <Text style={[styles.navTitle, { color: theme.colors.textPrimary }]}>
            Profile
          </Text>
          <View style={styles.navIconButtonPlaceholder} />
        </View>
        <View style={styles.centerContainer}>
          <Icon name="close" size={48} color={theme.colors.error} />
          <Text style={[styles.errorTitle, { color: theme.colors.textPrimary }]}>
            Unable to Load Profile
          </Text>
          <Text style={[styles.errorSubtitle, { color: theme.colors.textSecondary }]}>
            {errorMsg}
          </Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: theme.colors.primary }]}
            onPress={loadProfile}
          >
            <Text style={[styles.retryButtonText, { color: theme.colors.background }]}>
              Try Again
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const relationship: RelationshipState = profile?.relationship || 'NONE';

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle={theme.mode === 'dark' ? 'light-content' : 'dark-content'} />

      {/* Top Navigation Bar */}
      <View style={[styles.navBar, { borderBottomColor: theme.colors.border }]}>
        {onBack ? (
          <TouchableOpacity
            onPress={onBack}
            style={[styles.navIconButton, { backgroundColor: theme.colors.surfaceElevated }]}
            activeOpacity={0.7}
            accessibilityLabel="Back"
          >
            <Icon name="chevronLeft" size={20} color={theme.colors.textPrimary} />
          </TouchableOpacity>
        ) : (
          <View style={styles.navIconButtonPlaceholder} />
        )}

        <Text style={[styles.navTitle, { color: theme.colors.textPrimary }]}>
          {isOwnProfile ? 'My Profile' : profile?.displayName}
        </Text>

        {isOwnProfile ? (
          <TouchableOpacity
            onPress={() => setIsMenuModalVisible(true)}
            style={styles.navMenuButton}
            activeOpacity={0.7}
            accessibilityLabel="Profile Menu"
          >
            <Icon name="menu" size={26} strokeWidth={2.4} color={theme.colors.textPrimary} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={() => setIsPeerMenuModalVisible(true)}
            style={styles.navMenuButton}
            activeOpacity={0.7}
            accessibilityLabel="Player Options"
          >
            <Icon name="menu" size={24} strokeWidth={2.2} color={theme.colors.textPrimary} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
          />
        }
      >
        {/* Layered Profile Banner / Hero - Edge to Edge */}
        <View style={[styles.heroSection, { borderBottomColor: theme.colors.divider }]}>
          {profile?.bannerUrl ? (
            <TouchableOpacity
              style={styles.heroBannerImageWrap}
              activeOpacity={0.9}
              onPress={() => setFullSizeImage(profile.bannerUrl || null)}
            >
              <Image
                source={{ uri: profile.bannerUrl }}
                style={styles.heroBannerImage}
                resizeMode="cover"
              />
              <LinearGradient
                colors={['rgba(0,0,0,0.05)', 'rgba(0,0,0,0.55)']}
                style={StyleSheet.absoluteFill}
              />
            </TouchableOpacity>
          ) : (
            <View
              style={[
                styles.heroBackgroundGlow,
                { backgroundColor: theme.colors.primary + '18' },
              ]}
            />
          )}

          {isOwnProfile && (
            <TouchableOpacity
              onPress={handlePickBanner}
              style={styles.bannerEditBtn}
              activeOpacity={0.8}
              accessibilityLabel="Change Cover"
            >
              <Icon name="camera" size={26} color="#FFFFFF" />
            </TouchableOpacity>
          )}

          {/* Header Row: Left Text Information & Right Round Avatar */}
          <View style={styles.profileHeaderRow}>
            {/* Left: Player Names, Member Since, Bio */}
            <View style={styles.identityContainer}>
              <Text style={[styles.displayName, { color: theme.colors.textPrimary }]}>
                {profile?.displayName}
              </Text>
              <Text style={[styles.usernameText, { color: theme.colors.primary }]}>
                @{profile?.username}
              </Text>

              {/* Member Since Text (No box, aligned left) */}
              <View style={styles.memberBadge}>
                <Icon name="calendar" size={13} color={theme.colors.textMuted} />
                <Text style={[styles.memberBadgeText, { color: theme.colors.textSecondary }]}>
                  {formatJoinDate(profile?.createdAt)}
                </Text>
              </View>

              {/* Bio Quote (Flat, aligned left) */}
              {profile?.bio ? (
                <View style={styles.bioBox}>
                  <Text style={[styles.bioText, { color: theme.colors.textSecondary }]}>
                    "{profile.bio}"
                  </Text>
                </View>
              ) : isOwnProfile ? (
                <TouchableOpacity
                  onPress={() => setIsEditModalVisible(true)}
                  style={styles.addBioPlaceholder}
                  activeOpacity={0.7}
                >
                  <Icon name="plus" size={14} color={theme.colors.primary} />
                  <Text style={[styles.addBioText, { color: theme.colors.primary }]}>
                    Tap to add your player bio & playstyle
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>

            {/* Right: Round Profile Photo with Presence & Edit capability */}
            <TouchableOpacity
              style={styles.avatarContainer}
              onPress={() => {
                if (profile?.avatarUrl) {
                  setFullSizeImage(profile.avatarUrl);
                } else if (isOwnProfile) {
                  setIsEditModalVisible(true);
                }
              }}
              activeOpacity={0.8}
            >
              <View
                style={[
                  styles.avatarGlowRing,
                  { borderColor: theme.colors.primary },
                ]}
              >
                <Avatar
                  displayName={profile?.displayName || 'Player'}
                  avatarUrl={profile?.avatarUrl}
                  size="xl"
                  status={profile?.isOnline ? 'online' : 'offline'}
                />
              </View>
              {isOwnProfile && (
                <View style={[styles.avatarEditBadge, { backgroundColor: theme.colors.primary }]}>
                  <Icon name="edit" size={12} color={theme.colors.background} />
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Peer Action Buttons Bar (Only visible when viewing another user's profile) */}
        {!isOwnProfile && (
          <View style={[styles.actionBar, { borderBottomColor: theme.colors.divider }]}>
            <View style={styles.peerActionRow}>
              {/* Contextual Friendship Button */}
              {relationship === 'NONE' && (
                <TouchableOpacity
                  onPress={handleSendFriendRequest}
                  style={[styles.primaryActionBtn, { backgroundColor: theme.colors.primary }]}
                  activeOpacity={0.8}
                >
                  <Icon name="userPlus" size={18} color={theme.colors.background} />
                  <Text style={[styles.primaryActionBtnText, { color: theme.colors.background }]}>
                    Add Friend
                  </Text>
                </TouchableOpacity>
              )}

              {relationship === 'REQUEST_SENT' && (
                <View
                  style={[
                    styles.primaryActionBtn,
                    { backgroundColor: theme.colors.surfaceElevated, borderColor: theme.colors.border },
                  ]}
                >
                  <Icon name="check" size={18} color={theme.colors.textSecondary} />
                  <Text style={[styles.primaryActionBtnText, { color: theme.colors.textSecondary }]}>
                    Request Sent
                  </Text>
                </View>
              )}

              {relationship === 'REQUEST_RECEIVED' && (
                <TouchableOpacity
                  onPress={handleAcceptFriendRequest}
                  style={[styles.primaryActionBtn, { backgroundColor: theme.colors.accent }]}
                  activeOpacity={0.8}
                >
                  <Icon name="userCheck" size={18} color={theme.colors.background} />
                  <Text style={[styles.primaryActionBtnText, { color: theme.colors.background }]}>
                    Accept Request
                  </Text>
                </TouchableOpacity>
              )}

              {relationship === 'FRIENDS' && (
                <View
                  style={[
                    styles.friendsBadgeBtn,
                    { backgroundColor: theme.colors.primary + '18', borderColor: theme.colors.primary + '40' },
                  ]}
                >
                  <Icon name="userCheck" size={16} color={theme.colors.primary} />
                  <Text style={[styles.friendsBadgeBtnText, { color: theme.colors.primary }]}>
                    Friends ✓
                  </Text>
                </View>
              )}

              {/* Direct Message Button */}
              <TouchableOpacity
                onPress={() => onNavigateToChat?.(profile!.id, profile!.username)}
                style={[
                  styles.secondaryActionBtn,
                  { backgroundColor: theme.colors.surfaceElevated, borderColor: theme.colors.border },
                ]}
                activeOpacity={0.7}
              >
                <Icon name="chat" size={18} color={theme.colors.textPrimary} />
                <Text style={[styles.secondaryActionBtnText, { color: theme.colors.textPrimary }]}>
                  Message
                </Text>
              </TouchableOpacity>

              {/* Challenge Button */}
              <TouchableOpacity
                onPress={() => onChallenge?.(profile!.id, profile!.username)}
                style={[
                  styles.iconOnlyActionBtn,
                  { backgroundColor: theme.colors.surfaceElevated, borderColor: theme.colors.border },
                ]}
                activeOpacity={0.7}
                accessibilityLabel="Challenge to game"
              >
                <Icon name="gamepad" size={20} color={theme.colors.primary} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Profile Slide Segmented Switcher: Single Divider Line, No Box */}
        <View style={[styles.slideSwitcher, { borderBottomColor: theme.colors.divider }]}>
          <TouchableOpacity
            style={[
              styles.slideTab,
              activeSlide === 'posts' && [
                styles.activeSlideTab,
                { borderBottomColor: theme.colors.primary },
              ],
            ]}
            onPress={() => setActiveSlide('posts')}
            activeOpacity={0.8}
          >
            <Icon
              name="posts"
              size={18}
              color={activeSlide === 'posts' ? theme.colors.primary : theme.colors.textMuted}
            />
            <Text
              style={[
                styles.slideTabText,
                {
                  color: activeSlide === 'posts' ? theme.colors.primary : theme.colors.textSecondary,
                  fontWeight: activeSlide === 'posts' ? '700' : '500',
                },
              ]}
            >
              {isOwnProfile ? 'My Posts' : 'Posts'} ({userPosts.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.slideTab,
              activeSlide === 'stats' && [
                styles.activeSlideTab,
                { borderBottomColor: theme.colors.primary },
              ],
            ]}
            onPress={() => setActiveSlide('stats')}
            activeOpacity={0.8}
          >
            <Icon
              name="award"
              size={15}
              color={activeSlide === 'stats' ? theme.colors.primary : theme.colors.textMuted}
            />
            <Text
              style={[
                styles.slideTabText,
                {
                  color: activeSlide === 'stats' ? theme.colors.primary : theme.colors.textSecondary,
                  fontWeight: activeSlide === 'stats' ? '700' : '500',
                },
              ]}
            >
              {isOwnProfile ? 'My Stats' : 'Stats'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* SLIDE 1: POSTS */}
        {activeSlide === 'posts' && (
          <View style={styles.postsSlideContainer}>
            {/* Quick Composer for own profile - Flat layout with bottom divider */}
            {isOwnProfile && (
              <View style={[styles.profileComposerBox, { borderBottomColor: theme.colors.divider }]}>
                <TextInput
                  style={[
                    styles.profileComposerInput,
                    {
                      color: theme.colors.textPrimary,
                      backgroundColor: theme.colors.surfaceElevated,
                      borderColor: theme.colors.border,
                    },
                  ]}
                  placeholder="Share a game win, highlight, or photo..."
                  placeholderTextColor={theme.colors.textMuted}
                  value={newPostText}
                  onChangeText={setNewPostText}
                  multiline
                  maxLength={280}
                />

                {newPostImage && (
                  <View style={styles.composerImagePreviewWrap}>
                    <Image source={{ uri: newPostImage }} style={styles.composerImagePreview} resizeMode="cover" />
                    <TouchableOpacity
                      onPress={() => setNewPostImage(null)}
                      style={styles.composerRemoveImageBtn}
                      activeOpacity={0.7}
                    >
                      <Icon name="close" size={13} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                )}

                <View style={styles.profileComposerFooter}>
                  <TouchableOpacity
                    onPress={handlePickPostImage}
                    style={styles.composerAttachBtn}
                    activeOpacity={0.75}
                    accessibilityLabel="Attach Photo"
                  >
                    <Icon name="camera" size={26} color={theme.colors.primary} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handleCreateProfilePost}
                    disabled={isPosting}
                    style={[
                      styles.composerPostSubmitBtn,
                      { backgroundColor: theme.colors.primary, opacity: isPosting ? 0.6 : 1 },
                    ]}
                    activeOpacity={0.8}
                  >
                    {isPosting ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.composerPostSubmitText}>Publish Post</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Posts Stream */}
            {isLoadingPosts ? (
              <View style={styles.postsLoadingBox}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
                <Text style={[styles.postsLoadingText, { color: theme.colors.textMuted }]}>
                  Loading posts...
                </Text>
              </View>
            ) : userPosts.length === 0 ? (
              <View style={[styles.emptyPostsBox, { borderBottomColor: theme.colors.divider }]}>
                <Icon name="posts" size={44} color={theme.colors.textMuted} />
                <Text style={[styles.emptyPostsTitle, { color: theme.colors.textPrimary }]}>
                  No Posts Yet
                </Text>
                <Text style={[styles.emptyPostsSubtitle, { color: theme.colors.textSecondary }]}>
                  {isOwnProfile
                    ? 'Publish your first gaming post or photo above!'
                    : 'This player has not shared any posts yet.'}
                </Text>
              </View>
            ) : (
              <View style={styles.postsList}>
                {userPosts.map((post) => {
                  const isMyPost = isOwnProfile || (authUser?.id && post.authorId === authUser.id);
                  return (
                    <View
                      key={post.id}
                      style={[
                        styles.profilePostCard,
                        { borderBottomColor: theme.colors.divider },
                      ]}
                    >
                      <View style={styles.profilePostHeader}>
                        <View style={styles.profilePostAuthorRow}>
                          <Avatar
                            displayName={post.authorName}
                            avatarUrl={post.authorAvatar}
                            size="sm"
                            status="online"
                          />
                          <View style={{ marginLeft: 10 }}>
                            <Text style={[styles.profilePostAuthorName, { color: theme.colors.textPrimary }]}>
                              {post.authorName}
                            </Text>
                            <Text style={[styles.profilePostTime, { color: theme.colors.textMuted }]}>
                              {post.timeAgo}
                            </Text>
                          </View>
                        </View>

                        {isMyPost && (
                          <TouchableOpacity
                            onPress={() => handleDeletePost(post.id)}
                            style={styles.profilePostDeleteBtn}
                            activeOpacity={0.7}
                          >
                            <Icon name="close" size={14} color={theme.colors.textMuted} />
                          </TouchableOpacity>
                        )}
                      </View>

                      {post.content ? (
                        <Text style={[styles.profilePostText, { color: theme.colors.textPrimary }]}>
                          {post.content}
                        </Text>
                      ) : null}

                      {post.imageUrl ? (
                        <FeedPostImage uri={post.imageUrl} />
                      ) : null}

                      <View style={styles.profilePostFooter}>
                        <TouchableOpacity
                          onPress={() => handleToggleLike(post.id)}
                          style={styles.profilePostActionBtn}
                          activeOpacity={0.7}
                        >
                          <Icon
                            name="heart"
                            size={16}
                            color={post.isLikedByMe ? '#FF4757' : theme.colors.textMuted}
                          />
                          <Text
                            style={[
                              styles.profilePostActionText,
                              { color: post.isLikedByMe ? '#FF4757' : theme.colors.textSecondary },
                            ]}
                          >
                            {post.likesCount}
                          </Text>
                        </TouchableOpacity>

                        <View style={styles.profilePostActionBtn}>
                          <Icon name="chat" size={16} color={theme.colors.textMuted} />
                          <Text style={[styles.profilePostActionText, { color: theme.colors.textSecondary }]}>
                            {post.commentsCount}
                          </Text>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {/* SLIDE 2: GAMING STATS */}
        {activeSlide === 'stats' && (
          <View style={styles.statsSlideContainer}>
            {/* Overview Stats Row: Clean 4 Columns, Single Bottom Divider Line, No Boxes */}
            <View style={[styles.statsRowContainer, { borderBottomColor: theme.colors.divider }]}>
              <View style={styles.statColumn}>
                <View style={[styles.statIconBadge, { backgroundColor: theme.colors.primary + '18' }]}>
                  <Icon name="dice" size={18} color={theme.colors.primary} />
                </View>
                <Text style={[styles.statValue, { color: theme.colors.textPrimary }]}>
                  {profile?.stats?.totalMatches ?? 0}
                </Text>
                <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                  Matches
                </Text>
              </View>

              <View style={styles.statColumn}>
                <View style={[styles.statIconBadge, { backgroundColor: theme.colors.accent + '18' }]}>
                  <Icon name="target" size={18} color={theme.colors.accent} />
                </View>
                <Text style={[styles.statValue, { color: theme.colors.textPrimary }]}>
                  {profile?.stats?.winRate ?? 0}%
                </Text>
                <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                  Win Rate
                </Text>
              </View>

              <View style={styles.statColumn}>
                <View style={[styles.statIconBadge, { backgroundColor: '#F59E0B18' }]}>
                  <Icon name="trophy" size={22} />
                </View>
                <Text style={[styles.statValue, { color: theme.colors.textPrimary }]}>
                  {profile?.stats?.totalWins ?? 0}
                </Text>
                <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                  Wins
                </Text>
              </View>

              <View style={styles.statColumn}>
                <View style={[styles.statIconBadge, { backgroundColor: '#EF444418' }]}>
                  <Icon name="streak" size={22} />
                </View>
                <Text style={[styles.statValue, { color: theme.colors.textPrimary }]}>
                  {profile?.stats?.highestStreak ?? 0}
                </Text>
                <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                  Streak
                </Text>
              </View>
            </View>

            {/* Trophies & Achievements Showcase */}
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
                Trophies & Badges
              </Text>
              <Text style={[styles.sectionSubtitle, { color: theme.colors.textMuted }]}>
                {profile?.achievements?.length || 0} Unlocked
              </Text>
            </View>

            <View style={styles.achievementsList}>
              {profile?.achievements && profile.achievements.length > 0 ? (
                profile.achievements.map((ach) => (
                  <View
                    key={ach.id}
                    style={[
                      styles.achievementCard,
                      { borderBottomColor: theme.colors.divider },
                    ]}
                  >
                    <View style={[styles.achievementIconBox, { backgroundColor: theme.colors.primary + '20' }]}>
                      <Icon name="award" size={22} color={theme.colors.primary} />
                    </View>
                    <View style={styles.achievementMeta}>
                      <Text style={[styles.achievementTitle, { color: theme.colors.textPrimary }]}>
                        {ach.title}
                      </Text>
                      <Text style={[styles.achievementDesc, { color: theme.colors.textSecondary }]}>
                        {ach.description}
                      </Text>
                    </View>
                    <View style={[styles.unlockedBadge, { backgroundColor: theme.colors.accent + '15' }]}>
                      <Text style={[styles.unlockedBadgeText, { color: theme.colors.accent }]}>Unlocked</Text>
                    </View>
                  </View>
                ))
              ) : (
                <View style={[styles.emptyAchievementsCard, { borderBottomColor: theme.colors.divider }]}>
                  <View style={[styles.emptyIconCircle, { backgroundColor: theme.colors.surfaceElevated }]}>
                    <Icon name="trophy" size={32} />
                  </View>
                  <Text style={[styles.emptyTitle, { color: theme.colors.textPrimary }]}>
                    Trophy Cabinet
                  </Text>
                  <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
                    Compete in multiplayer matches to unlock custom badges, achievements, and ranking titles!
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Hamburger Menu Action Sheet Modal */}
      <Modal
        visible={isMenuModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsMenuModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.menuBackdrop}
          activeOpacity={1}
          onPress={() => setIsMenuModalVisible(false)}
        >
          <View
            style={[styles.menuContent, { backgroundColor: sheetBg, borderColor: sheetBorder }]}
            onStartShouldSetResponder={() => true}
          >
            {/* Grab Handle */}
            <View style={[styles.menuGrabBar, { backgroundColor: sheetGrabBar }]} />

            {/* Header with Title & Close button */}
            <View style={styles.menuHeaderRow}>
              <Text style={[styles.menuHeaderTitle, { color: sheetTitleColor }]}>
                Profile Options
              </Text>
              <TouchableOpacity
                onPress={() => setIsMenuModalVisible(false)}
                style={styles.menuCloseBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Icon name="close" size={20} color={sheetCloseColor} />
              </TouchableOpacity>
            </View>

            {/* Squircle Menu Rows (Only options NOT already inside Settings & Preferences) */}
            <View style={{ paddingTop: 4 }}>
              {/* 1. Edit Profile */}
              <TouchableOpacity
                style={[styles.menuItem, { borderBottomColor: sheetItemBorder }]}
                activeOpacity={0.65}
                onPress={() => {
                  setIsMenuModalVisible(false);
                  setIsEditModalVisible(true);
                }}
              >
                <View style={styles.menuSquircleIcon}>
                  <Icon name="edit" size={24} color={sheetIconColor} strokeWidth={2.2} />
                </View>
                <View style={styles.menuItemTextWrap}>
                  <Text style={[styles.menuItemTitle, { color: sheetItemTitle }]}>Edit Profile</Text>
                  <Text style={[styles.menuItemDesc, { color: sheetItemDesc }]}>Avatar, display name, and bio</Text>
                </View>
                <Icon name="chevronRight" size={16} color={sheetChevronColor} />
              </TouchableOpacity>

              {/* 2. Share Profile */}
              <TouchableOpacity
                style={[styles.menuItem, { borderBottomColor: sheetItemBorder }]}
                activeOpacity={0.65}
                onPress={() => {
                  setIsMenuModalVisible(false);
                  const profileUrl = `marvie.gg/@${profile?.username || authUser?.username || 'player'}`;
                  Share.share({
                    title: `${profile?.displayName || 'Player'}'s Profile`,
                    message: `Connect with me on Marvie Arena! marvie.gg/@${profile?.username || authUser?.username || 'player'}`,
                  }).catch(() => {
                    Alert.alert('Share Profile', `Share profile link: ${profileUrl}`);
                  });
                }}
              >
                <View style={styles.menuSquircleIcon}>
                  <Icon name="share" size={24} color={sheetIconColor} strokeWidth={2.2} />
                </View>
                <View style={styles.menuItemTextWrap}>
                  <Text style={[styles.menuItemTitle, { color: sheetItemTitle }]}>Share Profile</Text>
                  <Text style={[styles.menuItemDesc, { color: sheetItemDesc }]}>Share player invite link</Text>
                </View>
                <Icon name="chevronRight" size={16} color={sheetChevronColor} />
              </TouchableOpacity>

              {/* 3. Settings & Preferences */}
              <TouchableOpacity
                style={[styles.menuItem, { borderBottomWidth: 0 }]}
                activeOpacity={0.65}
                onPress={() => {
                  setIsMenuModalVisible(false);
                  setSettingsInitialPage('root');
                  setIsSettingsModalVisible(true);
                }}
              >
                <View style={styles.menuSquircleIcon}>
                  <Icon name="settings" size={24} color={sheetIconColor} strokeWidth={2.2} />
                </View>
                <View style={styles.menuItemTextWrap}>
                  <Text style={[styles.menuItemTitle, { color: sheetItemTitle }]}>Settings & Preferences</Text>
                  <Text style={[styles.menuItemDesc, { color: sheetItemDesc }]}>Themes, sound, privacy, and gaming controls</Text>
                </View>
                <Icon name="chevronRight" size={16} color={sheetChevronColor} />
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Edit Profile Modal */}
      {profile && (
        <EditProfileModal
          visible={isEditModalVisible}
          onClose={() => setIsEditModalVisible(false)}
          currentProfile={profile}
          onProfileUpdated={handleProfileUpdated}
        />
      )}

      {/* Dedicated Settings Modal */}
      <SettingsModal
        visible={isSettingsModalVisible}
        onClose={() => setIsSettingsModalVisible(false)}
        initialPage={settingsInitialPage}
        onNavigateToChat={onNavigateToChat}
      />

      {/* Peer Profile Actions Modal (Unfriend, Report, Challenge, Message) */}
      <Modal
        visible={isPeerMenuModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsPeerMenuModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.menuBackdrop}
          activeOpacity={1}
          onPress={() => setIsPeerMenuModalVisible(false)}
        >
          <View
            style={[styles.menuContent, { backgroundColor: sheetBg, borderColor: sheetBorder }]}
            onStartShouldSetResponder={() => true}
          >
            <View style={[styles.menuGrabBar, { backgroundColor: sheetGrabBar }]} />

            <View style={styles.menuHeaderRow}>
              <Text style={[styles.menuHeaderTitle, { color: sheetTitleColor }]}>
                Player Options
              </Text>
              <TouchableOpacity
                onPress={() => setIsPeerMenuModalVisible(false)}
                style={styles.menuCloseBtn}
              >
                <Icon name="close" size={20} color={sheetCloseColor} />
              </TouchableOpacity>
            </View>

            {/* Peer Card */}
            <View style={[styles.menuProfileCard, {
              backgroundColor: isDark ? 'rgba(235, 115, 34, 0.12)' : 'rgba(235, 115, 34, 0.08)',
              borderColor: isDark ? 'rgba(235, 115, 34, 0.32)' : 'rgba(235, 115, 34, 0.22)'
            }]}>
              <Avatar
                displayName={profile?.displayName || 'Player'}
                avatarUrl={profile?.avatarUrl}
                size="md"
              />
              <View style={[styles.menuProfileMeta, { marginLeft: 12 }]}>
                <Text style={[styles.menuProfileDisplayName, { color: sheetTitleColor }]} numberOfLines={1}>
                  {profile?.displayName || 'Player'}
                </Text>
                <Text style={styles.menuProfileUsername} numberOfLines={1}>
                  @{profile?.username || 'player'}
                </Text>
              </View>
            </View>

            {onChallenge && (
              <TouchableOpacity
                style={[styles.menuItem, { borderBottomColor: sheetItemBorder }]}
                activeOpacity={0.65}
                onPress={() => {
                  setIsPeerMenuModalVisible(false);
                  onChallenge(userId!, profile?.username || 'Player');
                }}
              >
                <View style={styles.menuSquircleIcon}>
                  <Icon name="gamepad" size={24} color={sheetIconColor} strokeWidth={2.2} />
                </View>
                <View style={styles.menuItemTextWrap}>
                  <Text style={[styles.menuItemTitle, { color: sheetItemTitle }]}>Challenge to Game</Text>
                  <Text style={[styles.menuItemDesc, { color: sheetItemDesc }]}>Invite to 1-on-1 multiplayer battle</Text>
                </View>
                <Icon name="chevronRight" size={16} color={sheetChevronColor} />
              </TouchableOpacity>
            )}

            {onNavigateToChat && (
              <TouchableOpacity
                style={[styles.menuItem, { borderBottomColor: sheetItemBorder }]}
                activeOpacity={0.65}
                onPress={() => {
                  setIsPeerMenuModalVisible(false);
                  onNavigateToChat(userId!, profile?.username || 'Player');
                }}
              >
                <View style={styles.menuSquircleIcon}>
                  <Icon name="chat" size={24} color={sheetIconColor} strokeWidth={2.2} />
                </View>
                <View style={styles.menuItemTextWrap}>
                  <Text style={[styles.menuItemTitle, { color: sheetItemTitle }]}>Send Message</Text>
                  <Text style={[styles.menuItemDesc, { color: sheetItemDesc }]}>Open chat conversation</Text>
                </View>
                <Icon name="chevronRight" size={16} color={sheetChevronColor} />
              </TouchableOpacity>
            )}

            {relationship === 'FRIENDS' && (
              <TouchableOpacity
                style={[styles.menuItem, { borderBottomColor: sheetItemBorder }]}
                activeOpacity={0.65}
                onPress={() => {
                  setIsPeerMenuModalVisible(false);
                  handleRemoveFriend();
                }}
              >
                <View style={styles.menuSquircleIcon}>
                  <Icon name="userX" size={24} color="#EF4444" strokeWidth={2.2} />
                </View>
                <View style={styles.menuItemTextWrap}>
                  <Text style={[styles.menuItemTitle, { color: '#EF4444' }]}>
                    Unfriend @{profile?.username}
                  </Text>
                  <Text style={[styles.menuItemDesc, { color: sheetItemDesc }]}>Remove from friends list</Text>
                </View>
                <Icon name="chevronRight" size={16} color={sheetChevronColor} />
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.menuItem, { borderBottomWidth: 0 }]}
              activeOpacity={0.65}
              onPress={() => {
                setIsPeerMenuModalVisible(false);
                Alert.alert('Report Player', 'Thank you for reporting. Our moderation team will review this user.');
              }}
            >
              <View style={styles.menuSquircleIcon}>
                <Icon name="shield" size={24} color="#EF4444" strokeWidth={2.2} />
              </View>
              <View style={styles.menuItemTextWrap}>
                <Text style={[styles.menuItemTitle, { color: sheetItemTitle }]}>Report Player</Text>
                <Text style={[styles.menuItemDesc, { color: sheetItemDesc }]}>Flag inappropriate behavior</Text>
              </View>
              <Icon name="chevronRight" size={16} color={sheetChevronColor} />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Full Size Image Viewer Modal */}
      <Modal
        visible={!!fullSizeImage}
        transparent
        animationType="fade"
        onRequestClose={() => setFullSizeImage(null)}
      >
        <View style={styles.fullScreenBackdrop}>
          <TouchableOpacity
            style={styles.fullScreenCloseBtn}
            onPress={() => setFullSizeImage(null)}
            activeOpacity={0.8}
            accessibilityLabel="Close full screen photo"
          >
            <Icon name="close" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          {fullSizeImage && (
            <Image
              source={{ uri: fullSizeImage }}
              style={styles.fullScreenImage}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>

      {/* Image Cropper Modal with all aspect ratios */}
      <ImageCropperModal
        visible={isCropperVisible}
        imageUri={cropperImageUri}
        onClose={() => setIsCropperVisible(false)}
        onCropDone={(resultUri) => {
          setNewPostImage(resultUri);
          setIsCropperVisible(false);
        }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 14,
    fontSize: 15,
    fontWeight: '500',
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 12,
  },
  errorSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 20,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryButtonText: {
    fontSize: 15,
    fontWeight: '700',
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  navIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navMenuButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navIconButtonPlaceholder: {
    width: 40,
    height: 40,
  },
  navTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  scrollContent: {
    paddingBottom: 60,
  },
  heroSection: {
    paddingTop: 0,
    paddingBottom: 20,
    position: 'relative',
    borderBottomWidth: 1,
  },
  heroBackgroundGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 160,
    borderRadius: 0,
    borderWidth: 0,
  },
  heroBannerImageWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 160,
    borderRadius: 0,
    overflow: 'hidden',
  },
  heroBannerImage: {
    width: '100%',
    height: '100%',
  },
  bannerEditBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    padding: 6,
    zIndex: 10,
  },
  profileHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    width: '100%',
    paddingHorizontal: 20,
    marginTop: 110,
    zIndex: 5,
  },
  avatarContainer: {
    marginTop: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 6,
    position: 'relative',
  },
  avatarGlowRing: {
    padding: 0,
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 3,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    zIndex: 10,
  },
  identityContainer: {
    flex: 1,
    alignItems: 'flex-start',
    paddingRight: 16,
    paddingTop: 52,
  },
  displayName: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.4,
    textAlign: 'left',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  usernameText: {
    fontSize: 15,
    fontWeight: '600',
    marginTop: 2,
    marginBottom: 8,
    textAlign: 'left',
  },
  memberBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
    alignSelf: 'flex-start',
  },
  memberBadgeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  bioBox: {
    width: '100%',
    marginTop: 2,
  },
  bioText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'left',
    fontStyle: 'italic',
  },
  addBioPlaceholder: {
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
  },
  addBioText: {
    fontSize: 13,
    fontWeight: '600',
  },
  actionBar: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  ownActionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  peerActionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  primaryActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 14,
    gap: 8,
    borderWidth: 0,
  },
  primaryActionBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    paddingHorizontal: 18,
    borderRadius: 14,
    borderWidth: 0,
    gap: 8,
  },
  secondaryActionBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
  iconOnlyActionBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    borderWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 12,
    marginTop: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  sectionSubtitle: {
    fontSize: 13,
    fontWeight: '500',
  },
  statsRowContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
  },
  statColumn: {
    alignItems: 'center',
    flex: 1,
  },
  statIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  achievementsList: {
    paddingHorizontal: 0,
  },
  achievementCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    gap: 12,
  },
  achievementIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  achievementMeta: {
    flex: 1,
  },
  achievementTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  achievementDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  emptyAchievementsCard: {
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  emptyIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 6,
  },
  unlockedBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 0,
  },
  unlockedBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  // Slide Switcher Tabs: Clean divider bar, no box
  slideSwitcher: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingHorizontal: 16,
  },
  slideTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  activeSlideTab: {
    borderBottomWidth: 2,
    marginBottom: -1,
  },
  slideTabText: {
    fontSize: 13,
  },
  postsSlideContainer: {
    paddingHorizontal: 0,
  },
  statsSlideContainer: {
    paddingTop: 0,
  },
  // Quick Composer on Profile: Flat, bottom divider
  profileComposerBox: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  profileComposerInput: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 13,
    minHeight: 52,
  },
  composerImagePreviewWrap: {
    marginTop: 10,
    borderRadius: 12,
    overflow: 'hidden',
    height: 140,
    position: 'relative',
  },
  composerImagePreview: {
    width: '100%',
    height: '100%',
  },
  composerRemoveImageBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.65)',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileComposerFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  composerAttachBtn: {
    padding: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  composerPostSubmitBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  composerPostSubmitText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  postsLoadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 24,
  },
  postsLoadingText: {
    fontSize: 13,
  },
  emptyPostsBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    gap: 8,
  },
  emptyPostsTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 4,
  },
  emptyPostsSubtitle: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  postsList: {
    gap: 0,
  },
  profilePostCard: {
    borderBottomWidth: 1,
    paddingVertical: 14,
  },
  profilePostHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  profilePostAuthorRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profilePostAuthorName: {
    fontSize: 13,
    fontWeight: '700',
  },
  profilePostTime: {
    fontSize: 11,
    marginTop: 1,
  },
  profilePostDeleteBtn: {
    padding: 6,
  },
  profilePostText: {
    fontSize: 13,
    lineHeight: 19,
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  profilePostFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
    paddingHorizontal: 20,
    marginTop: 6,
  },
  profilePostActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  profilePostActionText: {
    fontSize: 12,
    fontWeight: '700',
  },
  // Hamburger Menu Modal Sheet Styles
  menuBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    justifyContent: 'flex-end',
  },
  menuContent: {
    backgroundColor: '#10141D',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 36,
  },
  menuGrabBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignSelf: 'center',
    marginBottom: 12,
  },
  menuHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    paddingBottom: 4,
  },
  menuHeaderTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  menuCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuProfileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(235, 115, 34, 0.12)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(235, 115, 34, 0.32)',
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
    position: 'relative',
    overflow: 'hidden',
  },
  menuWatermark: {
    position: 'absolute',
    right: 30,
    top: -4,
  },
  menuAvatarWrap: {
    position: 'relative',
    marginRight: 12,
  },
  menuOnlineDot: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#25D366',
    borderWidth: 2,
    borderColor: '#10141D',
  },
  menuProfileMeta: {
    flex: 1,
    paddingRight: 8,
  },
  menuProfileDisplayName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  menuProfileUsername: {
    fontSize: 12,
    color: '#D8893F',
    marginTop: 2,
    fontWeight: '500',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  menuSquircleIcon: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    backgroundColor: 'transparent',
  },
  menuItemTextWrap: {
    flex: 1,
    paddingRight: 10,
  },
  menuItemTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: -0.1,
  },
  menuItemDesc: {
    fontSize: 12,
    color: '#7E8B9B',
    marginTop: 2,
  },
  friendsBadgeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
  },
  friendsBadgeBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  fullScreenBackdrop: {
    flex: 1,
    backgroundColor: '#000000F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenCloseBtn: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullScreenImage: {
    width: '92%',
    height: '78%',
  },
});
