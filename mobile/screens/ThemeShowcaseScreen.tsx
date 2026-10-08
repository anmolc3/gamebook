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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, getThemeGradients } from '../theme';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../features/auth/AuthContext';
import {
  AppHeader,
  StoryAvatar,
  GameCard,
  StatCard,
  InputField,
  SettingsModal,
  NotificationsModal,
  CreateStoryModal,
  SocialFeedSection,
} from '../components';
import { StoryTrayItem } from '../components/organisms/StoryBar';
import { StoryService } from '../services/story.service';
import { GameService } from '../services/game.service';
import { Icon } from '../icons';

export interface ThemeShowcaseScreenProps {
  onPressProfile?: () => void;
  onPressFriends?: () => void;
  onPressChat?: () => void;
  onPressPlay?: (gameType?: string) => void;
  onPressLeaderboards?: () => void;
  onPressDiscovery?: () => void;
  onPressThemes?: () => void;
  onPressStoryTray?: (tray: StoryTrayItem) => void;
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
}) => {
  const { theme, themeId, effectiveMode } = useTheme();
  const themeGradients = getThemeGradients(themeId, effectiveMode);
  const { user } = useAuth();
  const [notificationsModalVisible, setNotificationsModalVisible] = useState(false);
  const [hasUnreadNotifs, setHasUnreadNotifs] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [storyTrays, setStoryTrays] = useState<StoryTrayItem[]>([]);
  const [isCreateStoryVisible, setIsCreateStoryVisible] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadStoryFeed = useCallback(() => {
    StoryService.getStoryFeed()
      .then((trays) => {
        if (trays && Array.isArray(trays)) {
          setStoryTrays(trays);
        }
      })
      .catch(() => {})
      .finally(() => {
        setIsRefreshing(false);
      });
  }, []);

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadStoryFeed();
  }, [loadStoryFeed]);

  useEffect(() => {
    loadStoryFeed();
  }, [loadStoryFeed]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar
        barStyle={effectiveMode === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={theme.colors.background}
      />

      {/* Marvie Top App Header with Animated Notification Bell */}
      <AppHeader
        userName={user?.displayName || 'Player'}
        avatarUrl={user?.avatarUrl}
        hasUnreadNotifications={hasUnreadNotifs}
        onPressNotifications={() => {
          setHasUnreadNotifs(false);
          setNotificationsModalVisible(true);
        }}
        onPressProfile={onPressProfile}
      />

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

        {/* Real Active Stories Rail */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
              Active Stories
            </Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.storyRail}>
            <StoryAvatar
              name="Your Story"
              isAddStory
              onPress={() => setIsCreateStoryVisible(true)}
            />
            {storyTrays.map((tray) => (
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
        onAcceptInvite={(gameType) => {
          if (onPressPlay) onPressPlay(gameType);
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
  scroll: {
    paddingHorizontal: 16,
    paddingBottom: 96,
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
