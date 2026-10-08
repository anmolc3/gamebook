import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useTheme } from '../../theme';
import { Avatar } from '../../components/atoms/Avatar';
import {
  ChevronLeftIcon,
  TrophyIcon,
  FlameIcon,
  CrownIcon,
  ClockIcon,
  UsersIcon,
  TargetIcon,
} from '../../icons';
import { apiGet } from '../../services/api';

interface LeaderboardPlayer {
  rank: number;
  userId: string;
  username: string;
  displayName: string;
  avatarUrl?: string | null;
  matchesPlayed: number;
  matchesWon: number;
  winRate: number;
  highestStreak: number;
  isCurrentUser?: boolean;
}

interface MatchHistoryItem {
  id: string;
  gameType: string;
  gameName: string;
  isWinner: boolean;
  isDraw: boolean;
  durationSeconds: number;
  createdAt: string;
}

interface LeaderboardScreenProps {
  onBack: () => void;
  onPressAchievements: () => void;
  onRequestRematch?: (gameType: string) => void;
}

export const LeaderboardScreen: React.FC<LeaderboardScreenProps> = ({
  onBack,
  onPressAchievements,
  onRequestRematch,
}) => {
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState<'global' | 'friends' | 'history'>('global');
  const [loading, setLoading] = useState(true);
  const [leaderboard, setLeaderboard] = useState<LeaderboardPlayer[]>([]);
  const [history, setHistory] = useState<MatchHistoryItem[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      if (activeTab === 'global') {
        const res = await apiGet<{ leaderboard: LeaderboardPlayer[] }>('/games/leaderboard/global');
        setLeaderboard(res.leaderboard || []);
      } else if (activeTab === 'friends') {
        const res = await apiGet<{ leaderboard: LeaderboardPlayer[] }>('/games/TICTACTOE/leaderboard?scope=friends');
        setLeaderboard(res.leaderboard || []);
      } else if (activeTab === 'history') {
        const res = await apiGet<{ history: MatchHistoryItem[] }>('/games/history');
        setHistory(res.history || []);
      }
    } catch {
      // Mock fallback data for graceful offline display
      if (activeTab === 'global' || activeTab === 'friends') {
        setLeaderboard([
          { rank: 1, userId: '1', username: 'alex_champion', displayName: 'Alex Mercer', matchesPlayed: 42, matchesWon: 35, winRate: 83, highestStreak: 9 },
          { rank: 2, userId: '2', username: 'elena_queen', displayName: 'Elena Rostova', matchesPlayed: 38, matchesWon: 29, winRate: 76, highestStreak: 6 },
          { rank: 3, userId: '3', username: 'marcus_grand', displayName: 'Marcus Vance', matchesPlayed: 31, matchesWon: 22, winRate: 71, highestStreak: 5 },
          { rank: 4, userId: '4', username: 'sarah_gamer', displayName: 'Sarah Connor', matchesPlayed: 25, matchesWon: 17, winRate: 68, highestStreak: 4 },
          { rank: 5, userId: '5', username: 'you', displayName: 'You (Current User)', matchesPlayed: 20, matchesWon: 14, winRate: 70, highestStreak: 4, isCurrentUser: true },
        ]);
      } else {
        setHistory([
          { id: 'h1', gameType: 'CHESS', gameName: 'Chess Grandmaster', isWinner: true, isDraw: false, durationSeconds: 245, createdAt: new Date(Date.now() - 3600000).toISOString() },
          { id: 'h2', gameType: 'WORDLE_DUEL', gameName: 'Wordle Duel', isWinner: false, isDraw: false, durationSeconds: 120, createdAt: new Date(Date.now() - 7200000).toISOString() },
          { id: 'h3', gameType: 'LUDO', gameName: 'Ludo World Arena', isWinner: true, isDraw: false, durationSeconds: 580, createdAt: new Date(Date.now() - 86400000).toISOString() },
        ]);
      }
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  const onRefresh = async () => {
    setIsRefreshing(true);
    await fetchData(true);
  };

  const topThree = leaderboard.slice(0, 3);
  const remainingPlayers = leaderboard.slice(3);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Top Navigation Bar */}
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.7}>
          <ChevronLeftIcon size={22} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>
          Hall of Fame
        </Text>
        <TouchableOpacity
          onPress={onPressAchievements}
          style={[styles.badgeBtn, { backgroundColor: theme.colors.surfaceElevated }]}
          activeOpacity={0.7}
        >
          <TrophyIcon size={18} color="#FFD700" />
        </TouchableOpacity>
      </View>

      {/* Segmented Tab Controls */}
      <View style={[styles.tabBar, { backgroundColor: theme.colors.surface }]}>
        <TouchableOpacity
          onPress={() => setActiveTab('global')}
          style={[
            styles.tabItem,
            activeTab === 'global' && { backgroundColor: theme.colors.primary },
          ]}
        >
          <Text
            style={[
              styles.tabText,
              { color: activeTab === 'global' ? theme.colors.textOnPrimary : theme.colors.textSecondary },
            ]}
          >
            Global
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab('friends')}
          style={[
            styles.tabItem,
            activeTab === 'friends' && { backgroundColor: theme.colors.primary },
          ]}
        >
          <Text
            style={[
              styles.tabText,
              { color: activeTab === 'friends' ? theme.colors.textOnPrimary : theme.colors.textSecondary },
            ]}
          >
            Friends
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab('history')}
          style={[
            styles.tabItem,
            activeTab === 'history' && { backgroundColor: theme.colors.primary },
          ]}
        >
          <Text
            style={[
              styles.tabText,
              { color: activeTab === 'history' ? theme.colors.textOnPrimary : theme.colors.textSecondary },
            ]}
          >
            History
          </Text>
        </TouchableOpacity>
      </View>

      {/* Body Content */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : activeTab === 'history' ? (
        /* Match History Feed */
        <ScrollView
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
          {history.length === 0 ? (
            <View style={styles.emptyContainer}>
              <ClockIcon size={40} color={theme.colors.textSecondary} />
              <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                No matches recorded yet. Play a game to see your history!
              </Text>
            </View>
          ) : (
            history.map((m) => (
              <View
                key={m.id}
                style={[
                  styles.historyCard,
                  { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
                ]}
              >
                <View style={styles.historyLeft}>
                  <View
                    style={[
                      styles.outcomeTag,
                      {
                        backgroundColor: m.isWinner
                          ? 'rgba(62, 213, 152, 0.15)'
                          : 'rgba(255, 101, 132, 0.15)',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.outcomeText,
                        { color: m.isWinner ? '#3ED598' : '#FF6584' },
                      ]}
                    >
                      {m.isWinner ? 'VICTORY' : m.isDraw ? 'DRAW' : 'DEFEAT'}
                    </Text>
                  </View>
                  <Text style={[styles.gameName, { color: theme.colors.textPrimary }]}>
                    {m.gameName}
                  </Text>
                  <Text style={[styles.timeMeta, { color: theme.colors.textSecondary }]}>
                    {Math.round(m.durationSeconds / 60)} min session • {new Date(m.createdAt).toLocaleDateString()}
                  </Text>
                </View>

                {onRequestRematch && (
                  <TouchableOpacity
                    onPress={() => onRequestRematch(m.gameType)}
                    style={[styles.rematchBtn, { backgroundColor: theme.colors.primary }]}
                  >
                    <Text style={[styles.rematchBtnText, { color: theme.colors.textOnPrimary }]}>
                      Rematch
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            ))
          )}
        </ScrollView>
      ) : (
        /* Global & Friends Leaderboard */
        <ScrollView
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
          {/* Top 3 Podium */}
          {topThree.length >= 3 && (
            <View style={styles.podiumContainer}>
              {/* Rank 2 (Silver) */}
              <View style={[styles.podiumColumn, styles.podiumSecond]}>
                <View style={[styles.podiumAvatarWrap, { borderColor: '#A0AEC0' }]}>
                  <Avatar displayName={topThree[1].displayName} size="md" />
                  <View style={[styles.podiumBadge, { backgroundColor: '#A0AEC0' }]}>
                    <Text style={styles.podiumBadgeText}>2</Text>
                  </View>
                </View>
                <Text style={[styles.podiumName, { color: theme.colors.textPrimary }]} numberOfLines={1}>
                  {topThree[1].displayName.split(' ')[0]}
                </Text>
                <Text style={[styles.podiumWins, { color: theme.colors.textSecondary }]}>
                  {topThree[1].matchesWon} Wins
                </Text>
                <View style={[styles.podiumBlock, { height: 70, backgroundColor: theme.colors.surfaceElevated }]} />
              </View>

              {/* Rank 1 (Gold Crown) */}
              <View style={[styles.podiumColumn, styles.podiumFirst]}>
                <View style={styles.crownWrapper}>
                  <CrownIcon size={20} color="#FFD700" />
                </View>
                <View style={[styles.podiumAvatarWrap, { borderColor: '#FFD700', borderWidth: 2.5 }]}>
                  <Avatar displayName={topThree[0].displayName} size="lg" />
                  <View style={[styles.podiumBadge, { backgroundColor: '#FFD700' }]}>
                    <Text style={[styles.podiumBadgeText, { color: '#000000' }]}>1</Text>
                  </View>
                </View>
                <Text style={[styles.podiumName, { color: theme.colors.textPrimary, fontWeight: '700' }]} numberOfLines={1}>
                  {topThree[0].displayName.split(' ')[0]}
                </Text>
                <Text style={[styles.podiumWins, { color: theme.colors.primary, fontWeight: '700' }]}>
                  {topThree[0].matchesWon} Wins
                </Text>
                <View style={[styles.podiumBlock, { height: 96, backgroundColor: theme.colors.primary + '33' }]} />
              </View>

              {/* Rank 3 (Bronze) */}
              <View style={[styles.podiumColumn, styles.podiumThird]}>
                <View style={[styles.podiumAvatarWrap, { borderColor: '#CD7F32' }]}>
                  <Avatar displayName={topThree[2].displayName} size="md" />
                  <View style={[styles.podiumBadge, { backgroundColor: '#CD7F32' }]}>
                    <Text style={styles.podiumBadgeText}>3</Text>
                  </View>
                </View>
                <Text style={[styles.podiumName, { color: theme.colors.textPrimary }]} numberOfLines={1}>
                  {topThree[2].displayName.split(' ')[0]}
                </Text>
                <Text style={[styles.podiumWins, { color: theme.colors.textSecondary }]}>
                  {topThree[2].matchesWon} Wins
                </Text>
                <View style={[styles.podiumBlock, { height: 50, backgroundColor: theme.colors.surfaceElevated }]} />
              </View>
            </View>
          )}

          {/* Leaderboard Table Rows */}
          <View style={styles.listContainer}>
            {remainingPlayers.map((player) => (
              <View
                key={player.userId}
                style={[
                  styles.playerRow,
                  {
                    backgroundColor: player.isCurrentUser
                      ? theme.colors.primary + '18'
                      : theme.colors.surface,
                    borderColor: player.isCurrentUser
                      ? theme.colors.primary
                      : theme.colors.border,
                  },
                ]}
              >
                <Text style={[styles.rankNumber, { color: theme.colors.textSecondary }]}>
                  #{player.rank}
                </Text>
                <Avatar displayName={player.displayName} size="sm" />
                <View style={styles.playerMeta}>
                  <Text style={[styles.playerNameText, { color: theme.colors.textPrimary }]}>
                    {player.displayName}
                  </Text>
                  <Text style={[styles.playerSubText, { color: theme.colors.textSecondary }]}>
                    {player.matchesPlayed} matches • {player.winRate}% win rate
                  </Text>
                </View>
                <View style={styles.playerStatsRight}>
                  <View style={styles.streakBadge}>
                    <FlameIcon size={12} color="#FF8A00" />
                    <Text style={styles.streakText}>{player.highestStreak}</Text>
                  </View>
                  <Text style={[styles.wonCount, { color: theme.colors.primary }]}>
                    {player.matchesWon}W
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  backBtn: {
    padding: 6,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  badgeBtn: {
    padding: 8,
    borderRadius: 16,
  },
  tabBar: {
    flexDirection: 'row',
    margin: 16,
    borderRadius: 20,
    padding: 4,
    gap: 4,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 16,
    alignItems: 'center',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  podiumContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginTop: 10,
    marginBottom: 20,
    gap: 8,
  },
  podiumColumn: {
    flex: 1,
    alignItems: 'center',
  },
  podiumFirst: {
    zIndex: 10,
  },
  podiumSecond: {
    zIndex: 5,
  },
  podiumThird: {
    zIndex: 5,
  },
  crownWrapper: {
    marginBottom: 4,
  },
  podiumAvatarWrap: {
    borderWidth: 2,
    borderRadius: 40,
    padding: 2,
    position: 'relative',
    marginBottom: 6,
  },
  podiumBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  podiumBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  podiumName: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
  },
  podiumWins: {
    fontSize: 11,
    marginBottom: 8,
  },
  podiumBlock: {
    width: '100%',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  listContainer: {
    gap: 8,
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 18,
    borderWidth: 0,
    gap: 12,
  },
  rankNumber: {
    fontSize: 13,
    fontWeight: '700',
    width: 28,
  },
  playerMeta: {
    flex: 1,
  },
  playerNameText: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  playerSubText: {
    fontSize: 11,
  },
  playerStatsRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(255, 138, 0, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  streakText: {
    color: '#FF8A00',
    fontSize: 11,
    fontWeight: '700',
  },
  wonCount: {
    fontSize: 14,
    fontWeight: '800',
  },
  historyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 20,
    borderWidth: 0,
    marginBottom: 10,
  },
  historyLeft: {
    flex: 1,
    gap: 4,
  },
  outcomeTag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  outcomeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  gameName: {
    fontSize: 15,
    fontWeight: '700',
  },
  timeMeta: {
    fontSize: 11,
  },
  rematchBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
  },
  rematchBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  emptyText: {
    fontSize: 13,
    textAlign: 'center',
  },
});
