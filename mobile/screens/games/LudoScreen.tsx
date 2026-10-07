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
  ScrollView,
  Animated,
} from 'react-native';
import Svg, { Rect, Circle, Path, G, Polygon, Text as SvgText } from 'react-native-svg';
import { useTheme } from '../../theme';
import { Icon, StarIcon, TrophyIcon, CrownIcon } from '../../icons';
import { Avatar } from '../../components/atoms/Avatar';
import { GameRulesModal } from '../../components';
import { useAuth } from '../../features/auth/AuthContext';
import { MobileSocketService } from '../../services/socket.service';
import { RoomPlayer, RoomDetails } from '../../services/room.service';
import {
  LudoAction,
  LudoColor,
  LudoPlayerState,
  LudoResult,
  LudoState,
  LudoToken,
} from '../../../shared/game-types';

export interface LudoScreenProps {
  roomCode: string;
  roomDetails?: RoomDetails | null;
  onLeave: () => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BOARD_SIZE = Math.min(SCREEN_WIDTH - 32, 380);
const CELL_SIZE = BOARD_SIZE / 15;

const COLOR_MAP: Record<LudoColor, { primary: string; light: string; border: string }> = {
  RED: { primary: '#FF575F', light: 'rgba(255, 87, 95, 0.18)', border: '#FF575F' },
  GREEN: { primary: '#3ED598', light: 'rgba(62, 213, 152, 0.18)', border: '#3ED598' },
  YELLOW: { primary: '#FFC542', light: 'rgba(255, 197, 66, 0.18)', border: '#FFC542' },
  BLUE: { primary: '#0062FF', light: 'rgba(0, 98, 255, 0.18)', border: '#0062FF' },
};

// 52 track coordinate mapping on a 15x15 Ludo grid
// [x, y] in grid coordinates (0..14)
const TRACK_COORDINATES: [number, number][] = [
  // RED circuit segment: 0..12
  [1, 6], [2, 6], [3, 6], [4, 6], [5, 6], [6, 5], [6, 4], [6, 3], [6, 2], [6, 1], [6, 0], [7, 0], [8, 0],
  // GREEN circuit segment: 13..25
  [8, 1], [8, 2], [8, 3], [8, 4], [8, 5], [9, 6], [10, 6], [11, 6], [12, 6], [13, 6], [14, 6], [14, 7], [14, 8],
  // YELLOW circuit segment: 26..38
  [13, 8], [12, 8], [11, 8], [10, 8], [9, 8], [8, 9], [8, 10], [8, 11], [8, 12], [8, 13], [8, 14], [7, 14], [6, 14],
  // BLUE circuit segment: 39..51
  [6, 13], [6, 12], [6, 11], [6, 10], [6, 9], [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8], [0, 7], [0, 6],
];

// 5 Home Corridor coordinates per color
const HOME_CORRIDORS: Record<LudoColor, [number, number][]> = {
  RED: [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7]],
  GREEN: [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5]],
  YELLOW: [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7]],
  BLUE: [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9]],
};

// Yard 4 base token positions per color (in 15x15 coordinates)
const YARD_TOKEN_SLOTS: Record<LudoColor, [number, number][]> = {
  RED: [[1.5, 1.5], [4.5, 1.5], [1.5, 4.5], [4.5, 4.5]],
  GREEN: [[10.5, 1.5], [13.5, 1.5], [10.5, 4.5], [13.5, 4.5]],
  YELLOW: [[10.5, 10.5], [13.5, 10.5], [10.5, 13.5], [13.5, 13.5]],
  BLUE: [[1.5, 10.5], [4.5, 10.5], [1.5, 13.5], [4.5, 13.5]],
};

// Finish center coordinates per color (step 56)
const FINISH_COORDINATES: Record<LudoColor, [number, number]> = {
  RED: [6.3, 7],
  GREEN: [7, 6.3],
  YELLOW: [7.7, 7],
  BLUE: [7, 7.7],
};

const SAFE_CIRCUIT_CELLS = new Set([0, 8, 13, 21, 26, 34, 39, 47]);

