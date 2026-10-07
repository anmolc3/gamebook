import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Modal,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import { useTheme } from '../../theme';
import { Icon, CrossMarkIcon, CircleMarkIcon } from '../../icons';
import { Avatar } from '../../components/atoms/Avatar';
import { GameRulesModal } from '../../components';
import { useAuth } from '../../features/auth/AuthContext';
import { MobileSocketService } from '../../services/socket.service';
import { RoomPlayer, RoomDetails } from '../../services/room.service';

export interface TicTacToeScreenProps {
  roomCode: string;
  roomDetails?: RoomDetails | null;
  onLeave: () => void;
}

export type CellValue = 'X' | 'O' | null;

export const TicTacToeScreen: React.FC<TicTacToeScreenProps> = ({
  roomCode,
  roomDetails,
  onLeave,
}) => {
  const { theme } = useTheme();
  const { user } = useAuth();

  // Match state
  const [board, setBoard] = useState<CellValue[]>(Array(9).fill(null));
  const [turnPlayerId, setTurnPlayerId] = useState<string>('');
  const [players, setPlayers] = useState<{ X: string; O: string }>({ X: '', O: '' });
  const [playerList, setPlayerList] = useState<RoomPlayer[]>(roomDetails?.players || []);
  const [winnerId, setWinnerId] = useState<string | null>(null);
  const [isDraw, setIsDraw] = useState(false);
  const [winningLine, setWinningLine] = useState<number[] | null>(null);
  const [round, setRound] = useState(1);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [turnExpiresAt, setTurnExpiresAt] = useState<number>(0);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(15);

  // Rules & Rematch state
  const [isRulesModalVisible, setIsRulesModalVisible] = useState(false);
  const [isSubmittingMove, setIsSubmittingMove] = useState(false);
  const [isRematchModalVisible, setIsRematchModalVisible] = useState(false);
  const [rematchRequestedByMe, setRematchRequestedByMe] = useState(false);
  const [rematchOfferedByPeer, setRematchOfferedByPeer] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // Sync turn countdown clock
  useEffect(() => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }

    if (turnExpiresAt > 0 && !winnerId && !isDraw) {
      const updateTimer = () => {
        const diffMs = turnExpiresAt - Date.now();
        const secs = Math.max(0, Math.ceil(diffMs / 1000));
        setSecondsRemaining(secs);
      };
      updateTimer();
      countdownIntervalRef.current = setInterval(updateTimer, 500);
    } else {
      setSecondsRemaining(0);
    }

    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, [turnExpiresAt, winnerId, isDraw]);

  // Load and subscribe to authoritative Socket.IO match events
  useEffect(() => {
    MobileSocketService.connect();
    MobileSocketService.getSocket()?.emit('room:join', { roomCode });

    // Initial match state query
    MobileSocketService.getGameState(roomCode)
      .then((res) => {
        if (res && res.state) {
          applyStateUpdate(res.state, res.round, res.scores, res.players);
        }
      })
      .catch(() => {});

    // Listen to authoritative state broadcasts
    const unsubState = MobileSocketService.onGameState((data) => {
      if (data?.state) {
        applyStateUpdate(data.state, data.round, data.scores);
      }
    });

    // Listen to game over announcements
    const unsubGameOver = MobileSocketService.onGameOver((data) => {
      setWinnerId(data.winnerId);
      setIsDraw(!!data.isDraw);
      setWinningLine(data.winningLine || null);
      if (data.scores) setScores(data.scores);
      setIsRematchModalVisible(true);
    });

    // Listen to rematch handshakes
    const unsubRematchOffered = MobileSocketService.onRematchOffered((data) => {
      if (data.offeredByUserId !== user?.id) {
        setRematchOfferedByPeer(true);
        showToast('Opponent challenged you to a rematch!');
      }
    });

    const unsubRematchDeclined = MobileSocketService.onRematchDeclined(() => {
      showToast('Opponent declined the rematch offer.');
      setRematchRequestedByMe(false);
      setRematchOfferedByPeer(false);
    });

    const unsubRematchStarted = MobileSocketService.onRematchStarted((data) => {
      showToast(`Round ${data.round} started! Marks swapped.`);
      setRematchRequestedByMe(false);
      setRematchOfferedByPeer(false);
      setIsRematchModalVisible(false);
      if (data.state) {
        applyStateUpdate(data.state, data.round, data.scores);
      }
    });

    return () => {
      unsubState();
      unsubGameOver();
      unsubRematchOffered();
      unsubRematchDeclined();
      unsubRematchStarted();
    };
  }, [roomCode, user?.id]);

  const applyStateUpdate = (
    state: any,
    nextRound?: number,
    nextScores?: Record<string, number>,
    incomingPlayers?: any[]
  ) => {
    if (state.board) setBoard(state.board);
    if (state.turnPlayerId) setTurnPlayerId(state.turnPlayerId);
    if (state.players) setPlayers(state.players);
    if (state.winnerId !== undefined) setWinnerId(state.winnerId);
    if (state.isDraw !== undefined) setIsDraw(state.isDraw);
    if (state.winningLine !== undefined) setWinningLine(state.winningLine);
    if (state.turnExpiresAt) setTurnExpiresAt(state.turnExpiresAt);
    if (nextRound) setRound(nextRound);
    if (nextScores) setScores(nextScores);
    if (incomingPlayers && incomingPlayers.length >= 2) {
      setPlayerList(incomingPlayers);
    }
  };

  // Cell press handler
  const handleCellPress = async (index: number) => {
    if (board[index] !== null || winnerId || isDraw || isSubmittingMove) {
      return;
    }

    if (turnPlayerId !== user?.id) {
      showToast("It's not your turn!");
      return;
    }

    try {
      setIsSubmittingMove(true);
      await MobileSocketService.sendGameAction(roomCode, { cellIndex: index });
    } catch (err: any) {
      Alert.alert('Move Error', err.message || 'Could not register move');
    } finally {
      setIsSubmittingMove(false);
    }
  };

  // Rematch offer
  const handleRequestRematch = async () => {
    try {
      setRematchRequestedByMe(true);
      await MobileSocketService.requestRematch(roomCode);
      showToast('Rematch requested. Waiting for opponent...');
    } catch (err: any) {
      Alert.alert('Rematch Error', err.message || 'Could not request rematch');
      setRematchRequestedByMe(false);
    }
  };

  // Rematch response
  const handleRespondRematch = async (accept: boolean) => {
    try {
      await MobileSocketService.respondRematch(roomCode, accept);
      if (!accept) {
        setIsRematchModalVisible(false);
        setRematchOfferedByPeer(false);
      }
    } catch (err: any) {
      Alert.alert('Rematch Response Error', err.message || 'Could not respond to rematch');
    }
  };

  // Exit match confirmation
  const handleConfirmExit = () => {
    Alert.alert('Exit Match', 'Are you sure you want to forfeit and leave this match?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Leave',
        style: 'destructive',
        onPress: async () => {
          try {
            await MobileSocketService.forfeitGame(roomCode);
          } catch {}
          onLeave();
        },
      },
    ]);
  };

  // Identifying players
  const playerXId = players.X;
  const playerOId = players.O;
  const isMyTurn = turnPlayerId === user?.id;
  const myMark = players.X === user?.id ? 'X' : players.O === user?.id ? 'O' : null;

  const playerXMeta = playerList.find((p) => p.userId === playerXId);
  const playerOMeta = playerList.find((p) => p.userId === playerOId);

  const playerXName = playerXMeta?.user?.displayName || (playerXId === user?.id ? 'You' : 'Player X');
  const playerOName = playerOMeta?.user?.displayName || (playerOId === user?.id ? 'You' : 'Player O');

  const playerXScore = scores[playerXId] || 0;
  const playerOScore = scores[playerOId] || 0;

  const isIWinner = winnerId === user?.id;
  const isILoser = winnerId !== null && winnerId !== user?.id;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle={theme.mode === 'dark' ? 'light-content' : 'dark-content'} />

      {/* Marvie Top Game Header */}
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity
          onPress={handleConfirmExit}
          style={[styles.headerIconBtn, { backgroundColor: theme.colors.surfaceElevated }]}
          activeOpacity={0.7}
        >
          <Icon name="chevronLeft" size={20} color={theme.colors.textPrimary} />
        </TouchableOpacity>

        <View style={styles.headerTitleContainer}>
          <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>
            Tic-Tac-Toe Arena
          </Text>
          <View style={styles.headerPillsRow}>
            <View style={[styles.headerPill, { backgroundColor: theme.colors.surfaceElevated }]}>
              <Text style={[styles.headerPillText, { color: theme.colors.textSecondary }]}>
                ROOM: {roomCode}
              </Text>
            </View>
            <View style={[styles.headerPill, { backgroundColor: theme.colors.cardTintMint }]}>
              <Text style={[styles.headerPillText, { color: theme.colors.primary }]}>
                ROUND {round}
              </Text>
            </View>
          </View>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <TouchableOpacity
            onPress={() => setIsRulesModalVisible(true)}
            style={[styles.headerIconBtn, { backgroundColor: theme.colors.cardTintMint }]}
            activeOpacity={0.7}
            accessibilityLabel="Game Rules & Info"
          >
            <Icon name="info" size={18} color={theme.colors.primary} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleConfirmExit}
            style={[styles.headerIconBtn, { backgroundColor: theme.colors.surfaceElevated }]}
            activeOpacity={0.7}
          >
            <Icon name="close" size={18} color={theme.colors.textMuted} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Toast Alert */}
      {toastMessage && (
        <View
          style={[
            styles.toast,
            { backgroundColor: theme.colors.surfaceElevated, borderColor: theme.colors.primary },
            theme.shadows.card,
          ]}
        >
          <Icon name="check" size={16} color={theme.colors.primary} />
          <Text style={[styles.toastText, { color: theme.colors.textPrimary }]}>
            {toastMessage}
          </Text>
        </View>
      )}

      {/* Live Players Scoreboard (Marvie 2-Column Split Cards) */}
      <View style={styles.scoreboardSection}>
        {/* Player X Card */}
        <View
          style={[
            styles.playerCard,
            {
              backgroundColor: theme.colors.surface,
              borderColor:
                turnPlayerId === playerXId
                  ? theme.colors.primary
                  : theme.colors.border,
            },
            turnPlayerId === playerXId && theme.shadows.card,
          ]}
        >
          <View style={styles.playerCardHeader}>
            <View style={[styles.markBadge, { backgroundColor: theme.colors.cardTintMint }]}>
              <CrossMarkIcon size={16} color={theme.colors.primary} strokeWidth={3} />
            </View>
            <View style={styles.scorePill}>
              <Text style={[styles.scoreText, { color: theme.colors.textPrimary }]}>
                {playerXScore}
              </Text>
            </View>
          </View>

          <Avatar
            displayName={playerXName}
            avatarUrl={playerXMeta?.user?.avatarUrl}
            size="md"
          />

          <Text
            numberOfLines={1}
            style={[styles.playerName, { color: theme.colors.textPrimary }]}
          >
            {playerXName}
          </Text>

          {turnPlayerId === playerXId && !winnerId && !isDraw && (
            <View style={[styles.activeTurnPill, { backgroundColor: theme.colors.primary }]}>
              <Text style={[styles.activeTurnText, { color: theme.colors.textOnPrimary }]}>
                TURNING
              </Text>
            </View>
          )}
        </View>

        {/* VS Center Divider */}
        <View style={styles.vsBadge}>
          <Text style={[styles.vsText, { color: theme.colors.textMuted }]}>VS</Text>
        </View>

        {/* Player O Card */}
        <View
          style={[
            styles.playerCard,
            {
              backgroundColor: theme.colors.surface,
              borderColor:
                turnPlayerId === playerOId
                  ? theme.colors.accentAmber
                  : theme.colors.border,
            },
            turnPlayerId === playerOId && theme.shadows.card,
          ]}
        >
          <View style={styles.playerCardHeader}>
            <View style={[styles.markBadge, { backgroundColor: theme.colors.cardTintAmber }]}>
              <CircleMarkIcon size={16} color={theme.colors.accentAmber} strokeWidth={3} />
            </View>
            <View style={styles.scorePill}>
              <Text style={[styles.scoreText, { color: theme.colors.textPrimary }]}>
                {playerOScore}
              </Text>
            </View>
          </View>

          <Avatar
            displayName={playerOName}
            avatarUrl={playerOMeta?.user?.avatarUrl}
            size="md"
          />

          <Text
            numberOfLines={1}
            style={[styles.playerName, { color: theme.colors.textPrimary }]}
          >
            {playerOName}
          </Text>

          {turnPlayerId === playerOId && !winnerId && !isDraw && (
            <View style={[styles.activeTurnPill, { backgroundColor: theme.colors.accentAmber }]}>
              <Text style={[styles.activeTurnText, { color: '#1F2E35' }]}>
                TURNING
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Active Turn & 15-Second Timer Banner */}
      <View style={styles.turnBannerContainer}>
        <View
          style={[
            styles.turnBanner,
            {
              backgroundColor: isMyTurn
                ? theme.colors.cardTintMint
                : theme.colors.surfaceElevated,
              borderColor: isMyTurn ? theme.colors.primary : theme.colors.border,
            },
          ]}
        >
          <View style={styles.turnBannerLeft}>
            <View
              style={[
                styles.turnDot,
                {
                  backgroundColor: isMyTurn
                    ? theme.colors.primary
                    : theme.colors.accentAmber,
                },
              ]}
            />
            <Text style={[styles.turnBannerText, { color: theme.colors.textPrimary }]}>
              {winnerId || isDraw
                ? 'Match Concluded'
                : isMyTurn
                ? `Your Turn (Mark ${myMark})`
                : `Waiting for Opponent (${turnPlayerId === playerXId ? playerXName : playerOName})...`}
            </Text>
          </View>

          {!winnerId && !isDraw && (
            <View
              style={[
                styles.clockPill,
                {
                  backgroundColor:
                    secondsRemaining <= 4
                      ? theme.colors.accentCoral + '30'
                      : theme.colors.surface,
                },
              ]}
            >
              <Icon
                name="target"
                size={14}
                color={secondsRemaining <= 4 ? theme.colors.accentCoral : theme.colors.primary}
              />
              <Text
                style={[
                  styles.clockText,
                  {
                    color:
                      secondsRemaining <= 4
                        ? theme.colors.accentCoral
                        : theme.colors.textPrimary,
                  },
                ]}
              >
                {secondsRemaining}s
              </Text>
            </View>
          )}
        </View>

        {/* 15s Progress Track */}
        {!winnerId && !isDraw && (
          <View style={[styles.timerTrack, { backgroundColor: theme.colors.border }]}>
            <View
              style={[
                styles.timerFill,
                {
                  width: `${Math.min(100, (secondsRemaining / 15) * 100)}%`,
                  backgroundColor:
                    secondsRemaining <= 4
                      ? theme.colors.accentCoral
                      : theme.colors.primary,
                },
              ]}
            />
          </View>
        )}
      </View>

      {/* 3x3 Interactive Grid (Marvie Rounded Grid Containers) */}
      <View style={styles.gridContainer}>
        <View
          style={[
            styles.gridBoard,
            {
              backgroundColor: theme.colors.surfaceElevated,
              borderColor: theme.colors.border,
            },
            theme.shadows.card,
          ]}
        >
          {board.map((cell, index) => {
            const isWinningCell = winningLine && winningLine.includes(index);

            return (
              <TouchableOpacity
                key={index}
                style={[
                  styles.cell,
                  {
                    backgroundColor: isWinningCell
                      ? theme.colors.cardTintMint
                      : theme.colors.surface,
                    borderColor: isWinningCell
                      ? theme.colors.primary
                      : theme.colors.border,
                  },
                ]}
                activeOpacity={cell === null && isMyTurn ? 0.6 : 1}
                disabled={cell !== null || !isMyTurn || !!winnerId || isDraw || isSubmittingMove}
                onPress={() => handleCellPress(index)}
              >
                {cell === 'X' && (
                  <CrossMarkIcon
                    size={48}
                    color={isWinningCell ? theme.colors.primary : theme.colors.primary}
                    strokeWidth={4.5}
                  />
                )}
                {cell === 'O' && (
                  <CircleMarkIcon
                    size={48}
                    color={isWinningCell ? theme.colors.accentAmber : theme.colors.accentAmber}
                    strokeWidth={4.5}
                  />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Match Result Overlay Modal (Marvie 25px Dialog) */}
      <Modal
        visible={isRematchModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsRematchModalVisible(false)}
      >
        <View style={[styles.modalBackdrop, { backgroundColor: theme.colors.backdrop }]}>
          <View
            style={[
              styles.dialogCard,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
              },
              theme.shadows.modal,
            ]}
          >
            {/* Trophy or Draw Icon Header */}
            <View
              style={[
                styles.outcomeIconCircle,
                {
                  backgroundColor: isDraw
                    ? theme.colors.cardTintAmber
                    : isIWinner
                    ? theme.colors.cardTintMint
                    : theme.colors.cardTintCoral,
                },
              ]}
            >
              <Icon
                name={isDraw ? 'refresh' : isIWinner ? 'trophy' : 'close'}
                size={32}
                color={
                  isDraw
                    ? theme.colors.accentAmber
                    : isIWinner
                    ? theme.colors.primary
                    : theme.colors.accentCoral
                }
              />
            </View>

            <Text style={[styles.outcomeTitle, { color: theme.colors.textPrimary }]}>
              {isDraw ? 'Draw Game!' : isIWinner ? 'VICTORY!' : 'Match Defeat'}
            </Text>

            <Text style={[styles.outcomeSubtitle, { color: theme.colors.textSecondary }]}>
              {isDraw
                ? 'Both players fought with precision. No winner declared.'
                : isIWinner
                ? 'Flawless strategy! Match recorded in your lifetime statistics.'
                : 'Hard fought battle. Challenge your opponent to an instant rematch!'}
            </Text>

            {/* Score Summary Box */}
            <View
              style={[
                styles.outcomeScoreBox,
                { backgroundColor: theme.colors.surfaceElevated, borderColor: theme.colors.border },
              ]}
            >
              <View style={styles.scoreRow}>
                <Text style={[styles.scoreLabel, { color: theme.colors.textSecondary }]}>
                  {playerXName} (X)
                </Text>
                <Text style={[styles.scoreVal, { color: theme.colors.primary }]}>
                  {playerXScore} Wins
                </Text>
              </View>
              <View style={[styles.scoreDivider, { backgroundColor: theme.colors.border }]} />
              <View style={styles.scoreRow}>
                <Text style={[styles.scoreLabel, { color: theme.colors.textSecondary }]}>
                  {playerOName} (O)
                </Text>
                <Text style={[styles.scoreVal, { color: theme.colors.accentAmber }]}>
                  {playerOScore} Wins
                </Text>
              </View>
            </View>

            {/* Peer Rematch Offer Alert */}
            {rematchOfferedByPeer && (
              <View
                style={[
                  styles.rematchBanner,
                  { backgroundColor: theme.colors.cardTintMint, borderColor: theme.colors.primary },
                ]}
              >
                <Icon name="refresh" size={16} color={theme.colors.primary} />
                <Text style={[styles.rematchBannerText, { color: theme.colors.primary }]}>
                  Opponent wants a rematch! Accept to swap marks.
                </Text>
              </View>
            )}

            {/* Actions */}
            <View style={styles.dialogActions}>
              {rematchOfferedByPeer ? (
                <TouchableOpacity
                  onPress={() => handleRespondRematch(true)}
                  style={[styles.primaryBtn, { backgroundColor: theme.colors.primary }]}
                  activeOpacity={0.82}
                >
                  <Icon name="refresh" size={18} color={theme.colors.textOnPrimary} />
                  <Text style={[styles.primaryBtnText, { color: theme.colors.textOnPrimary }]}>
                    Accept Rematch
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  onPress={handleRequestRematch}
                  disabled={rematchRequestedByMe}
                  style={[
                    styles.primaryBtn,
                    {
                      backgroundColor: rematchRequestedByMe
                        ? theme.colors.surfaceElevated
                        : theme.colors.primary,
                    },
                  ]}
                  activeOpacity={0.82}
                >
                  <Icon
                    name="refresh"
                    size={18}
                    color={
                      rematchRequestedByMe
                        ? theme.colors.textMuted
                        : theme.colors.textOnPrimary
                    }
                  />
                  <Text
                    style={[
                      styles.primaryBtnText,
                      {
                        color: rematchRequestedByMe
                          ? theme.colors.textMuted
                          : theme.colors.textOnPrimary,
                      },
                    ]}
                  >
                    {rematchRequestedByMe ? 'Waiting for Opponent...' : 'Request Rematch'}
                  </Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                onPress={onLeave}
                style={[
                  styles.secondaryBtn,
                  {
                    backgroundColor: theme.colors.surfaceElevated,
                    borderColor: theme.colors.border,
                  },
                ]}
                activeOpacity={0.7}
              >
                <Text style={[styles.secondaryBtnText, { color: theme.colors.textPrimary }]}>
                  Return to Lobby
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <GameRulesModal
        visible={isRulesModalVisible}
        gameType="TICTACTOE"
        onClose={() => setIsRulesModalVisible(false)}
      />
    </SafeAreaView>
  );
};

const { width } = Dimensions.get('window');
const GRID_SIZE = Math.min(width - 48, 340);
const CELL_SIZE = (GRID_SIZE - 28) / 3;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleContainer: {
    alignItems: 'center',
    gap: 4,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  headerPillsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  headerPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  headerPillText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  toast: {
    position: 'absolute',
    top: 75,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
    zIndex: 99,
  },
  toastText: {
    fontSize: 13,
    fontWeight: '600',
  },
  scoreboardSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    marginTop: 16,
    gap: 12,
  },
  playerCard: {
    flex: 1,
    borderRadius: 22,
    borderWidth: 1.5,
    padding: 14,
    alignItems: 'center',
    gap: 8,
  },
  playerCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    alignItems: 'center',
  },
  markBadge: {
    width: 28,
    height: 28,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scorePill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  scoreText: {
    fontSize: 16,
    fontWeight: '800',
  },
  playerName: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 2,
  },
  activeTurnPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 2,
  },
  activeTurnText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  vsBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  vsText: {
    fontSize: 12,
    fontWeight: '800',
  },
  turnBannerContainer: {
    paddingHorizontal: 20,
    marginTop: 18,
    gap: 6,
  },
  turnBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  turnBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  turnDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  turnBannerText: {
    fontSize: 13,
    fontWeight: '700',
  },
  clockPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  clockText: {
    fontSize: 12,
    fontWeight: '800',
  },
  timerTrack: {
    height: 3,
    borderRadius: 2,
    overflow: 'hidden',
  },
  timerFill: {
    height: '100%',
    borderRadius: 2,
  },
  gridContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  gridBoard: {
    width: GRID_SIZE,
    height: GRID_SIZE,
    borderRadius: 25,
    borderWidth: 1.5,
    padding: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignContent: 'space-between',
  },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    borderRadius: 18,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dialogCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 25,
    borderWidth: 1.5,
    padding: 24,
    alignItems: 'center',
    gap: 14,
  },
  outcomeIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    justifyContent: 'center',
    alignItems: 'center',
  },
  outcomeTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  outcomeSubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 12,
  },
  outcomeScoreBox: {
    width: '100%',
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 8,
    marginVertical: 4,
  },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scoreLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  scoreVal: {
    fontSize: 14,
    fontWeight: '700',
  },
  scoreDivider: {
    height: 1,
  },
  rematchBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
    width: '100%',
  },
  rematchBannerText: {
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
  },
  dialogActions: {
    width: '100%',
    gap: 10,
    marginTop: 6,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 54,
    borderRadius: 14,
    gap: 8,
  },
  primaryBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 54,
    borderRadius: 14,
    borderWidth: 1,
  },
  secondaryBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
