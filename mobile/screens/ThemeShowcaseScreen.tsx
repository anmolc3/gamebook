import React, { useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
} from 'react-native';
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
} from '../components';
import { Icon } from '../icons';

export interface ThemeShowcaseScreenProps {
  onPressProfile?: () => void;
  onPressFriends?: () => void;
  onPressChat?: () => void;
  onPressPlay?: (gameType?: string) => void;
  onPressLeaderboards?: () => void;
  onPressDiscovery?: () => void;
  onPressStory?: () => void;
}

export const ThemeShowcaseScreen: React.FC<ThemeShowcaseScreenProps> = ({
  onPressProfile,
  onPressFriends,
  onPressChat,
  onPressPlay,
  onPressLeaderboards,
  onPressDiscovery,
  onPressStory,
}) => {
  const { theme, themeId, effectiveMode } = useTheme();
  const themeGradients = getThemeGradients(themeId, effectiveMode);
  const { user } = useAuth();
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

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

      {/* Marvie Top App Header */}
      <AppHeader
        userName={user?.displayName || 'Player'}
        avatarUrl={user?.avatarUrl}
        greeting="Good Evening"
        onPressNotifications={() => showToast('Opening Notifications')}
        onPressSettings={() => setSettingsModalVisible(true)}
        onPressProfile={onPressProfile}
        onPressFriends={onPressFriends}
        onPressChat={onPressChat}
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
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

        {/* 24h Ephemeral Story Rail */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
              Active Stories
            </Text>
            <Text style={[styles.sectionSubtitle, { color: theme.colors.textSecondary }]}>
              24h Ephemeral
            </Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.storyRail}>
            <StoryAvatar
              name="Your Story"
              isAddStory
              onPress={() => showToast('Create new story')}
            />
            <StoryAvatar
              name="Elena"
              hasUnviewedStory
              onPress={() => showToast("Viewing Elena's story")}
            />
            <StoryAvatar
              name="Marcus"
              hasUnviewedStory
              onPress={() => showToast("Viewing Marcus's story")}
            />
            <StoryAvatar
              name="Sophie"
              hasUnviewedStory={false}
              onPress={() => showToast("Viewing Sophie's story")}
            />
            <StoryAvatar
              name="Devon"
              hasUnviewedStory={false}
              onPress={() => showToast("Viewing Devon's story")}
            />
          </ScrollView>
        </View>

        {/* Marvie Big Feature Card (Solid Gradient Matching Active Theme) */}
        <LinearGradient
          colors={themeGradients.hero}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.heroCard,
            {
              borderColor: themeGradients.heroBorder,
              overflow: 'hidden',
            },
            theme.shadows.card,
          ]}
        >
          <View style={styles.heroTopRow}>
            <View
              style={[
                styles.heroTag,
                { backgroundColor: theme.colors.cardTintMint },
              ]}
            >
              <Icon name="trophy" size={12} color={theme.colors.primary} />
              <Text style={[styles.heroTagText, { color: theme.colors.primary }]}>
                MULTIPLAYER ARENA • LIVE
              </Text>
            </View>
            <View
              style={[
                styles.livePulseDot,
                { backgroundColor: theme.colors.online },
              ]}
            />
          </View>

          <Text style={[styles.heroHeading, { color: theme.colors.textPrimary }]}>
            Play, Compete & Conquer
          </Text>
          <Text style={[styles.heroSubheading, { color: theme.colors.textSecondary }]}>
            Server-authoritative matches, instant rematches, and live friend challenges.
          </Text>

          <View style={styles.heroActionRow}>
            <TouchableOpacity
              onPress={() => (onPressPlay ? onPressPlay() : showToast('Public Matchmaking'))}
              style={[
                styles.heroPrimaryBtn,
                { backgroundColor: theme.colors.primary },
                theme.shadows.soft,
              ]}
              activeOpacity={0.82}
            >
              <Icon name="play" size={18} color={theme.colors.textOnPrimary} strokeWidth={2.4} />
              <Text style={[styles.heroPrimaryBtnText, { color: theme.colors.textOnPrimary }]}>
                Quick Match
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => (onPressDiscovery ? onPressDiscovery() : showToast('All Games'))}
              style={[
                styles.heroSecondaryBtnWithText,
                {
                  backgroundColor: theme.colors.surfaceElevated,
                  borderColor: theme.colors.border,
                },
              ]}
              activeOpacity={0.75}
            >
              <Icon name="gamepad" size={18} color={theme.colors.textPrimary} />
              <Text style={[styles.heroSecondaryBtnText, { color: theme.colors.textPrimary }]}>
                71+ Games
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => (onPressLeaderboards ? onPressLeaderboards() : showToast('Leaderboards'))}
              style={[
                styles.heroSecondaryBtn,
                {
                  backgroundColor: theme.colors.surfaceElevated,
                  borderColor: theme.colors.border,
                },
              ]}
              activeOpacity={0.7}
              accessibilityLabel="Leaderboards"
            >
              <Icon name="trophy" size={18} color="#FFD700" />
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* Marvie Statistics Cards Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
              Player Performance
            </Text>
            <Text style={[styles.sectionSubtitle, { color: theme.colors.textSecondary }]}>
              Ranked Stats
            </Text>
          </View>

          <View style={styles.statsRow}>
            <StatCard
              label="Matches"
              value="128"
              icon="gamepad"
              accentColor={theme.colors.accentMint}
              trendText="Active"
            />
            <View style={{ width: 10 }} />
            <StatCard
              label="Win Rate"
              value="68%"
              icon="target"
              accentColor={theme.colors.accentAmber}
              trendText="Top 15%"
            />
            <View style={{ width: 10 }} />
            <StatCard
              label="Trophies"
              value="42"
              icon="trophy"
              accentColor={theme.colors.accentCoral}
              trendText="+3 Today"
            />
          </View>
        </View>        {/* Featured Multiplayer Games — 8 curated picks */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
              Featured Arenas
            </Text>
            <TouchableOpacity onPress={onPressDiscovery} activeOpacity={0.7}>
              <Text style={[styles.sectionSubtitle, { color: theme.colors.primary }]}>
                All 71+ Games
              </Text>
            </TouchableOpacity>
          </View>

          {/* 1 — Board */}
          <GameCard
            title="Ludo World Arena"
            subtitle="Classic 2–4 player board game with server-authoritative dice and tactical token navigation."
            gameType="LUDO"
            icon="dice"
            playerCountText="2 - 4 Players"
            onlineCount={1420}
            accentColor={theme.colors.accentAmber}
            badgeText="POPULAR"
            onPressPlay={() => (onPressPlay ? onPressPlay('LUDO') : showToast('Matchmaking Ludo Arena...'))}
          />

          {/* 2 — Strategy */}
          <GameCard
            title="Chess Grandmaster"
            subtitle="Official 8×8 FIDE rules, server-validated legal moves, check/checkmate detection, and clock."
            gameType="CHESS"
            icon="trophy"
            playerCountText="2 Players"
            onlineCount={1120}
            accentColor="#0062FF"
            badgeText="STRATEGY"
            onPressPlay={() => (onPressPlay ? onPressPlay('CHESS') : showToast('Matchmaking Chess...'))}
          />

          {/* 3 — Casual / Arcade */}
          <GameCard
            title="8 Ball Pool Arena"
            subtitle="Server-validated cue ball impulse, solid & stripe designation, and 8-ball pocket rules."
            gameType="POOL_8_BALL"
            icon="target"
            playerCountText="2 Players"
            onlineCount={880}
            accentColor="#3ED598"
            badgeText="ARCADE"
            onPressPlay={() => (onPressPlay ? onPressPlay('POOL_8_BALL') : showToast('Matchmaking 8 Ball Pool...'))}
          />

          {/* 4 — Card */}
          <GameCard
            title="Color Match Clash"
            subtitle="108-card color and rank shedding with Skip, Reverse, Draw 2, and Wildcards."
            gameType="UNO_STYLE"
            icon="palette"
            playerCountText="2 - 4 Players"
            onlineCount={1680}
            accentColor="#EF4444"
            badgeText="CARD HIT"
            onPressPlay={() => (onPressPlay ? onPressPlay('UNO_STYLE') : showToast('Matchmaking Color Match...'))}
          />

          {/* 5 — Puzzle / Word */}
          <GameCard
            title="Wordle Duel"
            subtitle="5-letter secret word deduction with live letter status feedback and simultaneous turns."
            gameType="WORDLE_DUEL"
            icon="award"
            playerCountText="2 Players"
            onlineCount={1450}
            accentColor="#22C55E"
            badgeText="WORD HIT"
            onPressPlay={() => (onPressPlay ? onPressPlay('WORDLE_DUEL') : showToast('Matchmaking Wordle Duel...'))}
          />

          {/* 6 — Trivia */}
          <GameCard
            title="Quiz Battle Arena"
            subtitle="Rapid-fire trivia showdown across history, astronomy, science, and pop culture."
            gameType="QUIZ_BATTLE"
            icon="bell"
            playerCountText="2 - 6 Players"
            onlineCount={1150}
            accentColor="#6366F1"
            badgeText="TRIVIA"
            onPressPlay={() => (onPressPlay ? onPressPlay('QUIZ_BATTLE') : showToast('Matchmaking Quiz Battle...'))}
          />

          {/* 7 — Party */}
          <GameCard
            title="Would You Rather?"
            subtitle="Compelling A/B dilemmas with real-time voting and percentage consensus comparisons."
            gameType="WOULD_YOU_RATHER"
            icon="users"
            playerCountText="2 - 8 Players"
            onlineCount={1640}
            accentColor="#38BDF8"
            badgeText="PARTY"
            onPressPlay={() => (onPressPlay ? onPressPlay('WOULD_YOU_RATHER') : showToast('Matchmaking Would You Rather...'))}
          />

          {/* 8 — Social Deduction */}
          <GameCard
            title="Mafia / Werewolf"
            subtitle="Social deduction with Day discussion, public voting, and secret Night roles."
            gameType="MAFIA"
            icon="crown"
            playerCountText="5 - 10 Players"
            onlineCount={2100}
            accentColor="#7C3AED"
            badgeText="MYSTERY"
            onPressPlay={() => (onPressPlay ? onPressPlay('MAFIA') : showToast('Matchmaking Mafia...'))}
          />

          {/* See All CTA */}
          <TouchableOpacity
            onPress={() => (onPressDiscovery ? onPressDiscovery() : showToast('Opening Game Library...'))}
            activeOpacity={0.82}
            style={[
              styles.seeAllBtn,
              {
                borderColor: theme.colors.primary,
                backgroundColor: theme.colors.cardTintMint,
              },
            ]}
          >
            <Icon name="gamepad" size={18} color={theme.colors.primary} />
            <Text style={[styles.seeAllBtnText, { color: theme.colors.primary }]}>
              Browse All 71+ Multiplayer Games
            </Text>
            <Icon name="chevronRight" size={16} color={theme.colors.primary} strokeWidth={2.5} />
          </TouchableOpacity>
        </View>

        {/* Join Private Room Code Input */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
              Join With Room Code
            </Text>
            <Text style={[styles.sectionSubtitle, { color: theme.colors.textSecondary }]}>
              6-Letter Code
            </Text>
          </View>
          <LinearGradient
            colors={themeGradients.joinCode}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[
              styles.joinCodeCard,
              {
                borderColor: themeGradients.joinCodeBorder,
                borderRadius: theme.radius.card,
                overflow: 'hidden',
              },
              theme.shadows.card,
            ]}
          >
            <View style={styles.codeSearchRow}>
              <View style={{ flex: 1 }}>
                <InputField
                  placeholder="Enter 6-character room code..."
                  leftIcon="search"
                  value={searchQuery}
                  onChangeText={(text) => setSearchQuery(text.toUpperCase())}
                  autoCapitalize="characters"
                  maxLength={8}
                />
              </View>
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
                    styles.joinCodeBtn,
                    { backgroundColor: theme.colors.primary },
                    theme.shadows.soft,
                  ]}
                  activeOpacity={0.8}
                >
                  <Icon name="play" size={16} color={theme.colors.textOnPrimary} strokeWidth={2.4} />
                  <Text style={[styles.joinCodeBtnText, { color: theme.colors.textOnPrimary }]}>
                    Join
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </LinearGradient>
        </View>
      </ScrollView>

      {/* Dedicated Settings Modal Bottom Sheet */}
      <SettingsModal
        visible={settingsModalVisible}
        onClose={() => setSettingsModalVisible(false)}
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
    borderWidth: 1,
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
    borderWidth: 1,
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
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroSecondaryBtnWithText: {
    height: 48,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  heroSecondaryBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  joinCodeCard: {
    padding: 16,
    borderWidth: 1,
  },
  codeSearchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  joinCodeBtn: {
    height: 54,
    paddingHorizontal: 18,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  joinCodeBtnText: {
    fontSize: 14,
    fontWeight: '700',
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
    borderWidth: 1.5,
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
});
