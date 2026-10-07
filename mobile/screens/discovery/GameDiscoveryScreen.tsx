import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '../../theme';
import {
  SearchIcon,
  TrophyIcon,
  FlameIcon,
  GamepadIcon,
  UsersIcon,
  ChevronRightIcon,
  StarIcon,
  InfoIcon,
  BotIcon,
} from '../../icons';
import { GameRulesModal } from '../../components';
import { apiGet } from '../../services/api';
import { isSoloGameSupported } from '../../constants/soloGames';

export interface CatalogGame {
  id: string;
  name: string;
  category: string;
  minPlayers: number;
  maxPlayers: number;
  turnTimeSeconds: number;
  description: string;
  iconName: string;
  activeRooms?: number;
}

interface GameDiscoveryScreenProps {
  onSelectGame: (gameId: string) => void;
  onPressLeaderboards: () => void;
  onPressAchievements: () => void;
}

const CATEGORIES = [
  { id: 'ALL', label: 'All (71+)' },
  { id: 'BOARD', label: 'Board' },
  { id: 'CARD', label: 'Cards' },
  { id: 'CASUAL', label: 'Casual' },
  { id: 'COMPETITIVE', label: 'Reflex' },
  { id: 'PUZZLE', label: 'Puzzle' },
  { id: 'PARTY', label: 'Party' },
];

