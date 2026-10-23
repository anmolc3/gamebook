import React, { useState, useEffect, useCallback } from 'react';
import {
  ScrollView,
  View,
  Text,
  TextInput,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  RefreshControl,
  BackHandler,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, getThemeGradients } from '../theme';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../features/auth/AuthContext';
import {
  StoryAvatar,
  GameCard,
  StatCard,
  InputField,
  SettingsModal,
  NotificationsModal,
  CreateStoryModal,
  SocialFeedSection,
} from '../components';
import { NotificationIcon } from '../components/atoms/NotificationIcon';
import { StoryTrayItem } from '../components/organisms/StoryBar';
import { StoryService } from '../services/story.service';
import { GameService } from '../services/game.service';
import { Icon } from '../icons';
import { NotificationService, AppNotification } from '../services/notification.service';
import { MobileSocketService } from '../services/socket.service';

export interface ThemeShowcaseScreenProps {
  onPressProfile?: () => void;
  onPressFriends?: () => void;
  onPressChat?: () => void;
  onPressPlay?: (gameType?: string) => void;
  onPressLeaderboards?: () => void;
  onPressDiscovery?: () => void;
  onPressThemes?: () => void;
  onPressStoryTray?: (tray: StoryTrayItem) => void;
  onOpenConversation?: (peer: any) => void;
  onJoinGameRoom?: (roomCode: string) => void;
}

