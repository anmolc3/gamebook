import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { useTheme } from '../../theme';
import { Icon } from '../../icons';
import { RoomService, RoomDetails, SupportedGameType } from '../../services/room.service';
import { SoloService } from '../../services/solo.service';
import { AiDifficulty, BOT_AVATARS } from '../../constants/soloGames';

export interface JoinRoomModalProps {
  visible: boolean;
  onClose: () => void;
  onJoinedRoom: (room: RoomDetails) => void;
  initialGameType?: SupportedGameType;
  initialTab?: 'solo' | 'quick' | 'join' | 'create';
}

export const JoinRoomModal: React.FC<JoinRoomModalProps> = ({
  visible,
  onClose,
  onJoinedRoom,
  initialGameType,
  initialTab,
}) => {
  const { theme } = useTheme();

  const [activeTab, setActiveTab] = useState<'solo' | 'quick' | 'join' | 'create'>(
    initialTab || 'quick'
  );
  const [soloDifficulty, setSoloDifficulty] = useState<AiDifficulty>('MEDIUM');
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [selectedGameType, setSelectedGameType] = useState<SupportedGameType>(
    initialGameType || 'TICTACTOE'
  );
  const [isPrivate, setIsPrivate] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  React.useEffect(() => {
    if (visible) {
      if (initialGameType) setSelectedGameType(initialGameType);
      if (initialTab) setActiveTab(initialTab);
    }
  }, [visible, initialGameType, initialTab]);

  const handleStartSolo = async () => {
    try {
      setIsLoading(true);
      const res = await SoloService.startSoloMatch(selectedGameType, soloDifficulty);
      const virtualRoom: RoomDetails = {
        id: res.matchId,
        code: res.roomCode,
        gameType: res.gameType as any,
        status: 'PLAYING',
        isPrivate: true,
        maxPlayers: 2,
        hostId: res.players[0]?.userId || 'HUMAN',
        host: null,
        players: res.players.map((p, idx) => ({
          id: p.userId,
          userId: p.userId,
          slotIndex: idx,
          isReady: true,
          score: 0,
          user: {
            id: p.userId,
            username: p.username,
            displayName: p.displayName || p.username,
            avatarUrl: null,
            isOnline: true,
          },
        })),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      onClose();
      onJoinedRoom(virtualRoom);
    } catch (err: any) {
      Alert.alert('Solo Match Failed', err.message || 'Could not start solo game');
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinViaCode = async () => {
    const code = roomCodeInput.trim().toUpperCase();
    if (code.length < 4) {
      Alert.alert('Invalid Code', 'Please enter a valid 6-character room code');
      return;
    }

    try {
      setIsLoading(true);
      const room = await RoomService.joinRoom(code);
      setRoomCodeInput('');
      onClose();
      onJoinedRoom(room);
    } catch (err: any) {
      Alert.alert('Join Failed', err.message || 'Could not join room');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateRoom = async () => {
    try {
      setIsLoading(true);
      const maxPlayers = selectedGameType === 'LUDO' ? 4 : 2;
      const room = await RoomService.createRoom(selectedGameType, isPrivate, maxPlayers);
      onClose();
      onJoinedRoom(room);
    } catch (err: any) {
      Alert.alert('Creation Failed', err.message || 'Could not create room');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickMatch = async () => {
    try {
      setIsLoading(true);
      const res = await RoomService.matchmake(selectedGameType);
      onClose();
      onJoinedRoom(res.room);
    } catch (err: any) {
      Alert.alert('Matchmaking Failed', err.message || 'Could not find or create match');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={[styles.backdrop, { backgroundColor: theme.colors.backdrop }]}>
        <View
          style={[
            styles.dialogCard,
            { backgroundColor: theme.colors.surfaceElevated, borderColor: theme.colors.border },
          ]}
        >
          {/* Header */}
          <View style={styles.dialogHeader}>
            <View style={[styles.headerIconCircle, { backgroundColor: theme.colors.primary + '20' }]}>
              <Icon name="gamepad" size={24} color={theme.colors.primary} />
            </View>
            <Text style={[styles.dialogTitle, { color: theme.colors.textPrimary }]}>
              Multiplayer Match
            </Text>
            <TouchableOpacity
              onPress={onClose}
              style={[styles.closeIconBtn, { backgroundColor: theme.colors.surface }]}
              activeOpacity={0.7}
            >
              <Icon name="close" size={16} color={theme.colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Tab Selector */}
          <View style={[styles.tabsRow, { backgroundColor: theme.colors.surface }]}>
            <TouchableOpacity
              onPress={() => setActiveTab('solo')}
              style={[
                styles.tabBtn,
                activeTab === 'solo' && {
                  backgroundColor: theme.colors.primary,
                },
              ]}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.tabBtnText,
                  {
                    color:
                      activeTab === 'solo'
                        ? theme.colors.textOnPrimary
                        : theme.colors.textMuted,
                  },
                ]}
              >
                Solo AI
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setActiveTab('quick')}
              style={[
                styles.tabBtn,
                activeTab === 'quick' && {
                  backgroundColor: theme.colors.primary,
                },
              ]}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.tabBtnText,
                  {
                    color:
                      activeTab === 'quick'
                        ? theme.colors.textOnPrimary
                        : theme.colors.textMuted,
                  },
                ]}
              >
                Quick Play
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setActiveTab('join')}
              style={[
                styles.tabBtn,
                activeTab === 'join' && {
                  backgroundColor: theme.colors.primary,
                },
              ]}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.tabBtnText,
                  {
                    color:
                      activeTab === 'join'
                        ? theme.colors.textOnPrimary
                        : theme.colors.textMuted,
                  },
                ]}
              >
                Join Code
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setActiveTab('create')}
              style={[
                styles.tabBtn,
                activeTab === 'create' && {
                  backgroundColor: theme.colors.primary,
                },
              ]}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.tabBtnText,
                  {
                    color:
                      activeTab === 'create'
                        ? theme.colors.textOnPrimary
                        : theme.colors.textMuted,
                  },
                ]}
              >
                Create Room
              </Text>
            </TouchableOpacity>
          </View>

          {/* Game Selection Carousel (for Quick & Create) */}
          {activeTab !== 'join' && (
            <View>
              <Text style={[styles.gameSelectLabel, { color: theme.colors.textSecondary }]}>
                Choose Game:
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.gameSelectScroll}
              >
                {[
                  { id: 'TICTACTOE', label: 'Tic-Tac-Toe', icon: 'target' as const, color: theme.colors.primary },
                  { id: 'LUDO', label: 'Ludo Arena', icon: 'dice' as const, color: theme.colors.accent },
                  { id: 'CHESS', label: 'Chess Master', icon: 'trophy' as const, color: '#0062FF' },
                  { id: 'CHECKERS', label: 'Checkers', icon: 'crown' as const, color: '#FF575F' },
                  { id: 'CONNECT_FOUR', label: 'Connect 4', icon: 'circleMark' as const, color: '#FFC542' },
                  { id: 'REVERSI', label: 'Reversi', icon: 'palette' as const, color: '#3ED598' },
                  { id: 'GOMOKU', label: 'Gomoku', icon: 'star' as const, color: '#CBD5E1' },
                  { id: 'CARROM', label: 'Carrom Board', icon: 'target' as const, color: '#FFC542' },
                  { id: 'SNAKES_AND_LADDERS', label: 'Snakes & Ladders', icon: 'dice' as const, color: '#3ED598' },
                  { id: 'BATTLESHIP', label: 'Battleship', icon: 'shield' as const, color: '#0062FF' },
                  { id: 'DOMINOES', label: 'Dominoes', icon: 'play' as const, color: '#CBD5E1' },
                  { id: 'BACKGAMMON', label: 'Backgammon', icon: 'flame' as const, color: '#FF575F' },
                  { id: 'MANCALA', label: 'Mancala', icon: 'award' as const, color: '#FFC542' },
                  { id: 'CHINESE_CHECKERS', label: 'Chinese Checkers', icon: 'star' as const, color: '#3ED598' },
                  { id: 'POOL_8_BALL', label: '8 Ball Pool', icon: 'target' as const, color: '#3ED598' },
                  { id: 'MINI_GOLF', label: 'Mini Golf', icon: 'award' as const, color: '#22C55E' },
                  { id: 'AIR_HOCKEY', label: 'Air Hockey', icon: 'target' as const, color: '#38BDF8' },
                  { id: 'DARTS', label: 'Darts 501', icon: 'target' as const, color: '#FF575F' },
                  { id: 'BOWLING', label: 'Bowling Strike', icon: 'trophy' as const, color: '#F59E0B' },
                  { id: 'TABLE_TENNIS', label: 'Table Tennis', icon: 'play' as const, color: '#0284C7' },
                  { id: 'UNO_STYLE', label: 'Color Clash (UNO)', icon: 'palette' as const, color: '#EF4444' },
                  { id: 'HEARTS', label: 'Hearts', icon: 'flame' as const, color: '#DC2626' },
                  { id: 'SPADES', label: 'Spades', icon: 'target' as const, color: '#3B82F6' },
                  { id: 'RUMMY', label: 'Indian Rummy', icon: 'flame' as const, color: '#F59E0B' },
                  { id: 'GIN_RUMMY', label: 'Gin Rummy', icon: 'award' as const, color: '#10B981' },
                  { id: 'CRAZY_EIGHTS', label: 'Crazy Eights', icon: 'star' as const, color: '#8B5CF6' },
                  { id: 'GO_FISH', label: 'Go Fish', icon: 'award' as const, color: '#06B6D4' },
                  { id: 'WAR', label: 'War Card Duel', icon: 'shield' as const, color: '#F43F5E' },
                  { id: 'DURAK', label: 'Durak', icon: 'shield' as const, color: '#EC4899' },
                  { id: 'PRESIDENT', label: 'President', icon: 'crown' as const, color: '#EAB308' },
                  { id: 'BLACKJACK', label: 'Blackjack 21', icon: 'trophy' as const, color: '#6366F1' },
                  { id: 'POKER', label: 'Texas Hold\'em', icon: 'trophy' as const, color: '#14B8A6' },
                  { id: 'ROCK_PAPER_SCISSORS', label: 'Rock Paper Scissors', icon: 'gamepad' as const, color: '#10B981' },
                  { id: 'REACTION_TEST', label: 'Reaction Test', icon: 'target' as const, color: '#EF4444' },
                  { id: 'NUMBER_GUESS', label: 'Number Guess', icon: 'award' as const, color: '#3B82F6' },
                  { id: 'SPEED_TAP', label: 'Speed Tap Rush', icon: 'flame' as const, color: '#F59E0B' },
                  { id: 'COLOR_MATCH', label: 'Color Match Reflex', icon: 'palette' as const, color: '#8B5CF6' },
                  { id: 'MATH_BATTLE', label: 'Speed Math Duel', icon: 'star' as const, color: '#06B6D4' },
                  { id: 'QUICK_DRAW', label: 'Quick Draw Western', icon: 'target' as const, color: '#DC2626' },
                  { id: 'WORDLE_DUEL', label: 'Wordle Duel', icon: 'award' as const, color: '#22C55E' },
                  { id: 'HANGMAN', label: 'Hangman Duel', icon: 'shield' as const, color: '#EAB308' },
                  { id: 'MEMORY_MATCH', label: 'Memory Card Match', icon: 'target' as const, color: '#EC4899' },
                  { id: 'QUIZ_BATTLE', label: 'Quiz Battle Arena', icon: 'bell' as const, color: '#6366F1' },
                  { id: '2048_MULTIPLAYER', label: '2048 Versus Race', icon: 'trophy' as const, color: '#F97316' },
                  { id: 'MINESWEEPER_DUEL', label: 'Minesweeper Duel', icon: 'shield' as const, color: '#14B8A6' },
                  { id: 'PATTERN_MATCH', label: 'Pattern Simon Matrix', icon: 'circleMark' as const, color: '#A855F7' },
                  { id: 'MASTERMIND', label: 'Mastermind Code', icon: 'crown' as const, color: '#3B82F6' },
                  { id: 'WORD_SCRAMBLE', label: 'Anagram Scramble', icon: 'flame' as const, color: '#F43F5E' },
                  { id: 'TYPING_RACE', label: 'Mobile Typing Race', icon: 'play' as const, color: '#0EA5E9' },
                  { id: 'WOULD_YOU_RATHER', label: 'Would You Rather?', icon: 'users' as const, color: '#38BDF8' },
                  { id: 'TRUTH_OR_DARE', label: 'Truth or Dare', icon: 'bell' as const, color: '#F59E0B' },
                  { id: 'CHARADES', label: 'Charades Party', icon: 'play' as const, color: '#10B981' },
                  { id: 'GUESS_PICTURE', label: 'Pixel Reveal Guess', icon: 'target' as const, color: '#8B5CF6' },
                  { id: 'GUESS_WORD', label: 'Taboo Word Clue', icon: 'shield' as const, color: '#EF4444' },
                  { id: 'GUESS_SONG', label: 'Name That Tune', icon: 'star' as const, color: '#EC4899' },
                  { id: 'WHO_AM_I', label: 'Who Am I?', icon: 'award' as const, color: '#FBBF24' },
                  { id: 'IMPOSTER', label: 'The Imposter', icon: 'shield' as const, color: '#E11D48' },
                  { id: 'MAFIA', label: 'Mafia Werewolf', icon: 'crown' as const, color: '#7C3AED' },
                  { id: 'DRAW_AND_GUESS', label: 'Draw & Guess', icon: 'palette' as const, color: '#06B6D4' },
                  { id: 'PICTIONARY', label: 'Pictionary Duel', icon: 'palette' as const, color: '#F97316' },
                  { id: 'NEVER_HAVE_I_EVER', label: 'Never Have I Ever', icon: 'flame' as const, color: '#DC2626' },
                  { id: 'THIS_OR_THAT', label: 'This or That', icon: 'star' as const, color: '#F43F5E' },
                  { id: 'TWO_TRUTHS_AND_A_LIE', label: '2 Truths & Lie', icon: 'award' as const, color: '#6366F1' },
                ].map((opt) => {
                  const isSelected = selectedGameType === opt.id;
                  return (
                    <TouchableOpacity
                      key={opt.id}
                      onPress={() => setSelectedGameType(opt.id)}
                      style={[
                        styles.gameOptionChip,
                        {
                          backgroundColor: isSelected
                            ? opt.color + '22'
                            : theme.colors.surface,
                          borderColor: isSelected
                            ? opt.color
                            : theme.colors.border,
                        },
                      ]}
                      activeOpacity={0.8}
                    >
                      <Icon
                        name={opt.icon}
                        size={18}
                        color={isSelected ? opt.color : theme.colors.textMuted}
                      />
                      <Text
                        style={[
                          styles.gameOptionText,
                          {
                            color: isSelected
                              ? opt.color
                              : theme.colors.textSecondary,
                          },
                        ]}
                      >
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* Tab 0: Solo AI Opponent */}
          {activeTab === 'solo' && (
            <View style={styles.tabBody}>
              {/* Difficulty Selector */}
              <View>
                <Text style={[styles.gameSelectLabel, { color: theme.colors.textSecondary }]}>
                  AI Difficulty:
                </Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {(['EASY', 'MEDIUM', 'HARD', 'EXPERT'] as AiDifficulty[]).map((diff) => {
                    const isSelected = soloDifficulty === diff;
                    return (
                      <TouchableOpacity
                        key={diff}
                        style={{
                          flex: 1,
                          paddingVertical: 10,
                          borderRadius: 12,
                          borderWidth: 1.5,
                          alignItems: 'center',
                          backgroundColor: isSelected
                            ? theme.colors.primary
                            : theme.colors.surface,
                          borderColor: isSelected
                            ? theme.colors.primary
                            : theme.colors.border,
                        }}
                        onPress={() => setSoloDifficulty(diff)}
                        activeOpacity={0.8}
                      >
                        <Text
                          style={{
                            fontSize: 12,
                            fontWeight: '700',
                            color: isSelected
                              ? theme.colors.textOnPrimary
                              : theme.colors.textSecondary,
                          }}
                        >
                          {diff.charAt(0) + diff.slice(1).toLowerCase()}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* AI Opponent Card */}
              <View
                style={{
                  flexDirection: 'row',
                  padding: 12,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                  backgroundColor: theme.colors.surface,
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    backgroundColor: theme.colors.primary + '20',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon name="bot" size={22} color={theme.colors.primary} />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: theme.colors.textPrimary }}>
                      {soloDifficulty === 'EASY' ? 'Pixel' : soloDifficulty === 'HARD' ? 'Ace' : soloDifficulty === 'EXPERT' ? 'Atlas' : 'Nova'}
                    </Text>
                    <View style={{ backgroundColor: theme.colors.primary + '18', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                      <Text style={{ fontSize: 10, fontWeight: '700', color: theme.colors.primary }}>
                        AI Opponent
                      </Text>
                    </View>
                  </View>
                  <Text style={{ fontSize: 12, color: theme.colors.textSecondary }}>
                    Server-authoritative game engine with fair-play move calculation.
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={handleStartSolo}
                disabled={isLoading}
                style={[styles.actionSubmitBtn, { backgroundColor: theme.colors.primary }]}
                activeOpacity={0.8}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color={theme.colors.textOnPrimary} />
                ) : (
                  <>
                    <Icon name="play" size={18} color={theme.colors.textOnPrimary} />
                    <Text style={[styles.actionSubmitText, { color: theme.colors.textOnPrimary }]}>
                      Play Solo vs AI
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Tab 1: Quick Play */}
          {activeTab === 'quick' && (
            <View style={styles.tabBody}>
              <Text style={[styles.tabDescription, { color: theme.colors.textSecondary }]}>
                Matchmake instantly with online players in our public matchmaking queue.
              </Text>
              <TouchableOpacity
                onPress={handleQuickMatch}
                disabled={isLoading}
                style={[styles.actionSubmitBtn, { backgroundColor: theme.colors.primary }]}
                activeOpacity={0.8}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color={theme.colors.textOnPrimary} />
                ) : (
                  <>
                    <Icon name="play" size={18} color={theme.colors.textOnPrimary} />
                    <Text style={[styles.actionSubmitText, { color: theme.colors.textOnPrimary }]}>
                      Find Match Now
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Tab 2: Join Code */}
          {activeTab === 'join' && (
            <View style={styles.tabBody}>
              <Text style={[styles.tabDescription, { color: theme.colors.textSecondary }]}>
                Enter a 6-character room code shared by a friend to jump into their lobby.
              </Text>
              <TextInput
                style={[
                  styles.codeInput,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                    color: theme.colors.textPrimary,
                  },
                ]}
                placeholder="e.g. TTT89X"
                placeholderTextColor={theme.colors.textMuted}
                value={roomCodeInput}
                onChangeText={(text) => setRoomCodeInput(text.toUpperCase())}
                maxLength={6}
                autoCapitalize="characters"
              />
              <TouchableOpacity
                onPress={handleJoinViaCode}
                disabled={roomCodeInput.trim().length < 4 || isLoading}
                style={[
                  styles.actionSubmitBtn,
                  {
                    backgroundColor: theme.colors.primary,
                    opacity: roomCodeInput.trim().length < 4 || isLoading ? 0.5 : 1,
                  },
                ]}
                activeOpacity={0.8}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color={theme.colors.textOnPrimary} />
                ) : (
                  <>
                    <Icon name="check" size={18} color={theme.colors.textOnPrimary} />
                    <Text style={[styles.actionSubmitText, { color: theme.colors.textOnPrimary }]}>
                      Join Lobby
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Tab 3: Create Room */}
          {activeTab === 'create' && (
            <View style={styles.tabBody}>
              <Text style={[styles.tabDescription, { color: theme.colors.textSecondary }]}>
                Create a private room to play exclusively with friends, or public to allow anyone to join.
              </Text>
              <View style={styles.privacyToggleRow}>
                <TouchableOpacity
                  onPress={() => setIsPrivate(true)}
                  style={[
                    styles.privacyChoiceBtn,
                    {
                      backgroundColor: isPrivate
                        ? theme.colors.primary + '18'
                        : theme.colors.surface,
                      borderColor: isPrivate ? theme.colors.primary : theme.colors.border,
                    },
                  ]}
                >
                  <Icon
                    name="lock"
                    size={16}
                    color={isPrivate ? theme.colors.primary : theme.colors.textMuted}
                  />
                  <Text
                    style={[
                      styles.privacyChoiceText,
                      { color: isPrivate ? theme.colors.primary : theme.colors.textSecondary },
                    ]}
                  >
                    Private (Friends Only)
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setIsPrivate(false)}
                  style={[
                    styles.privacyChoiceBtn,
                    {
                      backgroundColor: !isPrivate
                        ? theme.colors.primary + '18'
                        : theme.colors.surface,
                      borderColor: !isPrivate ? theme.colors.primary : theme.colors.border,
                    },
                  ]}
                >
                  <Icon
                    name="users"
                    size={16}
                    color={!isPrivate ? theme.colors.primary : theme.colors.textMuted}
                  />
                  <Text
                    style={[
                      styles.privacyChoiceText,
                      { color: !isPrivate ? theme.colors.primary : theme.colors.textSecondary },
                    ]}
                  >
                    Public (Open to All)
                  </Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                onPress={handleCreateRoom}
                disabled={isLoading}
                style={[styles.actionSubmitBtn, { backgroundColor: theme.colors.primary }]}
                activeOpacity={0.8}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color={theme.colors.textOnPrimary} />
                ) : (
                  <>
                    <Icon name="gamepad" size={18} color={theme.colors.textOnPrimary} />
                    <Text style={[styles.actionSubmitText, { color: theme.colors.textOnPrimary }]}>
                      Create & Enter Lobby
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dialogCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 25,
    borderWidth: 1,
    padding: 22,
    gap: 16,
  },
  dialogHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dialogTitle: {
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
  },
  closeIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabsRow: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: 14,
    gap: 4,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  tabBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  gameSelectLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  gameSelectScroll: {
    gap: 8,
    paddingVertical: 2,
  },
  gameOptionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1.5,
    gap: 8,
  },
  gameOptionText: {
    fontSize: 13,
    fontWeight: '700',
  },
  tabBody: {
    gap: 14,
  },
  tabDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  codeInput: {
    height: 54,
    borderRadius: 14,
    borderWidth: 1.5,
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 4,
  },
  privacyToggleRow: {
    gap: 8,
  },
  privacyChoiceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
  },
  privacyChoiceText: {
    fontSize: 13,
    fontWeight: '600',
  },
  actionSubmitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 54,
    borderRadius: 14,
    gap: 8,
    marginTop: 4,
  },
  actionSubmitText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