export const LudoScreen: React.FC<LudoScreenProps> = ({
  roomCode,
  roomDetails,
  onLeave,
}) => {
  const { theme } = useTheme();
  const { user } = useAuth();

  // Match state
  const [players, setPlayers] = useState<LudoPlayerState[]>([]);
  const [turnColor, setTurnColor] = useState<LudoColor>('RED');
  const [turnPlayerId, setTurnPlayerId] = useState<string>('');
  const [currentDiceRoll, setCurrentDiceRoll] = useState<number | null>(null);
  const [hasRolled, setHasRolled] = useState<boolean>(false);
  const [consecutiveSixes, setConsecutiveSixes] = useState<number>(0);
  const [validMoves, setValidMoves] = useState<number[]>([]);
  const [winnerIds, setWinnerIds] = useState<string[]>([]);
  const [rankings, setRankings] = useState<{ userId: string; color: LudoColor; rank: number }[]>([]);
  const [round, setRound] = useState<number>(1);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [turnExpiresAt, setTurnExpiresAt] = useState<number>(0);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(20);
  const [isMatchOver, setIsMatchOver] = useState<boolean>(false);

  // Interaction & UI state
  const [isRulesModalVisible, setIsRulesModalVisible] = useState<boolean>(false);
  const [isRolling, setIsRolling] = useState<boolean>(false);
  const [isMoving, setIsMoving] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isRematchModalVisible, setIsRematchModalVisible] = useState<boolean>(false);
  const [rematchRequestedByMe, setRematchRequestedByMe] = useState<boolean>(false);
  const [rematchOfferedByPeer, setRematchOfferedByPeer] = useState<boolean>(false);

  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const diceAnim = useRef(new Animated.Value(0)).current;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const myPlayer = players.find((p) => p.userId === user?.id);
  const isMyTurn = turnPlayerId === user?.id && !isMatchOver;

  // Turn countdown clock
  useEffect(() => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }

    if (turnExpiresAt > 0 && !isMatchOver) {
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
  }, [turnExpiresAt, isMatchOver]);

  const applyStateUpdate = useCallback(
    (
      state: LudoState,
      newRound?: number,
      newScores?: Record<string, number>,
      incomingPlayers?: any[]
    ) => {
      if (!state) return;

      setPlayers(state.players || []);
      setTurnColor(state.turnColor || 'RED');
      setTurnPlayerId(state.turnPlayerId || '');
      setCurrentDiceRoll(state.currentDiceRoll ?? null);
      setHasRolled(!!state.hasRolled);
      setConsecutiveSixes(state.consecutiveSixes || 0);
      setValidMoves(state.validMoves || []);
      setWinnerIds(state.winnerIds || []);
      setTurnExpiresAt(state.turnExpiresAt || 0);

      if (newRound !== undefined) setRound(newRound);
      if (newScores) setScores(newScores);

      // Check if match completed
      const remainingActive = (state.players || []).filter((p) => p.rank === undefined);
      if (remainingActive.length <= 1 && (state.winnerIds || []).length > 0) {
        setIsMatchOver(true);
      }
    },
    []
  );

  // Subscribe to real-time socket events
  useEffect(() => {
    MobileSocketService.connect();
    MobileSocketService.getSocket()?.emit('room:join', { roomCode });

    // Initial state fetch
    MobileSocketService.getGameState(roomCode)
      .then((res) => {
        if (res && res.state) {
          applyStateUpdate(res.state, res.round, res.scores, res.players);
        }
      })
      .catch((err) => console.log('Could not fetch active match:', err));

    // Listen for live broadcasts
    const unsubState = MobileSocketService.onGameState((payload) => {
      if (payload.roomCode === roomCode) {
        applyStateUpdate(payload.state, payload.round, payload.scores);
      }
    });

    const unsubOver = MobileSocketService.onGameOver((payload) => {
      if (payload.roomCode === roomCode) {
        setIsMatchOver(true);
        if (payload.scores) setScores(payload.scores);
        if (payload.rankings) setRankings(payload.rankings);
        setIsRematchModalVisible(true);
      }
    });

    const unsubRematchOffered = MobileSocketService.onRematchOffered((payload) => {
      if (payload.roomCode === roomCode) {
        if (payload.offeredByUserId !== user?.id) {
          setRematchOfferedByPeer(true);
          setIsRematchModalVisible(true);
          showToast('Opponent offered a rematch!');
        }
      }
    });

    const unsubRematchStarted = MobileSocketService.onRematchStarted((payload) => {
      if (payload.roomCode === roomCode) {
        setIsMatchOver(false);
        setIsRematchModalVisible(false);
        setRematchRequestedByMe(false);
        setRematchOfferedByPeer(false);
        if (payload.state) {
          applyStateUpdate(payload.state, payload.round, payload.scores, payload.players);
        }
        showToast(`Rematch Started! Round ${payload.round}`);
      }
    });

    const unsubRematchDeclined = MobileSocketService.onRematchDeclined((payload) => {
      if (payload.roomCode === roomCode) {
        setIsRematchModalVisible(false);
        setRematchRequestedByMe(false);
        setRematchOfferedByPeer(false);
        Alert.alert('Rematch Declined', 'The rematch offer was declined.', [
          { text: 'Return to Lobby', onPress: onLeave },
        ]);
      }
    });

    return () => {
      unsubState();
      unsubOver();
      unsubRematchOffered();
      unsubRematchStarted();
      unsubRematchDeclined();
    };
  }, [roomCode, user?.id, applyStateUpdate, onLeave]);

  // Roll dice action
  const handleRollDice = async () => {
    if (!isMyTurn || hasRolled || isRolling) return;

    setIsRolling(true);
    Animated.sequence([
      Animated.timing(diceAnim, { toValue: 1, duration: 120, useNativeDriver: true }),
      Animated.timing(diceAnim, { toValue: 0, duration: 120, useNativeDriver: true }),
    ]).start();

    try {
      const res = await MobileSocketService.sendGameAction(roomCode, {
        type: 'ROLL_DICE',
      });
      if (res && res.state) {
        applyStateUpdate(res.state);
      }
    } catch (err: any) {
      showToast(err.message || 'Could not roll dice');
    } finally {
      setIsRolling(false);
    }
  };

  // Move token action
  const handleSelectToken = async (tokenId: number) => {
    if (!isMyTurn || !hasRolled || isMoving) return;
    if (!validMoves.includes(tokenId)) {
      showToast(`Token cannot move on roll ${currentDiceRoll}`);
      return;
    }

    setIsMoving(true);
    try {
      const res = await MobileSocketService.sendGameAction(roomCode, {
        type: 'MOVE_TOKEN',
        tokenId,
      });
      if (res && res.state) {
        applyStateUpdate(res.state);
      }
    } catch (err: any) {
      showToast(err.message || 'Could not move token');
    } finally {
      setIsMoving(false);
    }
  };

  // Rematch actions
  const handleRequestRematch = async () => {
    setRematchRequestedByMe(true);
    try {
      await MobileSocketService.requestRematch(roomCode);
      showToast('Rematch requested!');
    } catch (err: any) {
      showToast(err.message || 'Failed to request rematch');
    }
  };

  const handleRespondRematch = async (accept: boolean) => {
    try {
      await MobileSocketService.respondRematch(roomCode, accept);
      if (!accept) onLeave();
    } catch (err: any) {
      showToast(err.message || 'Failed to respond');
    }
  };

  // Helper to resolve token pixel coordinate on the board
  const getTokenPosition = (
    color: LudoColor,
    token: LudoToken
  ): { cx: number; cy: number } => {
    if (token.step === -1) {
      // In yard
      const [gx, gy] = YARD_TOKEN_SLOTS[color][token.id];
      return { cx: gx * CELL_SIZE, cy: gy * CELL_SIZE };
    }

    if (token.step >= 0 && token.step <= 50) {
      // On outer 52 circuit
      const colorOffset = { RED: 0, GREEN: 13, YELLOW: 26, BLUE: 39 }[color];
      const absoluteCell = (colorOffset + token.step) % 52;
      const [gx, gy] = TRACK_COORDINATES[absoluteCell];
      return { cx: (gx + 0.5) * CELL_SIZE, cy: (gy + 0.5) * CELL_SIZE };
    }

    if (token.step >= 51 && token.step <= 55) {
      // In home corridor
      const corridorIndex = token.step - 51;
      const [gx, gy] = HOME_CORRIDORS[color][corridorIndex];
      return { cx: (gx + 0.5) * CELL_SIZE, cy: (gy + 0.5) * CELL_SIZE };
    }

    // Finished (step 56)
    const [gx, gy] = FINISH_COORDINATES[color];
    const offset = (token.id - 1.5) * 3;
    return { cx: (gx + 0.5) * CELL_SIZE + offset, cy: (gy + 0.5) * CELL_SIZE + offset };
  };

  // Render dice face SVG
  const renderDiceFace = (value: number | null) => {
    const size = 52;
    const r = 4;
    const pips: { cx: number; cy: number }[] = [];

    if (value === 1) {
      pips.push({ cx: size / 2, cy: size / 2 });
    } else if (value === 2) {
      pips.push({ cx: size * 0.28, cy: size * 0.28 });
      pips.push({ cx: size * 0.72, cy: size * 0.72 });
    } else if (value === 3) {
      pips.push({ cx: size * 0.28, cy: size * 0.28 });
      pips.push({ cx: size / 2, cy: size / 2 });
      pips.push({ cx: size * 0.72, cy: size * 0.72 });
    } else if (value === 4) {
      pips.push({ cx: size * 0.28, cy: size * 0.28 });
      pips.push({ cx: size * 0.72, cy: size * 0.28 });
      pips.push({ cx: size * 0.28, cy: size * 0.72 });
      pips.push({ cx: size * 0.72, cy: size * 0.72 });
    } else if (value === 5) {
      pips.push({ cx: size * 0.28, cy: size * 0.28 });
      pips.push({ cx: size * 0.72, cy: size * 0.28 });
      pips.push({ cx: size / 2, cy: size / 2 });
      pips.push({ cx: size * 0.28, cy: size * 0.72 });
      pips.push({ cx: size * 0.72, cy: size * 0.72 });
    } else if (value === 6) {
      pips.push({ cx: size * 0.28, cy: size * 0.25 });
      pips.push({ cx: size * 0.72, cy: size * 0.25 });
      pips.push({ cx: size * 0.28, cy: size * 0.5 });
      pips.push({ cx: size * 0.72, cy: size * 0.5 });
      pips.push({ cx: size * 0.28, cy: size * 0.75 });
      pips.push({ cx: size * 0.72, cy: size * 0.75 });
    }

    return (
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Rect
          x={2}
          y={2}
          width={size - 4}
          height={size - 4}
          rx={12}
          fill="#30444E"
          stroke="#3ED598"
          strokeWidth={2}
        />
        {pips.map((p, idx) => (
          <Circle key={idx} cx={p.cx} cy={p.cy} r={r} fill="#FFFFFF" />
        ))}
      </Svg>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle="light-content" />

      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onLeave}>
          <Icon name="chevronLeft" size={24} color={theme.colors.textSecondary} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={[styles.gameTitle, { color: theme.colors.textPrimary }]}>LUDO WORLD</Text>
          <View style={[styles.roomCodePill, { backgroundColor: theme.colors.surfaceElevated }]}>
            <Text style={[styles.roomCodeText, { color: theme.colors.primary }]}>ROOM: {roomCode}</Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: theme.colors.cardTintMint, borderRadius: 12 }]}
            onPress={() => setIsRulesModalVisible(true)}
            activeOpacity={0.7}
            accessibilityLabel="Game Rules & Steps"
          >
            <Icon name="info" size={18} color={theme.colors.primary} />
          </TouchableOpacity>

          <View style={styles.roundBadge}>
            <Text style={styles.roundText}>R{round}</Text>
          </View>
        </View>
      </View>

      {/* Turn Banner & 20s Countdown */}
      <View style={[styles.turnBanner, { backgroundColor: theme.colors.surface }]}>
        <View style={styles.turnInfoRow}>
          <View
            style={[
              styles.turnColorIndicator,
              { backgroundColor: COLOR_MAP[turnColor]?.primary || theme.colors.primary },
            ]}
          />
          <Text style={[styles.turnStatusText, { color: theme.colors.textPrimary }]}>
            {isMyTurn ? "IT'S YOUR TURN!" : `${turnColor}'S TURN`}
          </Text>
          <View style={styles.timerBadge}>
            <Text style={[styles.timerText, { color: secondsRemaining <= 5 ? '#FF575F' : '#3ED598' }]}>
              {secondsRemaining}s
            </Text>
          </View>
        </View>

        {/* Progress Bar */}
        <View style={styles.timerBarTrack}>
          <View
            style={[
              styles.timerBarFill,
              {
                width: `${Math.min(100, (secondsRemaining / 20) * 100)}%`,
                backgroundColor: secondsRemaining <= 5 ? '#FF575F' : '#3ED598',
              },
            ]}
          />
        </View>
      </View>

      {/* Players Corner Status */}
      <View style={styles.playersRow}>
        {players.map((p) => {
          const isTurn = p.userId === turnPlayerId;
          const finishedCount = p.tokens.filter((t) => t.step === 56).length;
          return (
            <View
              key={p.userId}
              style={[
                styles.playerCard,
                { backgroundColor: theme.colors.surface },
                isTurn && { borderColor: COLOR_MAP[p.color].primary, borderWidth: 2 },
              ]}
            >
              <View style={[styles.playerColorDot, { backgroundColor: COLOR_MAP[p.color].primary }]} />
              <Text style={[styles.playerName, { color: theme.colors.textPrimary }]} numberOfLines={1}>
                {p.username}
              </Text>
              <Text style={[styles.playerProgress, { color: theme.colors.textSecondary }]}>
                {finishedCount}/4
              </Text>
            </View>
          );
        })}
      </View>

      {/* Interactive Ludo Board */}
      <ScrollView contentContainerStyle={styles.boardContainer} bounces={false}>
        <View
          style={[
            styles.boardWrapper,
            {
              width: BOARD_SIZE,
              height: BOARD_SIZE,
              backgroundColor: '#2A3C44',
            },
          ]}
        >
          <Svg width={BOARD_SIZE} height={BOARD_SIZE} viewBox={`0 0 ${BOARD_SIZE} ${BOARD_SIZE}`}>
            {/* 4 Corner Yards */}
            {/* RED Yard (Top-Left: 6x6) */}
            <Rect x={0} y={0} width={CELL_SIZE * 6} height={CELL_SIZE * 6} fill={COLOR_MAP.RED.light} stroke={COLOR_MAP.RED.primary} strokeWidth={2} />
            <Rect x={CELL_SIZE} y={CELL_SIZE} width={CELL_SIZE * 4} height={CELL_SIZE * 4} rx={16} fill="#30444E" />

            {/* GREEN Yard (Top-Right: 6x6) */}
            <Rect x={CELL_SIZE * 9} y={0} width={CELL_SIZE * 6} height={CELL_SIZE * 6} fill={COLOR_MAP.GREEN.light} stroke={COLOR_MAP.GREEN.primary} strokeWidth={2} />
            <Rect x={CELL_SIZE * 10} y={CELL_SIZE} width={CELL_SIZE * 4} height={CELL_SIZE * 4} rx={16} fill="#30444E" />

            {/* YELLOW Yard (Bottom-Right: 6x6) */}
            <Rect x={CELL_SIZE * 9} y={CELL_SIZE * 9} width={CELL_SIZE * 6} height={CELL_SIZE * 6} fill={COLOR_MAP.YELLOW.light} stroke={COLOR_MAP.YELLOW.primary} strokeWidth={2} />
            <Rect x={CELL_SIZE * 10} y={CELL_SIZE * 10} width={CELL_SIZE * 4} height={CELL_SIZE * 4} rx={16} fill="#30444E" />

            {/* BLUE Yard (Bottom-Left: 6x6) */}
            <Rect x={0} y={CELL_SIZE * 9} width={CELL_SIZE * 6} height={CELL_SIZE * 6} fill={COLOR_MAP.BLUE.light} stroke={COLOR_MAP.BLUE.primary} strokeWidth={2} />
            <Rect x={CELL_SIZE} y={CELL_SIZE * 10} width={CELL_SIZE * 4} height={CELL_SIZE * 4} rx={16} fill="#30444E" />

            {/* Yard Token Circles */}
            {(['RED', 'GREEN', 'YELLOW', 'BLUE'] as LudoColor[]).map((col) =>
              YARD_TOKEN_SLOTS[col].map(([gx, gy], i) => (
                <Circle
                  key={`${col}_slot_${i}`}
                  cx={gx * CELL_SIZE}
                  cy={gy * CELL_SIZE}
                  r={CELL_SIZE * 0.7}
                  fill="rgba(42, 60, 68, 0.8)"
                  stroke={COLOR_MAP[col].primary}
                  strokeWidth={1.5}
                />
              ))
            )}

            {/* 52 Circuit Track Cells */}
            {TRACK_COORDINATES.map(([gx, gy], idx) => {
              const isSafe = SAFE_CIRCUIT_CELLS.has(idx);
              let cellFill = '#30444E';
              let cellStroke = '#3D505A';

              if (idx === 0) cellFill = COLOR_MAP.RED.primary;
              if (idx === 13) cellFill = COLOR_MAP.GREEN.primary;
              if (idx === 26) cellFill = COLOR_MAP.YELLOW.primary;
              if (idx === 39) cellFill = COLOR_MAP.BLUE.primary;

              return (
                <G key={`track_${idx}`}>
                  <Rect
                    x={gx * CELL_SIZE}
                    y={gy * CELL_SIZE}
                    width={CELL_SIZE}
                    height={CELL_SIZE}
                    fill={cellFill}
                    stroke={cellStroke}
                    strokeWidth={0.8}
                  />
                  {isSafe && idx !== 0 && idx !== 13 && idx !== 26 && idx !== 39 && (
                    <Circle
                      cx={(gx + 0.5) * CELL_SIZE}
                      cy={(gy + 0.5) * CELL_SIZE}
                      r={CELL_SIZE * 0.22}
                      fill="#FFC542"
                    />
                  )}
                </G>
              );
            })}

            {/* Home Corridors */}
            {(['RED', 'GREEN', 'YELLOW', 'BLUE'] as LudoColor[]).map((col) =>
              HOME_CORRIDORS[col].map(([gx, gy], idx) => (
                <Rect
                  key={`corridor_${col}_${idx}`}
                  x={gx * CELL_SIZE}
                  y={gy * CELL_SIZE}
                  width={CELL_SIZE}
                  height={CELL_SIZE}
                  fill={COLOR_MAP[col].primary}
                  stroke="#3D505A"
                  strokeWidth={0.8}
                />
              ))
            )}

            {/* Center Victory Finish Triangle (3x3) */}
            <Polygon
              points={`${CELL_SIZE * 6},${CELL_SIZE * 6} ${CELL_SIZE * 7.5},${CELL_SIZE * 7.5} ${CELL_SIZE * 6},${CELL_SIZE * 9}`}
              fill={COLOR_MAP.RED.primary}
            />
            <Polygon
              points={`${CELL_SIZE * 6},${CELL_SIZE * 6} ${CELL_SIZE * 7.5},${CELL_SIZE * 7.5} ${CELL_SIZE * 9},${CELL_SIZE * 6}`}
              fill={COLOR_MAP.GREEN.primary}
            />
            <Polygon
              points={`${CELL_SIZE * 9},${CELL_SIZE * 6} ${CELL_SIZE * 7.5},${CELL_SIZE * 7.5} ${CELL_SIZE * 9},${CELL_SIZE * 9}`}
              fill={COLOR_MAP.YELLOW.primary}
            />
            <Polygon
              points={`${CELL_SIZE * 6},${CELL_SIZE * 9} ${CELL_SIZE * 7.5},${CELL_SIZE * 7.5} ${CELL_SIZE * 9},${CELL_SIZE * 9}`}
              fill={COLOR_MAP.BLUE.primary}
            />

            {/* Render Tokens */}
            {players.map((player) =>
              player.tokens.map((token) => {
                const pos = getTokenPosition(player.color, token);
                const isSelectable =
                  isMyTurn &&
                  hasRolled &&
                  player.userId === user?.id &&
                  validMoves.includes(token.id);

                return (
                  <G key={`token_${player.color}_${token.id}`}>
                    {/* Glowing ring for movable token */}
                    {isSelectable && (
                      <Circle
                        cx={pos.cx}
                        cy={pos.cy}
                        r={CELL_SIZE * 0.58}
                        fill="rgba(62, 213, 152, 0.35)"
                        stroke="#3ED598"
                        strokeWidth={2}
                      />
                    )}
                    <Circle
                      cx={pos.cx}
                      cy={pos.cy}
                      r={CELL_SIZE * 0.42}
                      fill={COLOR_MAP[player.color].primary}
                      stroke="#FFFFFF"
                      strokeWidth={1.8}
                    />
                    <Circle
                      cx={pos.cx}
                      cy={pos.cy}
                      r={CELL_SIZE * 0.18}
                      fill="#FFFFFF"
                    />
                  </G>
                );
              })
            )}
          </Svg>

          {/* Transparent touch overlays for valid tokens */}
          {isMyTurn &&
            hasRolled &&
            myPlayer?.tokens.map((token) => {
              if (!validMoves.includes(token.id)) return null;
              const pos = getTokenPosition(myPlayer.color, token);
              const touchSize = CELL_SIZE * 1.5;

              return (
                <TouchableOpacity
                  key={`touch_${token.id}`}
                  style={[
                    styles.tokenTouchArea,
                    {
                      left: pos.cx - touchSize / 2,
                      top: pos.cy - touchSize / 2,
                      width: touchSize,
                      height: touchSize,
                    },
                  ]}
                  onPress={() => handleSelectToken(token.id)}
                  activeOpacity={0.6}
                />
              );
            })}
        </View>

        {/* Dice Roller Controls */}
        <View style={[styles.controlsCard, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.diceDisplay}>
            {renderDiceFace(currentDiceRoll)}
          </View>

          <View style={styles.controlsActionContainer}>
            {isMyTurn && !hasRolled ? (
              <TouchableOpacity
                style={[
                  styles.rollButton,
                  { backgroundColor: theme.colors.primary },
                  isRolling && { opacity: 0.7 },
                ]}
                onPress={handleRollDice}
                disabled={isRolling}
              >
                {isRolling ? (
                  <ActivityIndicator color="#18080C" />
                ) : (
                  <>
                    <Icon name="dice" size={24} color="#18080C" />
                    <Text style={styles.rollButtonText}>ROLL DICE</Text>
                  </>
                )}
              </TouchableOpacity>
            ) : isMyTurn && hasRolled ? (
              <View style={styles.instructionBox}>
                <Text style={[styles.instructionText, { color: theme.colors.primary }]}>
                  {validMoves.length > 0
                    ? `TAP A TOKEN (${validMoves.length} MOVABLE)`
                    : 'NO MOVES POSSIBLE'}
                </Text>
              </View>
            ) : (
              <View style={styles.waitingBox}>
                <Text style={[styles.waitingText, { color: theme.colors.textSecondary }]}>
                  Waiting for {turnColor}...
                </Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Toast Banner */}
      {toastMessage && (
        <View style={styles.toastContainer}>
          <Text style={styles.toastText}>{toastMessage}</Text>
        </View>
      )}

      {/* Game Over & Rematch Modal */}
      <Modal visible={isRematchModalVisible} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.trophyIconWrapper}>
              <TrophyIcon size={56} color="#FFC542" />
            </View>

            <Text style={[styles.modalTitle, { color: theme.colors.textPrimary }]}>
              MATCH CONCLUDED!
            </Text>

            {/* Rankings */}
            <View style={styles.rankingsList}>
              {players.map((p, idx) => (
                <View key={p.userId} style={styles.rankingRow}>
                  <View style={styles.rankBadge}>
                    <Text style={styles.rankBadgeText}>#{idx + 1}</Text>
                  </View>
                  <View style={[styles.rankingColorPill, { backgroundColor: COLOR_MAP[p.color].primary }]} />
                  <Text style={[styles.rankingName, { color: theme.colors.textPrimary }]}>
                    {p.username} {p.userId === user?.id ? '(You)' : ''}
                  </Text>
                  <Text style={[styles.rankingScore, { color: theme.colors.textSecondary }]}>
                    {p.tokens.filter((t) => t.step === 56).length}/4 Home
                  </Text>
                </View>
              ))}
            </View>

            {/* Rematch Actions */}
            <View style={styles.modalActions}>
              {rematchOfferedByPeer ? (
                <>
                  <TouchableOpacity
                    style={[styles.modalPrimaryBtn, { backgroundColor: theme.colors.primary }]}
                    onPress={() => handleRespondRematch(true)}
                  >
                    <Text style={styles.modalPrimaryBtnText}>ACCEPT REMATCH</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalSecondaryBtn, { borderColor: theme.colors.border }]}
                    onPress={() => handleRespondRematch(false)}
                  >
                    <Text style={[styles.modalSecondaryBtnText, { color: theme.colors.textSecondary }]}>
                      DECLINE
                    </Text>
                  </TouchableOpacity>
                </>
              ) : rematchRequestedByMe ? (
                <View style={styles.waitingRematchBox}>
                  <ActivityIndicator size="small" color={theme.colors.primary} />
                  <Text style={[styles.waitingRematchText, { color: theme.colors.textSecondary }]}>
                    Waiting for players to accept...
                  </Text>
                </View>
              ) : (
                <>
                  <TouchableOpacity
                    style={[styles.modalPrimaryBtn, { backgroundColor: theme.colors.primary }]}
                    onPress={handleRequestRematch}
                  >
                    <Text style={styles.modalPrimaryBtnText}>PLAY AGAIN</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalSecondaryBtn, { borderColor: theme.colors.border }]}
                    onPress={onLeave}
                  >
                    <Text style={[styles.modalSecondaryBtnText, { color: theme.colors.textSecondary }]}>
                      EXIT TO LOBBY
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </View>
      </Modal>

      <GameRulesModal
        visible={isRulesModalVisible}
        gameType="LUDO"
        gameTitle="Ludo World Arena"
        category="BOARD"
        onClose={() => setIsRulesModalVisible(false)}
      />
    </SafeAreaView>
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
    paddingVertical: 12,
  },
  backButton: {
    padding: 8,
  },
  headerCenter: {
    alignItems: 'center',
  },
  gameTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  roomCodePill: {
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 2,
  },
  roomCodeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  roundBadge: {
    backgroundColor: '#30444E',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  roundText: {
    color: '#FFC542',
    fontWeight: '800',
    fontSize: 12,
  },
  turnBanner: {
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 12,
    marginBottom: 8,
  },
  turnInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  turnColorIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  turnStatusText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  timerBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: '#2A3C44',
  },
  timerText: {
    fontSize: 13,
    fontWeight: '800',
  },
  timerBarTrack: {
    height: 4,
    backgroundColor: '#2A3C44',
    borderRadius: 2,
    overflow: 'hidden',
  },
  timerBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  playersRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  playerCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginHorizontal: 3,
    borderRadius: 12,
  },
  playerColorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  playerName: {
    fontSize: 11,
    fontWeight: '600',
    flex: 1,
  },
  playerProgress: {
    fontSize: 10,
    fontWeight: '700',
    marginLeft: 4,
  },
  boardContainer: {
    alignItems: 'center',
    paddingBottom: 24,
  },
  boardWrapper: {
    borderRadius: 24,
    overflow: 'hidden',
    position: 'relative',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    marginBottom: 16,
  },
  tokenTouchArea: {
    position: 'absolute',
    zIndex: 99,
  },
  controlsCard: {
    width: BOARD_SIZE,
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  diceDisplay: {
    width: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlsActionContainer: {
    flex: 1,
    marginLeft: 16,
  },
  rollButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: 14,
    paddingHorizontal: 16,
  },
  rollButtonText: {
    color: '#18080C',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginLeft: 8,
  },
  instructionBox: {
    height: 52,
    backgroundColor: '#2A3C44',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  instructionText: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  waitingBox: {
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  waitingText: {
    fontSize: 13,
    fontWeight: '600',
  },
  toastContainer: {
    position: 'absolute',
    bottom: 24,
    alignSelf: 'center',
    backgroundColor: 'rgba(24, 8, 12, 0.92)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#3ED598',
    zIndex: 999,
  },
  toastText: {
    color: '#3ED598',
    fontSize: 13,
    fontWeight: '700',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    borderRadius: 25,
    padding: 24,
    alignItems: 'center',
  },
  trophyIconWrapper: {
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 16,
  },
  rankingsList: {
    width: '100%',
    marginBottom: 20,
  },
  rankingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  rankBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#3D505A',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  rankBadgeText: {
    color: '#FFC542',
    fontSize: 11,
    fontWeight: '800',
  },
  rankingColorPill: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  rankingName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
  },
  rankingScore: {
    fontSize: 12,
    fontWeight: '600',
  },
  modalActions: {
    width: '100%',
  },
  modalPrimaryBtn: {
    height: 54,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  modalPrimaryBtnText: {
    color: '#18080C',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  modalSecondaryBtn: {
    height: 54,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSecondaryBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  waitingRematchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  waitingRematchText: {
    marginLeft: 10,
    fontSize: 14,
    fontWeight: '600',
  },
});
