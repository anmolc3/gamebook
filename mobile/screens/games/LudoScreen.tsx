import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Modal,
  ActivityIndicator,
  Alert,
  Dimensions,
  ScrollView,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, {
  Rect,
  Circle,
  Polygon,
  G,
  Defs,
  RadialGradient,
  LinearGradient as SvgLinearGradient,
  Path,
  Stop,
} from 'react-native-svg';
import { useTheme } from '../../theme';
import { Icon, TrophyIcon } from '../../icons';
import { Avatar } from '../../components/atoms/Avatar';
import { GameRulesModal } from '../../components';
import { useAuth } from '../../features/auth/AuthContext';
import { MobileSocketService } from '../../services/socket.service';
import { RoomDetails } from '../../services/room.service';
import { ProfileService, UserProfile } from '../../services/profile.service';
import { SoundService } from '../../services/sound.service';
import {
  LudoColor,
  LudoPlayerState,
  LudoState,
  LudoToken,
} from '../../../shared/game-types';

export interface LudoScreenProps {
  roomCode: string;
  roomDetails?: RoomDetails | null;
  onLeave: () => void;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const BOARD_SIZE = Math.min(SCREEN_WIDTH - 24, Math.max(320, SCREEN_HEIGHT * 0.48), 400);
const CELL_SIZE = BOARD_SIZE / 15;

const COLOR_MAP: Record<LudoColor, { primary: string; light: string; text: string }> = {
  RED: { primary: '#EF4444', light: '#2B1218', text: '#EF4444' },
  GREEN: { primary: '#10B981', light: '#0D2A1F', text: '#10B981' },
  YELLOW: { primary: '#F59E0B', light: '#2E2209', text: '#F59E0B' },
  BLUE: { primary: '#2563EB', light: '#0D1E3A', text: '#2563EB' },
};

// 52 track coordinate mapping on a 15x15 Ludo grid
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

// Yard 4 base token positions per color
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

function getStarPoints(
  centerX: number,
  centerY: number,
  points: number,
  outerRadius: number,
  innerRadius: number
): string {
  const step = Math.PI / points;
  let angle = -Math.PI / 2;
  const coords: string[] = [];
  for (let i = 0; i < 2 * points; i++) {
    const r = i % 2 === 0 ? outerRadius : innerRadius;
    coords.push(`${centerX + r * Math.cos(angle)},${centerY + r * Math.sin(angle)}`);
    angle += step;
  }
  return coords.join(' ');
}

// Refined 3D-styled pawn token with rounded sphere head, collar, flared base and shadow
const LudoPawn3D: React.FC<{
  color: LudoColor;
  size: number;
  isSelectable: boolean;
}> = ({ color, size, isSelectable }) => {
  const colorMeta = COLOR_MAP[color];
  const primary = colorMeta.primary;
  const highlight =
    color === 'YELLOW' ? '#FEF08A' : color === 'GREEN' ? '#A7F3D0' : color === 'BLUE' ? '#BFDBFE' : '#FECDD3';
  const shadow =
    color === 'YELLOW' ? '#92400E' : color === 'GREEN' ? '#065F46' : color === 'BLUE' ? '#1E3A8A' : '#991B1B';

  return (
    <View style={{ width: size, height: size * 1.15, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size * 1.15} viewBox="0 0 40 46">
        <Defs>
          <RadialGradient id={`headGrad_${color}`} cx="35%" cy="30%" r="65%">
            <Stop offset="0%" stopColor={highlight} />
            <Stop offset="45%" stopColor={primary} />
            <Stop offset="100%" stopColor={shadow} />
          </RadialGradient>
          <SvgLinearGradient id={`bodyGrad_${color}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={highlight} />
            <Stop offset="35%" stopColor={primary} />
            <Stop offset="100%" stopColor={shadow} />
          </SvgLinearGradient>
        </Defs>

        {/* Drop Shadow on board */}
        <Circle cx="20" cy="42" r="14" fill="rgba(0,0,0,0.4)" scaleY={0.35} />

        {/* Flared Base */}
        <Path
          d="M8 40 C8 36, 13 35, 15 33 L25 33 C27 35, 32 36, 32 40 C32 43, 8 43, 8 40 Z"
          fill={`url(#bodyGrad_${color})`}
        />

        {/* Waist / Body Cone */}
        <Path d="M15 33 L16 23 C16 21, 24 21, 24 23 L25 33 Z" fill={`url(#bodyGrad_${color})`} />

        {/* Collar Ring */}
        <Rect x="14" y="21" width="12" height="3" rx="1.5" fill={primary} stroke={highlight} strokeWidth="0.6" />

        {/* Spherical Head */}
        <Circle cx="20" cy="12" r="9.5" fill={`url(#headGrad_${color})`} />
        {/* Specular Glint */}
        <Circle cx="17.5" cy="9.5" r="3" fill="#FFFFFF" opacity={0.65} />
      </Svg>

      {/* Selectable Pulsing Indicator Halo */}
      {isSelectable && (
        <View
          style={{
            position: 'absolute',
            width: size * 1.25,
            height: size * 1.25,
            borderRadius: (size * 1.25) / 2,
            borderWidth: 2.2,
            borderColor: '#FFFFFF',
            shadowColor: '#FFFFFF',
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.95,
            shadowRadius: 6,
            elevation: 8,
          }}
        />
      )}
    </View>
  );
};

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
  const [validMoves, setValidMoves] = useState<number[]>([]);
  const [winnerIds, setWinnerIds] = useState<string[]>([]);
  const [rankings, setRankings] = useState<{ userId: string; color: LudoColor; rank: number }[]>([]);
  const [round, setRound] = useState<number>(1);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [turnExpiresAt, setTurnExpiresAt] = useState<number>(0);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(20);
  const [isMatchOver, setIsMatchOver] = useState<boolean>(false);

  // UI & Animation State
  const [isRulesModalVisible, setIsRulesModalVisible] = useState<boolean>(false);
  const [isRolling, setIsRolling] = useState<boolean>(false);
  const [isMoving, setIsMoving] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isRematchModalVisible, setIsRematchModalVisible] = useState<boolean>(false);
  const [rematchRequestedByMe, setRematchRequestedByMe] = useState<boolean>(false);
  const [rematchOfferedByPeer, setRematchOfferedByPeer] = useState<boolean>(false);
  const [isChatModalVisible, setIsChatModalVisible] = useState<boolean>(false);
  const [isReactionPickerVisible, setIsReactionPickerVisible] = useState<boolean>(false);
  const [activeFloatingReaction, setActiveFloatingReaction] = useState<string | null>(null);

  // Player Stats Popup Modal
  const [selectedPlayerForStats, setSelectedPlayerForStats] = useState<LudoPlayerState | null>(null);
  const [playerProfileStats, setPlayerProfileStats] = useState<UserProfile | null>(null);
  const [isLoadingPlayerStats, setIsLoadingPlayerStats] = useState<boolean>(false);

  // Dice roll visual shuffling & animation
  const [diceVisualFace, setDiceVisualFace] = useState<number>(currentDiceRoll || 1);
  const diceAnimRotate = useRef(new Animated.Value(0)).current;
  const diceAnimScale = useRef(new Animated.Value(1)).current;
  const rollIntervalRef = useRef<any>(null);

  // Token animated positions map: key = `${color}_${tokenId}`
  const tokenAnimsRef = useRef<
    Record<
      string,
      {
        pos: Animated.ValueXY;
        scale: Animated.Value;
      }
    >
  >({});

  const countdownIntervalRef = useRef<any>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const myPlayer = players.find((p) => p.userId === user?.id);
  const isMyTurn = turnPlayerId === user?.id && !isMatchOver;
  const prevIsMyTurnRef = useRef<boolean>(false);
  const prevPlayersRef = useRef<LudoPlayerState[]>([]);
  const prevDiceRollRef = useRef<number | null>(null);
  const localRollPendingRef = useRef<boolean>(false);

  // Initialize sound engine on mount
  useEffect(() => {
    SoundService.init();
  }, []);

  // Sound effect: Gentle ping when turn shifts to current user (delayed until previous move completely finishes)
  useEffect(() => {
    if (isMyTurn && !prevIsMyTurnRef.current) {
      const timer = setTimeout(() => {
        SoundService.play('turnPing');
      }, 800);
      return () => clearTimeout(timer);
    }
    prevIsMyTurnRef.current = isMyTurn;
  }, [isMyTurn]);

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

      const oldPlayers = prevPlayersRef.current;
      const newPlayers = state.players || [];

      // Audio checks: detect token capture, opening from yard, and home finishes
      if (oldPlayers.length > 0 && newPlayers.length > 0) {
        let hasCapture = false;
        let hasHome = false;
        let hasOpen = false;
        let hasMove = false;

        newPlayers.forEach((newP) => {
          const oldP = oldPlayers.find((p) => p.userId === newP.userId);
          if (oldP) {
            newP.tokens.forEach((newToken) => {
              const oldToken = oldP.tokens.find((t) => t.id === newToken.id);
              if (oldToken && oldToken.step !== newToken.step) {
                // Token stepped out of yard (-1) onto track (0) -> token open fanfare!
                if (oldToken.step === -1 && newToken.step === 0) {
                  hasOpen = true;
                } else if (oldToken.step < 56 && newToken.step === 56) {
                  // Token entered center home (56) -> home goal fanfare!
                  hasHome = true;
                } else if (oldToken.step >= 0 && newToken.step >= 0) {
                  // Normal move along track
                  hasMove = true;
                }
              }
              // Opponent token captured back to yard
              if (oldToken && oldToken.step >= 0 && newToken.step === -1) {
                hasCapture = true;
              }
            });
          }
        });

        // 1. Token opening from yard -> fanfare plays immediately as token pops out
        if (hasOpen) {
          SoundService.play('tokenOpen');
        } else if (hasMove || hasCapture || hasHome) {
          // 2. Token step sound plays as pawn begins movement
          SoundService.play('tokenMove');
        }

        // 3. Capture sound: plays at 550ms right when the moving token lands on the captured victim
        if (hasCapture) {
          setTimeout(() => {
            SoundService.play('tokenCapture');
          }, 550);
        }

        // 4. Home finish sound: plays at 600ms right when the pawn enters the center home triangle
        if (hasHome) {
          setTimeout(() => {
            SoundService.play('homeGoal');
          }, 600);
        }
      }

      prevPlayersRef.current = newPlayers;
      setPlayers(newPlayers);

      setTurnColor(state.turnColor || 'RED');
      setTurnPlayerId(state.turnPlayerId || '');
      setCurrentDiceRoll(state.currentDiceRoll ?? null);
      if (state.currentDiceRoll) {
        setDiceVisualFace(state.currentDiceRoll);
      }
      setHasRolled(!!state.hasRolled);
      setValidMoves(state.validMoves || []);
      setWinnerIds(state.winnerIds || []);
      setTurnExpiresAt(state.turnExpiresAt || 0);

      if (newRound !== undefined) setRound(newRound);
      if (newScores) setScores(newScores);

      const remainingActive = (state.players || []).filter((p) => p.rank === undefined);
      if (remainingActive.length <= 1 && (state.winnerIds || []).length > 0) {
        setIsMatchOver(true);
      }
    },
    []
  );