export const ThemeShowcaseScreen: React.FC<ThemeShowcaseScreenProps> = ({
  onPressProfile,
  onPressFriends,
  onPressChat,
  onPressPlay,
  onPressLeaderboards,
  onPressDiscovery,
  onPressThemes,
  onPressStoryTray,
  onOpenConversation,
  onJoinGameRoom,
}) => {
  const { theme, themeId, effectiveMode } = useTheme();
  const themeGradients = getThemeGradients(themeId, effectiveMode);
  const { user } = useAuth();
  const [notificationsModalVisible, setNotificationsModalVisible] = useState(false);
  const [unreadNotifCount, setUnreadNotifCount] = useState<number>(() => {
    return NotificationService.getCachedUnreadCountSync();
  });

  // Dynamic safe-area top offset respecting Android status-bar insets, cutouts, and notches
  const insets = useSafeAreaInsets();
  const statusBarHeight = Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) : 0;
  const safeTop = Math.max(insets.top, statusBarHeight);
  const safeTopOffset = safeTop + (Platform.OS === 'android' ? 8 : 6);
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [storyTrays, setStoryTrays] = useState<StoryTrayItem[]>(() => {
    return StoryService.getCachedStoryFeedSync() || [];
  });
  const [isCreateStoryVisible, setIsCreateStoryVisible] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadStoryFeed = useCallback(() => {
    StoryService.getStoryFeed()
      .then((trays) => {
        setStoryTrays(Array.isArray(trays) ? trays : []);
      })
      .catch((err) => {
        console.warn('[ThemeShowcaseScreen] Error loading real story feed:', err);
        setStoryTrays([]);
      })
      .finally(() => {
        setIsRefreshing(false);
      });
  }, []);

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadStoryFeed();
  }, [loadStoryFeed]);

  useEffect(() => {
    StoryService.getCachedStoryFeed()
      .then((cached) => {
        if (cached && Array.isArray(cached)) {
          setStoryTrays(cached);
        }
      })
      .catch(() => {});

    loadStoryFeed();

    // Listen for real-time new stories from friends
    const unsubStory = MobileSocketService.onStoryNew(() => {
      loadStoryFeed();
    });

    return () => {
      unsubStory?.();
    };
  }, [loadStoryFeed]);

  useEffect(() => {
    NotificationService.fetchUnreadCount()
      .then((count) => setUnreadNotifCount(count))
      .catch(() => {});

    const unsub = NotificationService.addUnreadCountListener((count) => {
      setUnreadNotifCount(count);
    });

    return unsub;
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // Dismiss open modals or clear search on Android hardware Back
  useEffect(() => {
    const handleHardwareBack = () => {
      if (isCreateStoryVisible) {
        setIsCreateStoryVisible(false);
        return true;
      }
      if (notificationsModalVisible) {
        setNotificationsModalVisible(false);
        return true;
      }
      if (searchQuery.trim().length > 0) {
        setSearchQuery('');
        return true;
      }
      return false;
    };

    const sub = BackHandler.addEventListener('hardwareBackPress', handleHardwareBack);
    return () => sub.remove();
  }, [isCreateStoryVisible, notificationsModalVisible, searchQuery]);

  // Separate user's own story tray from friends' stories
  const userTray = storyTrays.find((t) => t.isSelf || (user?.id && t.userId === user.id));
  const friendTrays = storyTrays.filter((t) => !t.isSelf && (!user?.id || t.userId !== user.id));

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar
        barStyle={effectiveMode === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={theme.colors.background}
      />

      {/* Top-Right Notification Icon with proper safe-area spacing (No top bar header) */}
      <TouchableOpacity
        onPress={() => {
          setUnreadNotifCount(0);
          setNotificationsModalVisible(true);
        }}
        activeOpacity={0.7}
        accessibilityLabel="Notifications"
        style={[styles.topRightNotificationBtn, { top: safeTopOffset }]}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <NotificationIcon
          size={30}
          hasUnread={unreadNotifCount > 0}
          unreadCount={unreadNotifCount}
        />
      </TouchableOpacity>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
          />
        }
      >
        {/* Toast Alert */}
        {toastMessage && (
          <View
            style={[
              styles.toast,
              {
                backgroundColor: theme.colors.surfaceElevated,
                borderColor: theme.colors.primary,
              },
              theme.shadows.card,
            ]}
          >
            <Icon name="check" size={16} color={theme.colors.primary} />
            <Text style={[styles.toastText, { color: theme.colors.textPrimary }]}>
              {toastMessage}
            </Text>
          </View>
        )}

        {/* Real User Stories Rail — Clean minimal presentation without fake profiles */}
        <View style={styles.storiesContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.storyRailContent}
          >
            {/* Authenticated User "Your Story" circle */}
            <StoryAvatar
              name="Your Story"
              avatarUrl={user?.avatarUrl || userTray?.avatarUrl}
              isAddStory
              hasUnviewedStory={userTray ? !userTray.allViewed : false}
              onPress={() => {
                if (userTray && userTray.stories.length > 0) {
                  if (onPressStoryTray) {
                    onPressStoryTray(userTray);
                  }
                } else {
                  setIsCreateStoryVisible(true);
                }
              }}
              onPressAdd={() => setIsCreateStoryVisible(true)}
            />

            {/* Real Friends' Active Stories */}
            {friendTrays.map((tray) => (
              <StoryAvatar
                key={tray.userId}
                name={tray.displayName || tray.username}
                avatarUrl={tray.avatarUrl}
                hasUnviewedStory={!tray.allViewed}
                onPress={() =>
                  onPressStoryTray
                    ? onPressStoryTray(tray)
                    : showToast(`Viewing ${tray.displayName}'s story`)
                }
              />
            ))}
          </ScrollView>
        </View>

        {/* Featured Multiplayer Games — Compact 2-Column Grid */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
              Featured Arenas
            </Text>
            <TouchableOpacity onPress={onPressDiscovery} activeOpacity={0.7}>
              <Text style={[styles.sectionSubtitle, { color: theme.colors.primary }]}>
                All 71+ Games →
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.gamesGrid}>
            <GameCard
              compact
              title="Ludo World"
              gameType="LUDO"
              icon="dice"
              playerCountText="2-4P"
              accentColor={theme.colors.accentAmber}
              badgeText="POPULAR"
              onPressPlay={() => (onPressPlay ? onPressPlay('LUDO') : showToast('Matchmaking Ludo Arena...'))}
            />

            <GameCard
              compact
              title="Chess Master"
              gameType="CHESS"
              icon="trophy"
              playerCountText="2P"
              accentColor="#0062FF"
              badgeText="STRATEGY"
              onPressPlay={() => (onPressPlay ? onPressPlay('CHESS') : showToast('Matchmaking Chess...'))}
            />

            <GameCard
              compact
              title="8 Ball Pool"
              gameType="POOL_8_BALL"
              icon="target"
              playerCountText="2P"
              accentColor="#3ED598"
              badgeText="ARCADE"
              onPressPlay={() => (onPressPlay ? onPressPlay('POOL_8_BALL') : showToast('Matchmaking 8 Ball Pool...'))}
            />

            <GameCard
              compact
              title="Color Match"
              gameType="UNO_STYLE"
              icon="palette"
              playerCountText="2-4P"
              accentColor="#EF4444"
              badgeText="CARDS"
              onPressPlay={() => (onPressPlay ? onPressPlay('UNO_STYLE') : showToast('Matchmaking Color Match...'))}
            />

            <GameCard
              compact
              title="Wordle Duel"
              gameType="WORDLE_DUEL"
              icon="award"
              playerCountText="2P"
              accentColor="#22C55E"
              badgeText="WORD"
              onPressPlay={() => (onPressPlay ? onPressPlay('WORDLE_DUEL') : showToast('Matchmaking Wordle Duel...'))}
            />

            <GameCard
              compact
              title="Quiz Battle"
              gameType="QUIZ_BATTLE"
              icon="bell"
              playerCountText="2-6P"
              accentColor="#6366F1"
              badgeText="TRIVIA"
              onPressPlay={() => (onPressPlay ? onPressPlay('QUIZ_BATTLE') : showToast('Matchmaking Quiz Battle...'))}
            />
          </View>
        </View>

        {/* Community & Friends Social Feed on Homepage */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Icon name="posts" size={20} color={theme.colors.primary} />
              <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
                Community & Social Feed
              </Text>
            </View>
          </View>

          <SocialFeedSection
            maxPosts={4}
            onViewProfile={onPressProfile}
            onChallengeUser={(targetId) => {
              if (onPressPlay) onPressPlay();
            }}
          />
        </View>

        {/* Join Private Room Code Input — Single Box at bottom */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
              Join With Room Code
            </Text>
          </View>
          <View
            style={[
              styles.singleJoinCodeBox,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
              },
              theme.shadows.card,
            ]}
          >
            <Icon name="search" size={20} color={theme.colors.textMuted} />
            <TextInput
              style={[
                styles.inlineCodeInput,
                { color: theme.colors.textPrimary },
              ]}
              placeholder="Enter 6-character room code..."
              placeholderTextColor={theme.colors.textMuted}
              value={searchQuery}
              onChangeText={(text) => setSearchQuery(text.toUpperCase())}
              autoCapitalize="characters"
              maxLength={8}
            />
            {searchQuery.trim().length >= 4 && (
              <TouchableOpacity
                onPress={() => {
                  if (onPressPlay) {
                    onPressPlay(searchQuery.trim().toUpperCase());
                  } else {
                    showToast(`Joining room ${searchQuery}...`);
                  }
                }}
                style={[
                  styles.inlineJoinBtn,
                  { backgroundColor: theme.colors.primary },
                  theme.shadows.soft,
                ]}
                activeOpacity={0.8}
              >
                <Icon name="play" size={14} color={theme.colors.textOnPrimary} strokeWidth={2.4} />
                <Text style={[styles.inlineJoinBtnText, { color: theme.colors.textOnPrimary }]}>
                  Join
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Notifications Modal Bottom Sheet */}
      <NotificationsModal
        visible={notificationsModalVisible}
        onClose={() => setNotificationsModalVisible(false)}
        onAcceptInvite={(gameType, roomCode) => {
          if (roomCode && onJoinGameRoom) {
            onJoinGameRoom(roomCode);
          } else if (onPressPlay) {
            onPressPlay(gameType);
          }
        }}
        onSelectNotification={(notif) => {
          if (notif.type === 'GAME_INVITE') {
            const roomCode = notif.data?.roomCode;
            if (roomCode && onJoinGameRoom) {
              onJoinGameRoom(roomCode);
              return;
            }
            if (onPressPlay) onPressPlay(notif.data?.gameType);
            return;
          }
          if (
            notif.type === 'MENTION' ||
            notif.type === 'CHAT_MESSAGE' ||
            notif.type === 'MISSED_CALL'
          ) {
            const data = notif.data || {};
            if (onOpenConversation && (data.senderId || data.callerId || data.conversationId)) {
              onOpenConversation({
                id: data.senderId || data.callerId || '',
                name: data.senderName || data.callerName || notif.title || 'Conversation',
                username: data.senderUsername || data.callerUsername || 'player',
                avatarUrl: data.senderAvatarUrl || null,
                conversationId: data.conversationId,
              });
              return;
            }
            if (onPressChat) {
              onPressChat();
            }
          } else if (notif.type === 'FRIEND_REQUEST' || notif.type === 'FRIEND_ACCEPTED') {
            if (onPressFriends) onPressFriends();
          }
        }}
      />

      {/* Add New Story Modal with Photos, Moods & Captions */}
      <CreateStoryModal
        visible={isCreateStoryVisible}
        onClose={() => setIsCreateStoryVisible(false)}
        onStoryCreated={() => {
          loadStoryFeed();
          showToast('Story published! 🎉');
        }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topRightNotificationBtn: {
    position: 'absolute',
    right: 16,
    zIndex: 99,
    padding: 6,
  },
  storiesContainer: {
    paddingTop: 8,
    paddingBottom: 6,
    marginBottom: 8,
  },
  storyRailContent: {
    paddingRight: 56,
    alignItems: 'center',
  },
  scroll: {
    paddingHorizontal: 16,
    paddingBottom: 60,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 0,
    marginTop: 8,
    marginBottom: 8,
    alignSelf: 'center',
  },
  toastText: {
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 8,
  },
  section: {
    marginTop: 18,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  sectionSubtitle: {
    fontSize: 12,
    fontWeight: '600',
  },
  storyRail: {
    flexDirection: 'row',
  },
  heroCard: {
    padding: 20,
    borderRadius: 25,
    borderWidth: 0,
    marginTop: 14,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  heroTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  heroTagText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  livePulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  heroHeading: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.4,
    marginBottom: 6,
  },
  heroSubheading: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 16,
  },
  heroActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  heroPrimaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 14,
    gap: 8,
  },
  heroPrimaryBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },
  heroSecondaryBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    borderWidth: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroSecondaryBtnWithText: {
    height: 48,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  heroSecondaryBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  singleJoinCodeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    minHeight: 56,
    gap: 12,
  },
  inlineCodeInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    paddingVertical: 6,
  },
  inlineJoinBtn: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  inlineJoinBtnText: {
    fontSize: 13,
    fontWeight: '800',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 0,
    marginTop: 4,
    marginBottom: 4,
  },
  seeAllBtnText: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
    flex: 1,
    textAlign: 'center',
  },
  gamesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
});