export const GameDiscoveryScreen: React.FC<GameDiscoveryScreenProps> = ({
  onSelectGame,
  onPressLeaderboards,
  onPressAchievements,
}) => {
  const { theme } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [games, setGames] = useState<CatalogGame[]>([]);
  const [trending, setTrending] = useState<CatalogGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRulesGame, setSelectedRulesGame] = useState<CatalogGame | null>(null);

  useEffect(() => {
    loadCatalog();
  }, [selectedCategory]);

  const loadCatalog = async () => {
    setLoading(true);
    try {
      const url =
        selectedCategory === 'ALL'
          ? '/games/catalog'
          : `/games/catalog?category=${selectedCategory}`;
      const res = await apiGet<{
        games: CatalogGame[];
        trending: CatalogGame[];
      }>(url);
      setGames(res.games || []);
      if (res.trending) setTrending(res.trending);
    } catch {
      // Graceful fallback list
      setGames([
        { id: 'TICTACTOE', name: 'Tic-Tac-Toe Arena', category: 'BOARD', minPlayers: 2, maxPlayers: 2, turnTimeSeconds: 15, description: 'Classic 3x3 alignment duel with instant rematches.', iconName: 'tictactoe', activeRooms: 5 },
        { id: 'LUDO', name: 'Ludo World Arena', category: 'BOARD', minPlayers: 2, maxPlayers: 4, turnTimeSeconds: 20, description: '4-quadrant token race with safe zones and captures.', iconName: 'ludo', activeRooms: 12 },
        { id: 'CHESS', name: 'Chess Grandmaster', category: 'BOARD', minPlayers: 2, maxPlayers: 2, turnTimeSeconds: 30, description: 'Standard 8x8 FIDE rules, checks, and pawn promotions.', iconName: 'chess', activeRooms: 8 },
        { id: 'WORDLE_DUEL', name: 'Wordle Duel', category: 'PUZZLE', minPlayers: 2, maxPlayers: 2, turnTimeSeconds: 30, description: '5-letter secret word deduction in 6 attempts.', iconName: 'wordle', activeRooms: 14 },
        { id: 'WOULD_YOU_RATHER', name: 'Would You Rather?', category: 'PARTY', minPlayers: 2, maxPlayers: 8, turnTimeSeconds: 20, description: 'Dilemmas with live votes and majority consensus bonuses.', iconName: 'wyr', activeRooms: 9 },
        { id: 'UNO_STYLE', name: 'Color Match Clash', category: 'CARD', minPlayers: 2, maxPlayers: 4, turnTimeSeconds: 15, description: 'Fast card shedding with wild skips and reverses.', iconName: 'cards', activeRooms: 11 },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const filteredGames = games.filter((g) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      g.name.toLowerCase().includes(q) ||
      g.description.toLowerCase().includes(q) ||
      g.category.toLowerCase().includes(q)
    );
  });

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Top Header */}
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <View style={styles.titleRow}>
          <Text style={[styles.mainTitle, { color: theme.colors.textPrimary }]}>
            Game Arena
          </Text>
          <View style={styles.headerActions}>
            <TouchableOpacity
              onPress={onPressAchievements}
              style={[styles.headerIconBtn, { backgroundColor: theme.colors.surfaceElevated }]}
              activeOpacity={0.7}
              accessibilityLabel="Achievements"
            >
              <TrophyIcon size={18} color="#FFD700" />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onPressLeaderboards}
              style={[styles.headerIconBtn, { backgroundColor: theme.colors.surfaceElevated }]}
              activeOpacity={0.7}
              accessibilityLabel="Leaderboards"
            >
              <FlameIcon size={18} color="#FF8A00" />
            </TouchableOpacity>
          </View>
        </View>

        {/* 54px Marvie Search Input */}
        <View
          style={[
            styles.searchBar,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <View style={[styles.searchIconBox, { backgroundColor: theme.colors.surfaceElevated }]}>
            <SearchIcon size={18} color={theme.colors.textSecondary} />
          </View>
          <TextInput
            style={[styles.searchInput, { color: theme.colors.textPrimary }]}
            placeholder="Search 71+ multiplayer titles..."
            placeholderTextColor={theme.colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Horizontal Category Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScroll}
        >
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                onPress={() => setSelectedCategory(cat.id)}
                activeOpacity={0.8}
                style={[
                  styles.categoryChip,
                  {
                    backgroundColor: isSelected
                      ? theme.colors.primary
                      : theme.colors.surface,
                    borderColor: isSelected
                      ? theme.colors.primary
                      : theme.colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.categoryText,
                    {
                      color: isSelected
                        ? theme.colors.textOnPrimary
                        : theme.colors.textSecondary,
                      fontWeight: isSelected ? '700' : '500',
                    },
                  ]}
                >
                  {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Main Body */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Trending Shelf (Shown on ALL view when no search query) */}
          {selectedCategory === 'ALL' && !searchQuery.trim() && trending.length > 0 && (
            <View style={styles.shelfSection}>
              <View style={styles.shelfHeader}>
                <View style={styles.shelfTitleRow}>
                  <FlameIcon size={18} color="#FF8A00" />
                  <Text style={[styles.shelfTitle, { color: theme.colors.textPrimary }]}>
                    Trending Right Now
                  </Text>
                </View>
                <Text style={[styles.shelfBadge, { color: theme.colors.primary }]}>
                  Live Rooms
                </Text>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.trendingScroll}
              >
                {trending.map((tg) => (
                  <TouchableOpacity
                    key={tg.id}
                    onPress={() => onSelectGame(tg.id)}
                    activeOpacity={0.85}
                    style={[
                      styles.trendingCard,
                      {
                        backgroundColor: theme.colors.surface,
                        borderColor: theme.colors.border,
                      },
                    ]}
                  >
                    <View style={styles.trendingCardHeader}>
                      <View style={[styles.categoryPill, { backgroundColor: theme.colors.surfaceElevated }]}>
                        <Text style={[styles.categoryPillText, { color: theme.colors.textSecondary }]}>
                          {tg.category}
                        </Text>
                      </View>
                      <View style={styles.liveIndicator}>
                        <View style={styles.liveDot} />
                        <Text style={styles.liveText}>{tg.activeRooms || 2} Live</Text>
                      </View>
                    </View>

                    <Text
                      style={[styles.trendingName, { color: theme.colors.textPrimary }]}
                      numberOfLines={1}
                    >
                      {tg.name}
                    </Text>

                    <View style={styles.trendingFooter}>
                      <Text style={[styles.playerTag, { color: theme.colors.textSecondary }]}>
                        {tg.minPlayers === tg.maxPlayers
                          ? `${tg.minPlayers}P Duel`
                          : `${tg.minPlayers}-${tg.maxPlayers} Players`}
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <TouchableOpacity
                          onPress={(e) => {
                            e.stopPropagation();
                            setSelectedRulesGame(tg);
                          }}
                          style={[styles.infoBtnSmall, { backgroundColor: theme.colors.surfaceElevated }]}
                          activeOpacity={0.7}
                          accessibilityLabel="Game Rules"
                        >
                          <InfoIcon size={12} color={theme.colors.primary} />
                        </TouchableOpacity>
                        <View style={[styles.playPill, { backgroundColor: theme.colors.primary }]}>
                          <Text style={[styles.playPillText, { color: theme.colors.textOnPrimary }]}>
                            Play
                          </Text>
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Catalog Grid Section */}
          <View style={styles.gridSection}>
            <Text style={[styles.sectionHeading, { color: theme.colors.textPrimary }]}>
              {selectedCategory === 'ALL' ? 'All Games' : `${selectedCategory} Collection`}{' '}
              ({filteredGames.length})
            </Text>

            <View style={styles.gridList}>
              {filteredGames.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  onPress={() => onSelectGame(item.id)}
                  activeOpacity={0.85}
                  style={[
                    styles.gameCard,
                    {
                      backgroundColor: theme.colors.surface,
                      borderColor: theme.colors.border,
                    },
                  ]}
                >
                  <View style={styles.gameCardTop}>
                    <View style={[styles.gameIconBadge, { backgroundColor: theme.colors.surfaceElevated }]}>
                      <GamepadIcon size={22} color={theme.colors.primary} />
                    </View>
                    <View style={styles.gameMeta}>
                      <Text
                        style={[styles.gameCardTitle, { color: theme.colors.textPrimary }]}
                        numberOfLines={1}
                      >
                        {item.name}
                      </Text>
                      <Text
                        style={[styles.gameCardCategory, { color: theme.colors.textSecondary }]}
                      >
                        {item.category} • {item.minPlayers === item.maxPlayers ? `${item.minPlayers} Players` : `${item.minPlayers}-${item.maxPlayers} Players`} • {item.turnTimeSeconds}s
                      </Text>
                    </View>
                  </View>

                  <Text
                    style={[styles.gameCardDesc, { color: theme.colors.textSecondary }]}
                    numberOfLines={2}
                  >
                    {item.description}
                  </Text>

                  <View style={styles.gameCardBottom}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <View style={styles.playersBadge}>
                        <UsersIcon size={12} color={theme.colors.textSecondary} />
                        <Text style={[styles.playersBadgeText, { color: theme.colors.textSecondary }]}>
                          Multiplayer
                        </Text>
                      </View>
                      {isSoloGameSupported(item.id) && (
                        <View style={[styles.playersBadge, { backgroundColor: theme.colors.primary + '18' }]}>
                          <BotIcon size={12} color={theme.colors.primary} />
                          <Text style={[styles.playersBadgeText, { color: theme.colors.primary, fontWeight: '700' }]}>
                            Solo
                          </Text>
                        </View>
                      )}
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <TouchableOpacity
                        onPress={(e) => {
                          e.stopPropagation();
                          setSelectedRulesGame(item);
                        }}
                        style={[styles.infoBtnSmall, { backgroundColor: theme.colors.surfaceElevated }]}
                        activeOpacity={0.7}
                        accessibilityLabel="Game Rules"
                      >
                        <InfoIcon size={14} color={theme.colors.primary} />
                      </TouchableOpacity>
                      <View style={[styles.quickLaunchBtn, { backgroundColor: theme.colors.primary }]}>
                        <Text style={[styles.quickLaunchText, { color: theme.colors.textOnPrimary }]}>
                          Enter Match
                        </Text>
                        <ChevronRightIcon size={14} color={theme.colors.textOnPrimary} strokeWidth={2.5} />
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>
      )}

      {/* Game Rules Modal */}
      <GameRulesModal
        visible={selectedRulesGame !== null}
        gameType={selectedRulesGame?.id || ''}
        gameTitle={selectedRulesGame?.name}
        category={selectedRulesGame?.category}
        onClose={() => setSelectedRulesGame(null)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  mainTitle: {
    fontSize: 22,
    fontWeight: '800',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBar: {
    height: 54,
    borderRadius: 27,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    gap: 10,
  },
  searchIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: 14,
  },
  categoryScroll: {
    gap: 8,
    paddingVertical: 2,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
  },
  categoryText: {
    fontSize: 12,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  shelfSection: {
    marginTop: 16,
    gap: 12,
  },
  shelfHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  shelfTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  shelfTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  shelfBadge: {
    fontSize: 12,
    fontWeight: '600',
  },
  trendingScroll: {
    paddingHorizontal: 16,
    gap: 12,
  },
  trendingCard: {
    width: 170,
    borderRadius: 20,
    borderWidth: 1,
    padding: 14,
    justifyContent: 'space-between',
    gap: 10,
  },
  trendingCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  categoryPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  categoryPillText: {
    fontSize: 9,
    fontWeight: '700',
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#3ED598',
  },
  liveText: {
    fontSize: 10,
    color: '#3ED598',
    fontWeight: '600',
  },
  trendingName: {
    fontSize: 14,
    fontWeight: '700',
  },
  trendingFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  playerTag: {
    fontSize: 11,
  },
  playPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  playPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  gridSection: {
    marginTop: 20,
    paddingHorizontal: 16,
    gap: 12,
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '700',
  },
  gridList: {
    gap: 12,
  },
  gameCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 16,
    gap: 10,
  },
  gameCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  gameIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gameMeta: {
    flex: 1,
  },
  gameCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  gameCardCategory: {
    fontSize: 11,
  },
  gameCardDesc: {
    fontSize: 12,
    lineHeight: 17,
  },
  gameCardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  playersBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  playersBadgeText: {
    fontSize: 11,
  },
  quickLaunchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
  },
  quickLaunchText: {
    fontSize: 12,
    fontWeight: '700',
  },
  infoBtnSmall: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