  // Subscribe to socket events
  useEffect(() => {
    MobileSocketService.connect();
    MobileSocketService.getSocket()?.emit('room:join', { roomCode });

    MobileSocketService.getGameState(roomCode)
      .then((res) => {
        if (res && res.state) {
          applyStateUpdate(res.state, res.round, res.scores, res.players);
        }
      })
      .catch((err) => console.log('Could not fetch active match:', err));

    const unsubState = MobileSocketService.onGameState((payload) => {
      if (payload.roomCode === roomCode && payload.state) {
        const state = payload.state;
        const isOpponent = state.turnPlayerId !== user?.id;

        // Check for opponent dice roll events (state.currentDiceRoll or events)
        const rollEvent = (payload.events || []).find(
          (e: any) => e.type === 'ludo:dice_rolled' || e.type === 'ludo:no_moves_available'
        );
        const opponentRolled =
          (state.hasRolled && state.currentDiceRoll && state.currentDiceRoll !== prevDiceRollRef.current) ||
          (rollEvent && rollEvent.data?.playerId !== user?.id);

        if (opponentRolled && isOpponent) {
          const rollVal = state.currentDiceRoll || rollEvent?.data?.roll;
          prevDiceRollRef.current = rollVal;
          triggerDiceWobble(rollVal);
          SoundService.play('diceRoll');
          if (rollEvent?.type === 'ludo:no_moves_available') {
            showToast(`Opponent rolled ${rollVal} (No moves)`);
          }
        } else if (!state.hasRolled && !rollEvent) {
          prevDiceRollRef.current = null;
        }

        if (!isOpponent) {
          localRollPendingRef.current = false;
        }

        applyStateUpdate(payload.state, payload.round, payload.scores);
      }
    });

    const unsubOver = MobileSocketService.onGameOver((payload) => {
      if (payload.roomCode === roomCode) {
        setIsMatchOver(true);
        if (payload.scores) setScores(payload.scores);
        if (payload.rankings) setRankings(payload.rankings);
        setIsRematchModalVisible(true);
        setTimeout(() => {
          SoundService.play('gameOver');
        }, 1100);
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

  // Dice visual rolling animation
  const triggerDiceWobble = (finalValue?: number) => {
    // 3D rotation & scale bounce
    Animated.sequence([
      Animated.parallel([
        Animated.timing(diceAnimRotate, { toValue: 1, duration: 140, useNativeDriver: true }),
        Animated.timing(diceAnimScale, { toValue: 1.25, duration: 140, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(diceAnimRotate, { toValue: -1, duration: 140, useNativeDriver: true }),
        Animated.timing(diceAnimScale, { toValue: 0.9, duration: 140, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(diceAnimRotate, { toValue: 0.5, duration: 120, useNativeDriver: true }),
        Animated.spring(diceAnimScale, { toValue: 1, friction: 3, tension: 40, useNativeDriver: true }),
      ]),
      Animated.timing(diceAnimRotate, { toValue: 0, duration: 100, useNativeDriver: true }),
    ]).start();

    if (finalValue) {
      setDiceVisualFace(finalValue);
    }
  };

  // Roll dice action
  const handleRollDice = async () => {
    if (!isMyTurn || hasRolled || isRolling) return;

    localRollPendingRef.current = true;
    SoundService.play('diceRoll');
    setIsRolling(true);

    // Rapidly change visual face during roll
    let rollTicks = 0;
    if (rollIntervalRef.current) clearInterval(rollIntervalRef.current);
    rollIntervalRef.current = setInterval(() => {
      setDiceVisualFace(Math.floor(Math.random() * 6) + 1);
      rollTicks++;
      if (rollTicks > 12) {
        if (rollIntervalRef.current) clearInterval(rollIntervalRef.current);
      }
    }, 50);

    triggerDiceWobble();

    try {
      const res = await MobileSocketService.sendGameAction(roomCode, {
        type: 'ROLL_DICE',
      });
      if (res && res.state) {
        if (rollIntervalRef.current) clearInterval(rollIntervalRef.current);
        const finalVal =
          res.state.currentDiceRoll ??
          (res.events?.find((e: any) => e.type === 'ludo:no_moves_available')?.data?.roll ?? null);
        if (finalVal) {
          setDiceVisualFace(finalVal);
          prevDiceRollRef.current = finalVal;
        }
        applyStateUpdate(res.state);
      }
    } catch (err: any) {
      if (rollIntervalRef.current) clearInterval(rollIntervalRef.current);
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

  // Auto-move when there is only 1 valid move available (eliminates touch hunt friction)
  useEffect(() => {
    if (isMyTurn && hasRolled && validMoves.length === 1 && !isMoving) {
      const autoMoveTimer = setTimeout(() => {
        handleSelectToken(validMoves[0]);
      }, 400);
      return () => clearTimeout(autoMoveTimer);
    }
  }, [isMyTurn, hasRolled, validMoves, isMoving]);

  // Open stats popup for player
  const handleOpenPlayerStats = async (p: LudoPlayerState) => {
    setSelectedPlayerForStats(p);
    setIsLoadingPlayerStats(true);
    setPlayerProfileStats(null);

    try {
      if (p.userId && !p.userId.startsWith('BOT_')) {
        const profile = await ProfileService.fetchUserProfile(p.userId);
        setPlayerProfileStats(profile);
      } else {
        // AI Bot fallback stats
        setPlayerProfileStats({
          id: p.userId,
          username: p.username,
          displayName: p.username,
          bio: 'Autonomous Game AI Tactician with real-time heuristic move planning.',
          avatarUrl: null,
          isOnline: true,
          lastSeen: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          stats: {
            totalMatches: 84,
            matchesPlayed: 84,
            totalWins: 51,
            matchesWon: 51,
            totalLosses: 33,
            matchesLost: 33,
            winRate: 61,
            highestStreak: 7,
            friendsCount: 0,
          },
          achievements: [],
          isOwnProfile: false,
          relationship: 'NONE',
        });
      }
    } catch {
      // Graceful fallback if offline or request fails
      setPlayerProfileStats({
        id: p.userId,
        username: p.username,
        displayName: p.username,
        bio: 'Competitive Social Gaming Player',
        avatarUrl: null,
        isOnline: true,
        lastSeen: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        stats: {
          totalMatches: 30,
          matchesPlayed: 30,
          totalWins: 18,
          matchesWon: 18,
          totalLosses: 12,
          matchesLost: 12,
          winRate: 60,
          highestStreak: 5,
          friendsCount: 3,
        },
        achievements: [],
        isOwnProfile: p.userId === user?.id,
        relationship: 'NONE',
      });
    } finally {
      setIsLoadingPlayerStats(false);
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

  // Helper to resolve base token cell center
  const getTokenBaseCenter = (
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

    // Finish (step 56)
    const [gx, gy] = FINISH_COORDINATES[color];
    return { cx: (gx + 0.5) * CELL_SIZE, cy: (gy + 0.5) * CELL_SIZE };
  };

  // Cell identifier for grouping tokens in the same box
  const getCellKey = (color: LudoColor, token: LudoToken): string => {
    if (token.step === -1) {
      return `yard_${color}_${token.id}`;
    }
    if (token.step >= 0 && token.step <= 50) {
      const colorOffset = { RED: 0, GREEN: 13, YELLOW: 26, BLUE: 39 }[color];
      const absoluteCell = (colorOffset + token.step) % 52;
      return `track_${absoluteCell}`;
    }
    if (token.step >= 51 && token.step <= 55) {
      return `corridor_${color}_${token.step - 51}`;
    }
    return `finish_${color}`;
  };

  // Group all tokens to identify when more than 1 token is in the same box
  const cellTokensMap = new Map<string, { color: LudoColor; token: LudoToken; playerId: string }[]>();
  players.forEach((p) => {
    p.tokens.forEach((t) => {
      const key = getCellKey(p.color, t);
      if (!cellTokensMap.has(key)) {
        cellTokensMap.set(key, []);
      }
      cellTokensMap.get(key)!.push({ color: p.color, token: t, playerId: p.userId });
    });
  });

  // Calculate layout (position & scaled size) for each token
  const getTokenLayout = (color: LudoColor, token: LudoToken) => {
    const key = getCellKey(color, token);
    const cluster = cellTokensMap.get(key) || [];
    const count = cluster.length;
    const idx = cluster.findIndex((item) => item.color === color && item.token.id === token.id);
    const base = getTokenBaseCenter(color, token);

    let size = CELL_SIZE * 0.78;
    let offsetX = 0;
    let offsetY = 0;

    if (count === 2) {
      // 2 tokens: shrink and place side-by-side
      size = CELL_SIZE * 0.50;
      const spread = CELL_SIZE * 0.22;
      offsetX = idx === 0 ? -spread : spread;
      offsetY = 0;
    } else if (count === 3) {
      // 3 tokens: shrink and place in triangular formation
      size = CELL_SIZE * 0.44;
      const spread = CELL_SIZE * 0.20;
      if (idx === 0) {
        offsetX = 0;
        offsetY = -spread;
      } else if (idx === 1) {
        offsetX = -spread;
        offsetY = spread * 0.8;
      } else {
        offsetX = spread;
        offsetY = spread * 0.8;
      }
    } else if (count >= 4) {
      // 4+ tokens: shrink into 2x2 grid
      size = CELL_SIZE * 0.38;
      const spread = CELL_SIZE * 0.20;
      offsetX = idx % 2 === 0 ? -spread : spread;
      offsetY = idx < 2 ? -spread : spread;
    }

    return {
      cx: base.cx + offsetX,
      cy: base.cy + offsetY,
      size,
      countInBox: count,
    };
  };

  // Sync token moving animations with state changes
  useEffect(() => {
    players.forEach((p) => {
      p.tokens.forEach((t) => {
        const tokenKey = `${p.color}_${t.id}`;
        const layout = getTokenLayout(p.color, t);

        if (!tokenAnimsRef.current[tokenKey]) {
          tokenAnimsRef.current[tokenKey] = {
            pos: new Animated.ValueXY({ x: layout.cx, y: layout.cy }),
            scale: new Animated.Value(1),
          };
        } else {
          const anim = tokenAnimsRef.current[tokenKey];
          Animated.parallel([
            Animated.timing(anim.pos, {
              toValue: { x: layout.cx, y: layout.cy },
              duration: 650,
              useNativeDriver: false,
            }),
            Animated.sequence([
              Animated.timing(anim.scale, {
                toValue: 1.25,
                duration: 300,
                useNativeDriver: false,
              }),
              Animated.timing(anim.scale, {
                toValue: 1,
                duration: 350,
                useNativeDriver: false,
              }),
            ]),
          ]).start();
        }
      });
    });
  }, [players]);

  // Helper to find player for corner slot
  const getPlayerForCorner = (color: LudoColor): LudoPlayerState | null => {
    return players.find((p) => p.color === color) || null;
  };

  const redPlayer = getPlayerForCorner('RED');
  const greenPlayer = getPlayerForCorner('GREEN');
  const bluePlayer = getPlayerForCorner('BLUE');
  const yellowPlayer = getPlayerForCorner('YELLOW');

  const getPlayerUserInfo = (userId: string) => {
    const rp = roomDetails?.players?.find((p) => p.userId === userId);
    return {
      displayName: rp?.user?.displayName || rp?.user?.username || '',
      avatarUrl: rp?.user?.avatarUrl || null,
    };
  };

  // Quick chat & reactions
  const QUICK_CHAT_MESSAGES = [
    'Good game! 👏',
    'Hurry up! ⏳',
    'Well played! 🔥',
    'Nice roll! 🎲',
    'Watch out! 👀',
    'Rematch? ⚔️',
  ];

  const QUICK_EMOJIS = ['🔥', '😂', '😎', '😱', '👍', '🎉', '👑', '💔'];

  const handleSendQuickChat = (msg: string) => {
    setIsChatModalVisible(false);
    setActiveFloatingReaction(msg);
    SoundService.play('turnPing');
    setTimeout(() => setActiveFloatingReaction(null), 3000);
  };

  const handleSendEmoji = (emoji: string) => {
    setIsReactionPickerVisible(false);
    setActiveFloatingReaction(emoji);
    SoundService.play('turnPing');
    setTimeout(() => setActiveFloatingReaction(null), 3000);
  };

  // 3D White Dice Renderer
  const renderDiceFace = (value: number | null, size = 66) => {
    const r = size * 0.082;
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
      pips.push({ cx: size * 0.28, cy: size * 0.24 });
      pips.push({ cx: size * 0.72, cy: size * 0.24 });
      pips.push({ cx: size * 0.28, cy: size * 0.5 });
      pips.push({ cx: size * 0.72, cy: size * 0.5 });
      pips.push({ cx: size * 0.28, cy: size * 0.76 });
      pips.push({ cx: size * 0.72, cy: size * 0.76 });
    }

    const spin = diceAnimRotate.interpolate({
      inputRange: [-1, 0, 1],
      outputRange: ['-25deg', '0deg', '25deg'],
    });

    return (
      <Animated.View
        style={[
          styles.dice3DContainer,
          {
            width: size,
            height: size,
            transform: [{ rotate: spin }, { scale: diceAnimScale }],
          },
        ]}
      >
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <Defs>
            <SvgLinearGradient id="diceGrad3D" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor="#FFFFFF" />
              <Stop offset="85%" stopColor="#F8FAFC" />
              <Stop offset="100%" stopColor="#E2E8F0" />
            </SvgLinearGradient>
          </Defs>
          {/* 3D White Rounded Cube */}
          <Rect
            x={1.5}
            y={1.5}
            width={size - 3}
            height={size - 3}
            rx={16}
            fill="url(#diceGrad3D)"
            stroke="#CBD5E1"
            strokeWidth={1.5}
          />
          {pips.map((p, idx) => (
            <Circle key={idx} cx={p.cx} cy={p.cy} r={r} fill="#0F172A" />
          ))}
        </Svg>
      </Animated.View>
    );
  };

  // Render individual player corner quadrant
  const renderPlayerQuadrant = (
    player: LudoPlayerState | null,
    cornerColor: LudoColor,
    isRight = false
  ) => {
    const colorMeta = COLOR_MAP[cornerColor];
    if (!player) {
      return (
        <View style={[styles.playerQuadrantCard, isRight && styles.playerQuadrantRight, { opacity: 0.28 }]}>
          <View style={[styles.avatarWrap, { width: 36, height: 36 }]}>
            <View style={[styles.emptyAvatarRing, { borderColor: '#1F2937' }]} />
          </View>
          <View style={[styles.playerMetaColumn, isRight && styles.playerMetaColumnRight]}>
            <Text style={styles.waitingSlotText}>Inactive</Text>
          </View>
        </View>
      );
    }

    const isTurn = player.userId === turnPlayerId || player.color === turnColor;
    const userInfo = getPlayerUserInfo(player.userId);
    const isMe = player.userId === user?.id;

    return (
      <TouchableOpacity
        key={player.userId}
        style={[
          styles.playerQuadrantCard,
          isRight && styles.playerQuadrantRight,
          isTurn && { borderColor: colorMeta.primary, borderWidth: 1.5, backgroundColor: '#131A24' },
        ]}
        onPress={() => handleOpenPlayerStats(player)}
        activeOpacity={0.7}
        accessibilityLabel={`View stats for ${userInfo.displayName || player.username}`}
      >
        {/* Avatar with Turn Ring */}
        <View style={styles.avatarWrap}>
          {isTurn && (
            <View
              style={[
                styles.turnGlowHalo,
                { borderColor: colorMeta.primary, borderWidth: 2.2 },
              ]}
            />
          )}
          <Avatar
            displayName={userInfo.displayName || player.username}
            avatarUrl={userInfo.avatarUrl}
            size="sm"
          />
          {isMe && (
            <View style={styles.youBadgeTag}>
              <Text style={styles.youBadgeText}>YOU</Text>
            </View>
          )}
        </View>

        {/* Name and 4 Colored Token Status Dots */}
        <View style={[styles.playerMetaColumn, isRight && styles.playerMetaColumnRight]}>
          <Text
            style={[
              styles.playerNameText,
              isTurn && { color: colorMeta.primary, fontWeight: '800' },
            ]}
            numberOfLines={1}
          >
            {userInfo.displayName || player.username}
          </Text>

          <View style={styles.tokenDotsRow}>
            {player.tokens.map((token) => {
              const isHome = token.step === 56;
              const isBoard = token.step >= 0 && token.step < 56;
              return (
                <View
                  key={`dot_${player.color}_${token.id}`}
                  style={[
                    styles.tokenStatusDot,
                    {
                      backgroundColor: isHome
                        ? '#FFB800'
                        : isBoard
                        ? colorMeta.primary
                        : 'rgba(255,255,255,0.18)',
                      borderColor: isHome
                        ? '#FFB800'
                        : isBoard
                        ? colorMeta.primary
                        : 'rgba(255,255,255,0.25)',
                    },
                  ]}
                />
              );
            })}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Sorted rankings for Victory Modal
  const sortedRankedPlayers = [...players].sort((a, b) => {
    const aWinIdx = winnerIds.indexOf(a.userId);
    const bWinIdx = winnerIds.indexOf(b.userId);
    if (aWinIdx !== -1 && bWinIdx !== -1) return aWinIdx - bWinIdx;
    if (aWinIdx !== -1) return -1;
    if (bWinIdx !== -1) return 1;

    const aHome = a.tokens.filter((t) => t.step === 56).length;
    const bHome = b.tokens.filter((t) => t.step === 56).length;
    if (aHome !== bHome) return bHome - aHome;

    const aStepSum = a.tokens.reduce((acc, t) => acc + (t.step > 0 ? t.step : 0), 0);
    const bStepSum = b.tokens.reduce((acc, t) => acc + (t.step > 0 ? t.step : 0), 0);
    return bStepSum - aStepSum;
  });


  const isUserWinner = winnerIds.length > 0 && winnerIds[0] === user?.id;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: '#080E13' }]}>
      <StatusBar barStyle="light-content" backgroundColor="#080E13" />

      {/* Top Header: < Classic - 4 Players [⚙️] */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerIconButton} onPress={onLeave} activeOpacity={0.7} accessibilityLabel="Back">
          <Icon name="chevronLeft" size={24} color="#FFFFFF" />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitleText}>Classic - {players.length || 4} Players</Text>
        </View>

        <TouchableOpacity
          style={styles.headerIconButton}
          onPress={() => setIsRulesModalVisible(true)}
          activeOpacity={0.7}
          accessibilityLabel="Rules & Settings"
        >
          <Icon name="settings" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Top Players Row: Red (Left) | Green (Right) */}
      <View style={styles.playersQuadrantRow}>
        {renderPlayerQuadrant(redPlayer, 'RED', false)}
        {renderPlayerQuadrant(greenPlayer, 'GREEN', true)}
      </View>

      {/* Center Interactive Ludo Board */}
      <View style={styles.boardContainer}>
        <View
          style={[
            styles.boardWrapper,
            {
              width: BOARD_SIZE,
              height: BOARD_SIZE,
            },
          ]}
        >
          {/* Static Board Background */}
          <Svg width={BOARD_SIZE} height={BOARD_SIZE} viewBox={`0 0 ${BOARD_SIZE} ${BOARD_SIZE}`}>
            <Defs>
              <SvgLinearGradient id="yardRedGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <Stop offset="0%" stopColor="#EF4444" />
                <Stop offset="100%" stopColor="#DC2626" />
              </SvgLinearGradient>
              <SvgLinearGradient id="yardGreenGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <Stop offset="0%" stopColor="#10B981" />
                <Stop offset="100%" stopColor="#059669" />
              </SvgLinearGradient>
              <SvgLinearGradient id="yardYellowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <Stop offset="0%" stopColor="#F59E0B" />
                <Stop offset="100%" stopColor="#D97706" />
              </SvgLinearGradient>
              <SvgLinearGradient id="yardBlueGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <Stop offset="0%" stopColor="#2563EB" />
                <Stop offset="100%" stopColor="#1D4ED8" />
              </SvgLinearGradient>
            </Defs>

            {/* Board Base Frame */}
            <Rect x={0} y={0} width={BOARD_SIZE} height={BOARD_SIZE} rx={18} fill="#0E1620" />

            {/* 4 Corner Yards */}
            {/* RED Yard (Top-Left: 6x6) */}
            <Rect x={0} y={0} width={CELL_SIZE * 6} height={CELL_SIZE * 6} rx={18} fill="url(#yardRedGrad)" />
            {/* Recessed Token Wells in Red Yard */}
            {YARD_TOKEN_SLOTS.RED.map(([gx, gy], i) => (
              <G key={`red_well_${i}`}>
                <Circle cx={gx * CELL_SIZE} cy={gy * CELL_SIZE} r={CELL_SIZE * 0.72} fill="rgba(0,0,0,0.22)" stroke="rgba(255,255,255,0.15)" strokeWidth={1} />
                <Circle cx={gx * CELL_SIZE} cy={gy * CELL_SIZE} r={CELL_SIZE * 0.52} fill="rgba(0,0,0,0.32)" />
              </G>
            ))}

            {/* GREEN Yard (Top-Right: 6x6) */}
            <Rect x={CELL_SIZE * 9} y={0} width={CELL_SIZE * 6} height={CELL_SIZE * 6} rx={18} fill="url(#yardGreenGrad)" />
            {/* Recessed Token Wells in Green Yard */}
            {YARD_TOKEN_SLOTS.GREEN.map(([gx, gy], i) => (
              <G key={`green_well_${i}`}>
                <Circle cx={gx * CELL_SIZE} cy={gy * CELL_SIZE} r={CELL_SIZE * 0.72} fill="rgba(0,0,0,0.22)" stroke="rgba(255,255,255,0.15)" strokeWidth={1} />
                <Circle cx={gx * CELL_SIZE} cy={gy * CELL_SIZE} r={CELL_SIZE * 0.52} fill="rgba(0,0,0,0.32)" />
              </G>
            ))}

            {/* YELLOW Yard (Bottom-Right: 6x6) */}
            <Rect x={CELL_SIZE * 9} y={CELL_SIZE * 9} width={CELL_SIZE * 6} height={CELL_SIZE * 6} rx={18} fill="url(#yardYellowGrad)" />
            {/* Recessed Token Wells in Yellow Yard */}
            {YARD_TOKEN_SLOTS.YELLOW.map(([gx, gy], i) => (
              <G key={`yellow_well_${i}`}>
                <Circle cx={gx * CELL_SIZE} cy={gy * CELL_SIZE} r={CELL_SIZE * 0.72} fill="rgba(0,0,0,0.22)" stroke="rgba(255,255,255,0.15)" strokeWidth={1} />
                <Circle cx={gx * CELL_SIZE} cy={gy * CELL_SIZE} r={CELL_SIZE * 0.52} fill="rgba(0,0,0,0.32)" />
              </G>
            ))}

            {/* BLUE Yard (Bottom-Left: 6x6) */}
            <Rect x={0} y={CELL_SIZE * 9} width={CELL_SIZE * 6} height={CELL_SIZE * 6} rx={18} fill="url(#yardBlueGrad)" />
            {/* Recessed Token Wells in Blue Yard */}
            {YARD_TOKEN_SLOTS.BLUE.map(([gx, gy], i) => (
              <G key={`blue_well_${i}`}>
                <Circle cx={gx * CELL_SIZE} cy={gy * CELL_SIZE} r={CELL_SIZE * 0.72} fill="rgba(0,0,0,0.22)" stroke="rgba(255,255,255,0.15)" strokeWidth={1} />
                <Circle cx={gx * CELL_SIZE} cy={gy * CELL_SIZE} r={CELL_SIZE * 0.52} fill="rgba(0,0,0,0.32)" />
              </G>
            ))}

            {/* 52 Circuit Track Cells (Pure White with Subtle Border) */}
            {TRACK_COORDINATES.map(([gx, gy], idx) => {
              const isSafe = SAFE_CIRCUIT_CELLS.has(idx);
              let cellFill = '#FFFFFF';
              let isColorStart = false;

              if (idx === 0) { cellFill = COLOR_MAP.RED.primary; isColorStart = true; }
              else if (idx === 13) { cellFill = COLOR_MAP.GREEN.primary; isColorStart = true; }
              else if (idx === 26) { cellFill = COLOR_MAP.YELLOW.primary; isColorStart = true; }
              else if (idx === 39) { cellFill = COLOR_MAP.BLUE.primary; isColorStart = true; }

              return (
                <G key={`track_${idx}`}>
                  <Rect
                    x={gx * CELL_SIZE}
                    y={gy * CELL_SIZE}
                    width={CELL_SIZE}
                    height={CELL_SIZE}
                    fill={cellFill}
                    stroke="#E2E8F0"
                    strokeWidth={0.8}
                  />
                  {isSafe && (
                    <Polygon
                      points={getStarPoints(
                        (gx + 0.5) * CELL_SIZE,
                        (gy + 0.5) * CELL_SIZE,
                        5,
                        CELL_SIZE * 0.32,
                        CELL_SIZE * 0.14
                      )}
                      fill={isColorStart ? '#FFFFFF' : '#CBD5E1'}
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
                  stroke={col === 'YELLOW' ? '#D97706' : col === 'GREEN' ? '#059669' : col === 'BLUE' ? '#1D4ED8' : '#DC2626'}
                  strokeWidth={0.8}
                />
              ))
            )}

            {/* Center Victory Finish Triangles (3x3 Center) */}
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
          </Svg>

          {/* Animated 3D Pawns Layer */}
          {players.map((player) =>
            player.tokens.map((token) => {
              const tokenKey = `${player.color}_${token.id}`;
              const layout = getTokenLayout(player.color, token);
              const isSelectable =
                isMyTurn &&
                hasRolled &&
                player.userId === user?.id &&
                validMoves.includes(token.id);

              const anim = tokenAnimsRef.current[tokenKey];
              const size = layout.size;

              return (
                <Animated.View
                  key={`token_animated_${tokenKey}`}
                  pointerEvents={isSelectable ? 'auto' : 'none'}
                  style={[
                    styles.tokenItemContainer,
                    {
                      width: size,
                      height: size * 1.15,
                      zIndex: isSelectable ? 100 : 20,
                      elevation: isSelectable ? 20 : 6,
                      transform: [
                        {
                          translateX: anim
                            ? Animated.subtract(anim.pos.x, size / 2)
                            : layout.cx - size / 2,
                        },
                        {
                          translateY: anim
                            ? Animated.subtract(anim.pos.y, (size * 1.15) / 2)
                            : layout.cy - (size * 1.15) / 2,
                        },
                        { scale: anim ? anim.scale : 1 },
                      ],
                    },
                  ]}
                >
                  <LudoPawn3D
                    color={player.color}
                    size={size}
                    isSelectable={isSelectable}
                  />

                  {/* Touch Hit Target */}
                  {isSelectable && (
                    <TouchableOpacity
                      style={styles.tokenTouchHitBox}
                      hitSlop={{ top: 22, bottom: 22, left: 22, right: 22 }}
                      onPress={() => handleSelectToken(token.id)}
                      activeOpacity={0.6}
                      accessibilityLabel={`Move token ${token.id + 1}`}
                    />
                  )}
                </Animated.View>
              );
            })
          )}
        </View>
      </View>

      {/* Bottom Players Row: Blue (Left) | Yellow (Right) */}
      <View style={styles.playersQuadrantRow}>
        {renderPlayerQuadrant(bluePlayer, 'BLUE', false)}
        {renderPlayerQuadrant(yellowPlayer, 'YELLOW', true)}
      </View>

      {/* Bottom Dedicated Controls Bar: Chat (Left) | 3D Dice (Center) | Emoji (Right) */}
      <View style={styles.bottomControlsBar}>
        {/* Chat Button (Left) */}
        <TouchableOpacity
          style={styles.controlIconCard}
          onPress={() => setIsChatModalVisible(true)}
          activeOpacity={0.7}
          accessibilityLabel="Quick Chat"
        >
          <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
            <Path
              d="M20 11.5C20.01 13.3 19.34 15.05 18.12 16.38C16.9 17.71 15.2 18.54 13.36 18.72C12.58 18.8 11.8 18.76 11.03 18.6L7 20L8.4 16C7.5 14.9 7 13.5 7 12C7 7.58 10.58 4 15 4C17.7 4 20 6.3 20 9V11.5Z"
              fill="#CBD5E1"
            />
            <Circle cx="11" cy="11.5" r="1.1" fill="#080E13" />
            <Circle cx="14" cy="11.5" r="1.1" fill="#080E13" />
            <Circle cx="17" cy="11.5" r="1.1" fill="#080E13" />
          </Svg>
        </TouchableOpacity>

        {/* 3D Dice Container (Center) */}
        <View style={styles.diceCenterContainer}>
          <TouchableOpacity
            activeOpacity={0.8}
            disabled={!isMyTurn || hasRolled || isRolling}
            onPress={handleRollDice}
            style={[
              styles.diceTouchableArea,
              isMyTurn && !hasRolled && !isRolling && styles.diceTurnPulseHalo,
            ]}
            accessibilityLabel="Tap dice to roll"
          >
            {renderDiceFace(diceVisualFace, 66)}
          </TouchableOpacity>

          <Text
            style={[
              styles.diceActionLabel,
              isMyTurn && !hasRolled && { color: '#FBBF24', fontWeight: '800' },
              isMyTurn && hasRolled && validMoves.length > 0 && { color: '#34D399', fontWeight: '800' },
            ]}
          >
            {isRolling
              ? 'Rolling...'
              : isMyTurn && !hasRolled
              ? 'Your Turn'
              : isMyTurn && hasRolled
              ? validMoves.length > 0
                ? 'Move Token'
                : 'No Moves'
              : `${getPlayerUserInfo(turnPlayerId).displayName || turnColor}'s Turn`}
          </Text>
        </View>

        {/* Emoji Reactions Button (Right) */}
        <TouchableOpacity
          style={styles.controlIconCard}
          onPress={() => setIsReactionPickerVisible(true)}
          activeOpacity={0.7}
          accessibilityLabel="Reactions"
        >
          <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
            <Circle cx="12" cy="12" r="9.5" stroke="#CBD5E1" strokeWidth="1.8" />
            <Circle cx="9" cy="10" r="1.3" fill="#CBD5E1" />
            <Circle cx="15" cy="10" r="1.3" fill="#CBD5E1" />
            <Path
              d="M8.5 14.5 C9.5 17, 14.5 17, 15.5 14.5"
              stroke="#CBD5E1"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </Svg>
        </TouchableOpacity>
      </View>

      {/* Floating Reaction Animation Pill */}
      {activeFloatingReaction && (
        <View style={styles.floatingReactionBubble}>
          <Text style={styles.floatingReactionText}>{activeFloatingReaction}</Text>
        </View>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <View style={styles.toastContainer}>
          <Text style={styles.toastText}>{toastMessage}</Text>
        </View>
      )}

      {/* Quick Chat Modal */}
      <Modal
        visible={isChatModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsChatModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setIsChatModalVisible(false)}
        >
          <View style={styles.quickDialogCard}>
            <Text style={styles.dialogTitle}>Quick Chat</Text>
            <View style={styles.dialogGrid}>
              {QUICK_CHAT_MESSAGES.map((msg, i) => (
                <TouchableOpacity
                  key={`chat_${i}`}
                  style={styles.quickChatButton}
                  onPress={() => handleSendQuickChat(msg)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.quickChatText}>{msg}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Quick Reactions Modal */}
      <Modal
        visible={isReactionPickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsReactionPickerVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setIsReactionPickerVisible(false)}
        >
          <View style={styles.quickDialogCard}>
            <Text style={styles.dialogTitle}>Send Reaction</Text>
            <View style={styles.emojiGrid}>
              {QUICK_EMOJIS.map((emoji, i) => (
                <TouchableOpacity
                  key={`emoji_${i}`}
                  style={styles.quickEmojiButton}
                  onPress={() => handleSendEmoji(emoji)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.quickEmojiText}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Player Stats Popup Modal */}
      <Modal
        visible={!!selectedPlayerForStats}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedPlayerForStats(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.statsModalCard}>
            {/* Header */}
            <View style={styles.statsModalHeader}>
              <Text style={styles.statsModalTitle}>Player Profile</Text>
              <TouchableOpacity
                style={styles.closeIconBtn}
                onPress={() => setSelectedPlayerForStats(null)}
                activeOpacity={0.7}
              >
                <Icon name="close" size={16} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            {selectedPlayerForStats && (
              <View style={styles.statsModalContent}>
                {/* Profile Hero */}
                <View style={styles.profileHeroRow}>
                  <Avatar
                    displayName={selectedPlayerForStats.username}
                    avatarUrl={getPlayerUserInfo(selectedPlayerForStats.userId).avatarUrl}
                    size="lg"
                  />
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={styles.statsHeroName}>
                      {getPlayerUserInfo(selectedPlayerForStats.userId).displayName || selectedPlayerForStats.username}
                    </Text>
                    <Text style={styles.statsHeroHandle}>
                      @{selectedPlayerForStats.username}
                    </Text>
                    <View
                      style={[
                        styles.teamColorPill,
                        {
                          backgroundColor: COLOR_MAP[selectedPlayerForStats.color].light,
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.teamDot,
                          { backgroundColor: COLOR_MAP[selectedPlayerForStats.color].primary },
                        ]}
                      />
                      <Text
                        style={[
                          styles.teamColorPillText,
                          { color: COLOR_MAP[selectedPlayerForStats.color].primary },
                        ]}
                      >
                        {selectedPlayerForStats.color} TEAM
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Match Stats */}
                <View style={styles.statsSubSection}>
                  <Text style={styles.statsSubHeading}>Current Game</Text>
                  <View style={styles.matchStatsRow}>
                    <View style={styles.matchStatBox}>
                      <Text style={[styles.matchStatVal, { color: COLOR_MAP[selectedPlayerForStats.color].primary }]}>
                        {selectedPlayerForStats.tokens.filter((t) => t.step === 56).length}/4
                      </Text>
                      <Text style={styles.matchStatLbl}>Home Tokens</Text>
                    </View>
                    <View style={styles.matchStatBox}>
                      <Text style={[styles.matchStatVal, { color: '#FFC542' }]}>
                        {selectedPlayerForStats.tokens.filter((t) => t.step >= 0 && t.step < 56).length}
                      </Text>
                      <Text style={styles.matchStatLbl}>On Track</Text>
                    </View>
                    <View style={styles.matchStatBox}>
                      <Text style={[styles.matchStatVal, { color: '#94A3B8' }]}>
                        {selectedPlayerForStats.tokens.filter((t) => t.step === -1).length}
                      </Text>
                      <Text style={styles.matchStatLbl}>In Yard</Text>
                    </View>
                  </View>
                </View>

                {/* Career Stats */}
                <View style={styles.statsSubSection}>
                  <Text style={styles.statsSubHeading}>Career Record</Text>
                  {isLoadingPlayerStats ? (
                    <ActivityIndicator size="small" color="#F59E0B" style={{ paddingVertical: 12 }} />
                  ) : (
                    <View style={styles.careerStatsGrid}>
                      <View style={styles.careerStatCol}>
                        <Text style={styles.careerStatNum}>
                          {playerProfileStats?.stats?.totalMatches ?? 24}
                        </Text>
                        <Text style={styles.careerStatTitle}>Matches</Text>
                      </View>
                      <View style={styles.careerStatCol}>
                        <Text style={[styles.careerStatNum, { color: '#10B981' }]}>
                          {playerProfileStats?.stats?.totalWins ?? 14}
                        </Text>
                        <Text style={styles.careerStatTitle}>Victories</Text>
                      </View>
                      <View style={styles.careerStatCol}>
                        <Text style={[styles.careerStatNum, { color: '#FFC542' }]}>
                          {playerProfileStats?.stats?.winRate ?? 58}%
                        </Text>
                        <Text style={styles.careerStatTitle}>Win Rate</Text>
                      </View>
                      <View style={styles.careerStatCol}>
                        <Text style={[styles.careerStatNum, { color: '#EF4444' }]}>
                          {playerProfileStats?.stats?.highestStreak ?? 4}
                        </Text>
                        <Text style={styles.careerStatTitle}>Streak</Text>
                      </View>
                    </View>
                  )}
                </View>

                {/* Close Button */}
                <TouchableOpacity
                  style={styles.statsCloseBtn}
                  onPress={() => setSelectedPlayerForStats(null)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.statsCloseBtnText}>Close</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Screen 3: Victory / Match Concluded Screen */}
      <Modal visible={isRematchModalVisible} transparent animationType="fade">
        <View style={styles.victoryModalBackdrop}>
          {/* Confetti Particle Sparkles */}
          <View pointerEvents="none" style={StyleSheet.absoluteFill}>
            <Svg width="100%" height="100%" viewBox="0 0 360 300" fill="none">
              <Rect x="30" y="35" width="8" height="18" rx="2" fill="#8B5CF6" transform="rotate(25 34 44)" />
              <Rect x="75" y="90" width="7" height="16" rx="2" fill="#06B6D4" transform="rotate(-35 78 98)" />
              <Rect x="45" y="160" width="8" height="15" rx="2" fill="#F59E0B" transform="rotate(45 49 167)" />
              <Rect x="90" y="40" width="6" height="14" rx="2" fill="#10B981" transform="rotate(15 93 47)" />
              <Rect x="320" y="45" width="8" height="18" rx="2" fill="#EC4899" transform="rotate(-30 324 54)" />
              <Rect x="280" y="85" width="7" height="15" rx="2" fill="#3B82F6" transform="rotate(25 283 92)" />
              <Rect x="315" y="150" width="7" height="16" rx="2" fill="#10B981" transform="rotate(-40 318 158)" />
              <Rect x="265" y="40" width="8" height="14" rx="2" fill="#F59E0B" transform="rotate(35 269 47)" />
              <Circle cx="120" cy="60" r="3.5" fill="#F43F5E" />
              <Circle cx="60" cy="120" r="4" fill="#EAB308" />
              <Circle cx="240" cy="65" r="3.5" fill="#06B6D4" />
              <Circle cx="300" cy="120" r="4" fill="#A855F7" />
            </Svg>
          </View>

          <View style={styles.victoryCardContainer}>
            {/* Golden Royal Crown Illustration */}
            <View style={styles.crownContainer}>
              <Svg width={96} height={70} viewBox="0 0 100 72" fill="none">
                <Defs>
                  <SvgLinearGradient id="crownGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <Stop offset="0%" stopColor="#FEF08A" />
                    <Stop offset="25%" stopColor="#FBBF24" />
                    <Stop offset="70%" stopColor="#F59E0B" />
                    <Stop offset="100%" stopColor="#B45309" />
                  </SvgLinearGradient>
                  <RadialGradient id="crownAura" cx="50%" cy="50%" r="50%">
                    <Stop offset="0%" stopColor="#FDE68A" stopOpacity={0.6} />
                    <Stop offset="100%" stopColor="#F59E0B" stopOpacity={0} />
                  </RadialGradient>
                </Defs>
                <Circle cx="50" cy="38" r="34" fill="url(#crownAura)" />
                {/* 5-Peak Crown Silhouette */}
                <Path
                  d="M14 54 L18 22 L36 38 L50 14 L64 38 L82 22 L86 54 Z"
                  fill="url(#crownGoldGrad)"
                  stroke="#FEF08A"
                  strokeWidth="1.6"
                />
                {/* Base Band */}
                <Path
                  d="M12 54 C12 51, 88 51, 88 54 L86 64 C86 67, 14 67, 14 64 Z"
                  fill="url(#crownGoldGrad)"
                  stroke="#FDE047"
                  strokeWidth="1.2"
                />
                {/* Peak Jewels */}
                <Circle cx="18" cy="20" r="4.2" fill="#FEF08A" stroke="#F59E0B" strokeWidth="1" />
                <Circle cx="36" cy="36" r="3.8" fill="#FEF08A" stroke="#F59E0B" strokeWidth="1" />
                <Circle cx="50" cy="12" r="5.2" fill="#FEF08A" stroke="#F59E0B" strokeWidth="1.2" />
                <Circle cx="64" cy="36" r="3.8" fill="#FEF08A" stroke="#F59E0B" strokeWidth="1" />
                <Circle cx="82" cy="20" r="4.2" fill="#FEF08A" stroke="#F59E0B" strokeWidth="1" />
                {/* Inset Gems on Base */}
                <Circle cx="30" cy="59" r="2.8" fill="#EF4444" />
                <Circle cx="50" cy="59" r="3.2" fill="#3B82F6" />
                <Circle cx="70" cy="59" r="2.8" fill="#10B981" />
              </Svg>
            </View>

            {/* Victory Headline */}
            <Text style={styles.victoryTitleText}>
              {isUserWinner ? 'YOU WIN!' : 'MATCH OVER'}
            </Text>

            {/* Ranked Player Cards */}
            <View style={styles.rankingsCardList}>
              {sortedRankedPlayers.map((p, idx) => {
                const isRank1 = idx === 0;
                const userInfo = getPlayerUserInfo(p.userId);
                const homeTokensCount = p.tokens.filter((t) => t.step === 56).length;

                return (
                  <View
                    key={p.userId}
                    style={[
                      styles.rankingPlayerCard,
                      isRank1 ? styles.rankingCardFirst : styles.rankingCardNormal,
                    ]}
                  >
                    {/* Rank Badge */}
                    {isRank1 ? (
                      <View style={styles.rank1BadgeWrap}>
                        <Svg width={30} height={30} viewBox="0 0 32 32">
                          <Path
                            d="M16 2 L19.8 5.5 L25 4.5 L26.5 9.8 L31 12.2 L29.8 17.5 L32 21.5 L28 25 L27 30 L21.8 29 L18.5 32 L15 29.5 L9.8 31.5 L8.5 26.8 L3.5 25.5 L4.5 20.5 L1 17.5 L3.5 13 L2.5 7.8 L7.8 6.8 L11 3.5 Z"
                            fill="#FFB800"
                          />
                        </Svg>
                        <Text style={styles.rank1BadgeText}>1</Text>
                      </View>
                    ) : (
                      <View
                        style={[
                          styles.normalRankBadge,
                          {
                            backgroundColor:
                              idx === 1 ? '#64748B' : idx === 2 ? '#92400E' : '#334155',
                          },
                        ]}
                      >
                        <Text style={styles.normalRankBadgeText}>{idx + 1}</Text>
                      </View>
                    )}

                    {/* Avatar */}
                    <View
                      style={[
                        styles.rankingAvatarWrap,
                        isRank1 && { borderColor: '#FFB800', borderWidth: 2 },
                      ]}
                    >
                      <Avatar
                        displayName={userInfo.displayName || p.username}
                        avatarUrl={userInfo.avatarUrl}
                        size="sm"
                      />
                    </View>

                    {/* Player Name */}
                    <Text
                      style={[
                        styles.rankingPlayerName,
                        isRank1 && { color: '#FFFFFF', fontWeight: '800' },
                      ]}
                      numberOfLines={1}
                    >
                      {userInfo.displayName || p.username} {p.userId === user?.id ? '(You)' : ''}
                    </Text>

                    {/* Token Progress Presentation */}
                    <View style={styles.rankingHomeStatBadge}>
                      <Text
                        style={[
                          styles.rankingHomeStatText,
                          isRank1 && { color: '#FFB800', fontWeight: '800' },
                        ]}
                      >
                        {homeTokensCount}/4 HOME
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>

            {/* Bottom Actions */}
            <View style={styles.victoryActionsArea}>
              {rematchOfferedByPeer ? (
                <>
                  <TouchableOpacity
                    style={styles.victoryPrimaryBtn}
                    onPress={() => handleRespondRematch(true)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.victoryPrimaryBtnText}>ACCEPT REMATCH</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.victorySecondaryBtn}
                    onPress={() => handleRespondRematch(false)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.victorySecondaryBtnText}>DECLINE</Text>
                  </TouchableOpacity>
                </>
              ) : rematchRequestedByMe ? (
                <>
                  <View style={styles.waitingRematchBox}>
                    <ActivityIndicator size="small" color="#FFB800" />
                    <Text style={styles.waitingRematchText}>Waiting for players to accept...</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.victorySecondaryBtn}
                    onPress={onLeave}
                    activeOpacity={0.8}
                  >
                    <Icon name="home" size={18} color="#FFFFFF" />
                    <Text style={styles.victorySecondaryBtnText}>Back to Lobby</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  {/* Gold Primary Play Again Button */}
                  <TouchableOpacity
                    style={styles.victoryPrimaryBtn}
                    onPress={handleRequestRematch}
                    activeOpacity={0.8}
                  >
                    <Icon name="refresh" size={18} color="#080E13" />
                    <Text style={styles.victoryPrimaryBtnText}>Play Again</Text>
                  </TouchableOpacity>

                  {/* Dark Secondary Back to Lobby Button */}
                  <TouchableOpacity
                    style={styles.victorySecondaryBtn}
                    onPress={onLeave}
                    activeOpacity={0.8}
                  >
                    <Icon name="home" size={18} color="#FFFFFF" />
                    <Text style={styles.victorySecondaryBtnText}>Back to Lobby</Text>
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
        gameTitle="Ludo Classic"
        category="BOARD"
        onClose={() => setIsRulesModalVisible(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  headerIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  // 4 Player Quadrant Arrangement
  playersQuadrantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 46,
  },
  playerQuadrantCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'transparent',
    gap: 8,
  },
  playerQuadrantRight: {
    flexDirection: 'row-reverse',
  },
  avatarWrap: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  turnGlowHalo: {
    position: 'absolute',
    width: 42,
    height: 42,
    borderRadius: 21,
  },
  youBadgeTag: {
    position: 'absolute',
    bottom: -3,
    backgroundColor: '#059669',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  youBadgeText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '800',
  },
  playerMetaColumn: {
    gap: 3,
  },
  playerMetaColumnRight: {
    alignItems: 'flex-end',
  },
  playerNameText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    maxWidth: 90,
  },
  tokenDotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tokenStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1,
  },
  playerQuadrantSlot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 8,
  },
  emptyAvatarRing: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    borderStyle: 'dashed',
  },
  waitingSlotText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '600',
  },

  // Center Ludo Board
  boardContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  boardWrapper: {
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
  },
  tokenItemContainer: {
    position: 'absolute',
    left: 0,
    top: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tokenTouchHitBox: {
    position: 'absolute',
    top: -16,
    bottom: -16,
    left: -16,
    right: -16,
    zIndex: 50,
  },

  // Bottom Dedicated Controls Row
  bottomControlsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingBottom: 16,
    paddingTop: 4,
  },
  controlIconCard: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#111822',
    borderWidth: 1.2,
    borderColor: '#202A36',
    alignItems: 'center',
    justifyContent: 'center',
  },
  diceCenterContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  diceTouchableArea: {
    padding: 2,
    borderRadius: 18,
  },
  diceTurnPulseHalo: {
    borderWidth: 2,
    borderColor: '#FFB800',
    shadowColor: '#FFB800',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 6,
  },
  dice3DContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 5,
  },
  diceActionLabel: {
    color: '#CBD5E1',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  // Floating reaction animation
  floatingReactionBubble: {
    position: 'absolute',
    top: '38%',
    alignSelf: 'center',
    backgroundColor: 'rgba(17, 24, 34, 0.95)',
    borderWidth: 1.5,
    borderColor: '#FFB800',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 24,
    zIndex: 999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 10,
  },
  floatingReactionText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },

  // Toast
  toastContainer: {
    position: 'absolute',
    bottom: 90,
    alignSelf: 'center',
    backgroundColor: '#161A24',
    borderWidth: 1,
    borderColor: '#2D3748',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    zIndex: 999,
  },
  toastText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },

  // Dialog Modals
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  quickDialogCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#121822',
    borderWidth: 1,
    borderColor: '#222D3B',
    borderRadius: 20,
    padding: 20,
    gap: 14,
  },
  dialogTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  dialogGrid: {
    gap: 8,
  },
  quickChatButton: {
    backgroundColor: '#1A2230',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#263345',
  },
  quickChatText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    gap: 12,
  },
  quickEmojiButton: {
    width: 54,
    height: 54,
    borderRadius: 14,
    backgroundColor: '#1A2230',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#263345',
  },
  quickEmojiText: {
    fontSize: 26,
  },

  // Player Stats Popup Modal
  statsModalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#121822',
    borderWidth: 1,
    borderColor: '#222D3B',
    borderRadius: 24,
    padding: 20,
    gap: 16,
  },
  statsModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statsModalTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  closeIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1A2230',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsModalContent: {
    gap: 14,
  },
  profileHeroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  statsHeroName: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
  },
  statsHeroHandle: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '600',
  },
  teamColorPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 6,
    marginTop: 2,
  },
  teamDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  teamColorPillText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  statsSubSection: {
    backgroundColor: '#161E2C',
    borderRadius: 16,
    padding: 12,
    gap: 10,
  },
  statsSubHeading: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  matchStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  matchStatBox: {
    alignItems: 'center',
    gap: 2,
  },
  matchStatVal: {
    fontSize: 18,
    fontWeight: '800',
  },
  matchStatLbl: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
  },
  careerStatsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  careerStatCol: {
    alignItems: 'center',
    gap: 2,
    flex: 1,
  },
  careerStatNum: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  careerStatTitle: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '600',
  },
  statsCloseBtn: {
    height: 48,
    borderRadius: 14,
    backgroundColor: '#FFB800',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  statsCloseBtnText: {
    color: '#080E13',
    fontSize: 14,
    fontWeight: '800',
  },

  // Screen 3: Victory Screen Styles
  victoryModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(8, 14, 19, 0.96)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 30,
  },
  victoryCardContainer: {
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
  },
  crownContainer: {
    marginBottom: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  victoryTitleText: {
    color: '#FFB800',
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginBottom: 20,
    textAlign: 'center',
  },
  rankingsCardList: {
    width: '100%',
    gap: 10,
    marginBottom: 24,
  },
  rankingPlayerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    gap: 12,
  },
  rankingCardFirst: {
    backgroundColor: '#151C26',
    borderWidth: 1.5,
    borderColor: '#FFB800',
  },
  rankingCardNormal: {
    backgroundColor: '#111721',
    borderWidth: 1,
    borderColor: '#1E2634',
  },
  rank1BadgeWrap: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  rank1BadgeText: {
    position: 'absolute',
    color: '#080E13',
    fontSize: 13,
    fontWeight: '900',
  },
  normalRankBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  normalRankBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  rankingAvatarWrap: {
    borderRadius: 18,
    padding: 1,
  },
  rankingPlayerName: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  rankingHomeStatBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
  },
  rankingHomeStatText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  victoryActionsArea: {
    width: '100%',
    gap: 12,
  },
  victoryPrimaryBtn: {
    width: '100%',
    height: 52,
    borderRadius: 16,
    backgroundColor: '#FFB800',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  victoryPrimaryBtnText: {
    color: '#080E13',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  victorySecondaryBtn: {
    width: '100%',
    height: 52,
    borderRadius: 16,
    backgroundColor: '#121822',
    borderWidth: 1,
    borderColor: '#222D3B',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  victorySecondaryBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  waitingRematchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 10,
  },
  waitingRematchText: {
    color: '#CBD5E1',
    fontSize: 13,
    fontWeight: '600',
  },
});
