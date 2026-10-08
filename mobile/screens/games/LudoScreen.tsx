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
import Svg, { Rect, Circle, Polygon, G } from 'react-native-svg';
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
const BOARD_SIZE = Math.min(SCREEN_WIDTH - 8, Math.max(340, SCREEN_HEIGHT * 0.53), 430);
const CELL_SIZE = BOARD_SIZE / 15;

const COLOR_MAP: Record<LudoColor, { primary: string; light: string; text: string }> = {
  RED: { primary: '#FF575F', light: '#38141B', text: '#FF575F' },
  GREEN: { primary: '#3ED598', light: '#103324', text: '#3ED598' },
  YELLOW: { primary: '#FFC542', light: '#382C10', text: '#FFC542' },
  BLUE: { primary: '#0062FF', light: '#0E2347', text: '#0062FF' },
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

  // Initialize sound engine on mount
  useEffect(() => {
    SoundService.init();
  }, []);

  // Sound effect: Gentle ping when turn shifts to current user
  useEffect(() => {
    if (isMyTurn && !prevIsMyTurnRef.current) {
      SoundService.play('turnPing');
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

      // Audio checks: detect token capture, opening from yard, and home finishes
      setPlayers((prevPlayers) => {
        if (prevPlayers.length > 0 && state.players) {
          let hasCapture = false;
          let hasHome = false;
          let hasOpen = false;
          let hasMove = false;
          state.players.forEach((newP) => {
            const oldP = prevPlayers.find((p) => p.userId === newP.userId);
            if (oldP) {
              newP.tokens.forEach((newToken) => {
                const oldToken = oldP.tokens.find((t) => t.id === newToken.id);
                if (oldToken && oldToken.step !== newToken.step) {
                  hasMove = true;
                }
                // Token came out of yard (-1) onto track (0) -> token open!
                if (oldToken && oldToken.step === -1 && newToken.step === 0) {
                  hasOpen = true;
                }
                // Token went from track back to yard (-1) -> captured!
                if (oldToken && oldToken.step > 0 && newToken.step === -1) {
                  hasCapture = true;
                }
                // Token reached home (56) -> finish fanfare!
                if (oldToken && oldToken.step < 56 && newToken.step === 56) {
                  hasHome = true;
                }
              });
            }
          });
          if (hasCapture) SoundService.play('tokenCapture');
          else if (hasHome) SoundService.play('homeGoal');
          else if (hasOpen) SoundService.play('tokenOpen');
          else if (hasMove) SoundService.play('tokenMove');
        }
        return state.players || [];
      });

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
      if (payload.roomCode === roomCode) {
        // If opponent rolled, trigger dice roll wobble and audio
        if (payload.state?.currentDiceRoll && payload.state.currentDiceRoll !== currentDiceRoll) {
          triggerDiceWobble(payload.state.currentDiceRoll);
          SoundService.play('diceRoll');
        }
        applyStateUpdate(payload.state, payload.round, payload.scores);
      }
    });

    const unsubOver = MobileSocketService.onGameOver((payload) => {
      if (payload.roomCode === roomCode) {
        SoundService.play('gameOver');
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
  }, [roomCode, user?.id, applyStateUpdate, onLeave, currentDiceRoll]);

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
        if (res.state.currentDiceRoll) {
          setDiceVisualFace(res.state.currentDiceRoll);
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

    SoundService.play('tokenMove');
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

  // Split players into Up (top side) and Down (bottom side)
  const getTopAndBottomPlayers = () => {
    if (players.length <= 1) {
      return { topPlayers: [], bottomPlayers: players };
    }

    if (players.length === 2) {
      const bottom = players.filter((p) => p.userId === user?.id);
      const top = players.filter((p) => p.userId !== user?.id);
      if (bottom.length === 0) {
        return { topPlayers: [players[1]], bottomPlayers: [players[0]] };
      }
      return { topPlayers: top, bottomPlayers: bottom };
    }

    // 3 or 4 players
    const myIdx = players.findIndex((p) => p.userId === user?.id);
    if (myIdx === -1) {
      const mid = Math.ceil(players.length / 2);
      return {
        topPlayers: players.slice(0, mid),
        bottomPlayers: players.slice(mid),
      };
    }

    const bottomPlayers: LudoPlayerState[] = [players[myIdx]];
    const topPlayers: LudoPlayerState[] = [];

    players.forEach((p, idx) => {
      if (idx === myIdx) return;
      if (players.length === 4 && bottomPlayers.length < 2 && idx === (myIdx + 2) % 4) {
        bottomPlayers.push(p);
      } else {
        topPlayers.push(p);
      }
    });

    return { topPlayers, bottomPlayers };
  };

  const { topPlayers, bottomPlayers } = getTopAndBottomPlayers();

  // Determine if it is top players' turn or bottom players' turn
  const isTopTurn = topPlayers.some((p) => p.userId === turnPlayerId || p.color === turnColor);
  const isBottomTurn = bottomPlayers.some((p) => p.userId === turnPlayerId || p.color === turnColor);

  const getPlayerUserInfo = (userId: string) => {
    const rp = roomDetails?.players?.find((p) => p.userId === userId);
    return {
      displayName: rp?.user?.displayName || rp?.user?.username || '',
      avatarUrl: rp?.user?.avatarUrl || null,
    };
  };

  // Render SVG 3D-styled dice face
  const renderDiceFace = (value: number | null, size = 48) => {
    const r = size * 0.08;
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

    const spin = diceAnimRotate.interpolate({
      inputRange: [-1, 0, 1],
      outputRange: ['-25deg', '0deg', '25deg'],
    });

    return (
      <Animated.View
        style={{
          transform: [{ rotate: spin }, { scale: diceAnimScale }],
        }}
      >
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <Rect
            x={1.5}
            y={1.5}
            width={size - 3}
            height={size - 3}
            rx={10}
            fill="#161922"
            stroke={COLOR_MAP[turnColor]?.primary || theme.colors.primary}
            strokeWidth={2}
          />
          {pips.map((p, idx) => (
            <Circle key={idx} cx={p.cx} cy={p.cy} r={r} fill="#FFFFFF" />
          ))}
        </Svg>
      </Animated.View>
    );
  };

  // Render individual player card with avatar and stats trigger
  const renderPlayerProfileCard = (p: LudoPlayerState) => {
    const isTurn = p.userId === turnPlayerId || p.color === turnColor;
    const finishedCount = p.tokens.filter((t) => t.step === 56).length;
    const userInfo = getPlayerUserInfo(p.userId);
    const colorMeta = COLOR_MAP[p.color];
    const isMe = p.userId === user?.id;

    return (
      <TouchableOpacity
        key={p.userId}
        style={[
          styles.playerCard,
          {
            backgroundColor: isTurn ? '#1E2536' : '#141822',
            borderColor: isTurn ? colorMeta.primary : '#262D3D',
            borderWidth: isTurn ? 2 : 1.5,
          },
        ]}
        onPress={() => handleOpenPlayerStats(p)}
        activeOpacity={0.7}
      >
        <View style={styles.avatarWrap}>
          {isTurn && (
            <View
              style={[
                styles.turnGlowHalo,
                { borderColor: colorMeta.primary, borderWidth: 2 },
              ]}
            />
          )}
          <Avatar
            displayName={userInfo.displayName || p.username}
            avatarUrl={userInfo.avatarUrl}
            size="sm"
          />
          <View style={[styles.playerColorCornerBadge, { backgroundColor: colorMeta.primary }]} />
        </View>

        <View style={styles.playerMetaCol}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Text
              style={[
                styles.playerNameText,
                { color: theme.colors.textPrimary },
                isTurn && { color: colorMeta.primary, fontWeight: '800' },
              ]}
              numberOfLines={1}
            >
              {userInfo.displayName || p.username}
            </Text>
            {isMe && (
              <View style={[styles.youBadge, { backgroundColor: '#064E3B' }]}>
                <Text style={[styles.youBadgeText, { color: '#3ED598' }]}>YOU</Text>
              </View>
            )}
          </View>

          <View style={styles.playerStatsSubRow}>
            <Text style={[styles.tokensProgressText, { color: theme.colors.textSecondary }]}>
              {finishedCount}/4 Home
            </Text>
            <View style={[styles.statsIconPill, { backgroundColor: '#1E232E' }]}>
              <Icon name="info" size={10} color={theme.colors.textMuted} />
              <Text style={[styles.statsIconPillText, { color: theme.colors.textMuted }]}>Stats</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
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

      {/* Up Side Players Bar (Top Side Profiles + Dice if it's Top Side Turn) */}
      <View style={[styles.sectionRow, styles.fixedSideRow]}>
        <View style={styles.playersSideCluster}>
          {topPlayers.map((p) => renderPlayerProfileCard(p))}
        </View>

        {/* Fixed Dice Slot on Up Side */}
        <View style={styles.fixedSideDiceSlot}>
          {isTopTurn ? (
            <View style={[styles.activeSideDiceBox, { backgroundColor: theme.colors.surface }]}>
              {renderDiceFace(diceVisualFace, 44)}
              <View style={styles.diceTextCol}>
                <Text style={[styles.diceStatusLabel, { color: COLOR_MAP[turnColor]?.primary || theme.colors.primary }]}>
                  {isRolling ? 'Rolling...' : currentDiceRoll ? `Rolled ${currentDiceRoll}` : 'Turn'}
                </Text>
              </View>
            </View>
          ) : null}
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

      {/* Interactive Ludo Board (Fixed motionless container) */}
      <View style={styles.boardContainer}>
        <View
          style={[
            styles.boardWrapper,
            {
              width: BOARD_SIZE,
              height: BOARD_SIZE,
              backgroundColor: '#10131B',
            },
          ]}
        >
          {/* Static Board SVG Background */}
          <Svg width={BOARD_SIZE} height={BOARD_SIZE} viewBox={`0 0 ${BOARD_SIZE} ${BOARD_SIZE}`}>
            {/* 4 Corner Yards */}
            {/* RED Yard (Top-Left: 6x6) */}
            <Rect x={0} y={0} width={CELL_SIZE * 6} height={CELL_SIZE * 6} fill={COLOR_MAP.RED.light} stroke={COLOR_MAP.RED.primary} strokeWidth={2} />
            <Rect x={CELL_SIZE} y={CELL_SIZE} width={CELL_SIZE * 4} height={CELL_SIZE * 4} rx={16} fill="#161922" />

            {/* GREEN Yard (Top-Right: 6x6) */}
            <Rect x={CELL_SIZE * 9} y={0} width={CELL_SIZE * 6} height={CELL_SIZE * 6} fill={COLOR_MAP.GREEN.light} stroke={COLOR_MAP.GREEN.primary} strokeWidth={2} />
            <Rect x={CELL_SIZE * 10} y={CELL_SIZE} width={CELL_SIZE * 4} height={CELL_SIZE * 4} rx={16} fill="#161922" />

            {/* YELLOW Yard (Bottom-Right: 6x6) */}
            <Rect x={CELL_SIZE * 9} y={CELL_SIZE * 9} width={CELL_SIZE * 6} height={CELL_SIZE * 6} fill={COLOR_MAP.YELLOW.light} stroke={COLOR_MAP.YELLOW.primary} strokeWidth={2} />
            <Rect x={CELL_SIZE * 10} y={CELL_SIZE * 10} width={CELL_SIZE * 4} height={CELL_SIZE * 4} rx={16} fill="#161922" />

            {/* BLUE Yard (Bottom-Left: 6x6) */}
            <Rect x={0} y={CELL_SIZE * 9} width={CELL_SIZE * 6} height={CELL_SIZE * 6} fill={COLOR_MAP.BLUE.light} stroke={COLOR_MAP.BLUE.primary} strokeWidth={2} />
            <Rect x={CELL_SIZE} y={CELL_SIZE * 10} width={CELL_SIZE * 4} height={CELL_SIZE * 4} rx={16} fill="#161922" />

            {/* Yard Token Circles */}
            {(['RED', 'GREEN', 'YELLOW', 'BLUE'] as LudoColor[]).map((col) =>
              YARD_TOKEN_SLOTS[col].map(([gx, gy], i) => (
                <Circle
                  key={`${col}_slot_${i}`}
                  cx={gx * CELL_SIZE}
                  cy={gy * CELL_SIZE}
                  r={CELL_SIZE * 0.7}
                  fill="#10131B"
                  stroke={COLOR_MAP[col].primary}
                  strokeWidth={1.5}
                />
              ))
            )}

            {/* 52 Circuit Track Cells */}
            {TRACK_COORDINATES.map(([gx, gy], idx) => {
              const isSafe = SAFE_CIRCUIT_CELLS.has(idx);
              let cellFill = '#161922';
              let cellStroke = '#242836';

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
          </Svg>

          {/* Animated Tokens Layer with Dynamic Multi-Token Shrinkage */}
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
                    styles.tokenItem,
                    {
                      width: size,
                      height: size,
                      borderRadius: size / 2,
                      backgroundColor: COLOR_MAP[player.color].primary,
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
                            ? Animated.subtract(anim.pos.y, size / 2)
                            : layout.cy - size / 2,
                        },
                        { scale: anim ? anim.scale : 1 },
                      ],
                    },
                    isSelectable && styles.selectableTokenPulse,
                  ]}
                >
                  {/* Inner Pip */}
                  <View
                    style={[
                      styles.tokenInnerPip,
                      {
                        width: size * 0.36,
                        height: size * 0.36,
                        borderRadius: (size * 0.36) / 2,
                      },
                    ]}
                  />

                  {/* Touch overlay with generous hit target for effortless sensitivity */}
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

        {/* Down Side Players Bar (Bottom Side Profiles + Dice) */}
        <View style={[styles.sectionRow, styles.fixedSideRow]}>
          <View style={styles.playersSideCluster}>
            {bottomPlayers.map((p) => renderPlayerProfileCard(p))}
          </View>

          {/* Fixed Dice Slot on Down Side (Directly Tap the Dice to Roll - No Extra Button) */}
          <View style={styles.fixedSideDiceSlot}>
            {isBottomTurn ? (
              <View style={[styles.activeSideDiceBox, { backgroundColor: '#141822', borderColor: '#262D3D', borderWidth: 1.5 }]}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  disabled={!isMyTurn || hasRolled || isRolling}
                  onPress={handleRollDice}
                  style={[
                    styles.tappableDiceWrapper,
                    isMyTurn && !hasRolled && !isRolling && [
                      styles.tappableDicePulse,
                      { borderColor: theme.colors.primary, borderWidth: 2 },
                    ],
                  ]}
                  accessibilityLabel="Tap dice to roll"
                >
                  {renderDiceFace(diceVisualFace, 50)}
                </TouchableOpacity>

                <View style={styles.diceTextCol}>
                  {isMyTurn && !hasRolled ? (
                    <Text style={[styles.diceStatusLabel, { color: theme.colors.primary, fontWeight: '800' }]}>
                      {isRolling ? 'Rolling...' : 'Tap Dice'}
                    </Text>
                  ) : isMyTurn && hasRolled ? (
                    <Text style={[styles.diceStatusLabel, { color: validMoves.length > 0 ? theme.colors.primary : '#FF575F', fontWeight: '800' }]}>
                      {validMoves.length > 0 ? 'Move Token' : 'No Moves'}
                    </Text>
                  ) : (
                    <Text style={[styles.diceStatusLabel, { color: theme.colors.textSecondary }]}>
                      {isRolling ? 'Rolling...' : currentDiceRoll ? `Rolled ${currentDiceRoll}` : 'Turn'}
                    </Text>
                  )}
                </View>
              </View>
            ) : null}
          </View>
        </View>
      </View>

      {/* Toast Notification */}
      {toastMessage && (
        <View style={styles.toastContainer}>
          <Text style={styles.toastText}>{toastMessage}</Text>
        </View>
      )}

      {/* Player Stats Popup Modal */}
      <Modal
        visible={!!selectedPlayerForStats}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedPlayerForStats(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.statsModalCard, { backgroundColor: theme.colors.surfaceElevated }]}>
            {/* Header */}
            <View style={styles.statsModalHeader}>
              <Text style={[styles.statsModalTitle, { color: theme.colors.textPrimary }]}>
                Player Profile
              </Text>
              <TouchableOpacity
                style={[styles.closeIconBtn, { backgroundColor: theme.colors.surface }]}
                onPress={() => setSelectedPlayerForStats(null)}
                activeOpacity={0.7}
              >
                <Icon name="close" size={16} color={theme.colors.textSecondary} />
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
                    <Text style={[styles.statsHeroName, { color: theme.colors.textPrimary }]}>
                      {getPlayerUserInfo(selectedPlayerForStats.userId).displayName || selectedPlayerForStats.username}
                    </Text>
                    <Text style={[styles.statsHeroHandle, { color: theme.colors.textSecondary }]}>
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

                {/* Match Status Strip */}
                <View style={[styles.statsSubSection, { backgroundColor: theme.colors.surface }]}>
                  <Text style={[styles.statsSubHeading, { color: theme.colors.textSecondary }]}>
                    CURRENT MATCH PERFORMANCE
                  </Text>
                  <View style={styles.matchStatsRow}>
                    <View style={styles.matchStatBox}>
                      <Text style={[styles.matchStatVal, { color: COLOR_MAP[selectedPlayerForStats.color].primary }]}>
                        {selectedPlayerForStats.tokens.filter((t) => t.step === 56).length}/4
                      </Text>
                      <Text style={[styles.matchStatLbl, { color: theme.colors.textMuted }]}>Finished</Text>
                    </View>
                    <View style={styles.matchStatBox}>
                      <Text style={[styles.matchStatVal, { color: theme.colors.primary }]}>
                        {selectedPlayerForStats.tokens.filter((t) => t.step >= 0 && t.step < 56).length}
                      </Text>
                      <Text style={[styles.matchStatLbl, { color: theme.colors.textMuted }]}>In Play</Text>
                    </View>
                    <View style={styles.matchStatBox}>
                      <Text style={[styles.matchStatVal, { color: theme.colors.textSecondary }]}>
                        {selectedPlayerForStats.tokens.filter((t) => t.step === -1).length}
                      </Text>
                      <Text style={[styles.matchStatLbl, { color: theme.colors.textMuted }]}>Yard</Text>
                    </View>
                  </View>
                </View>

                {/* Career Stats Grid */}
                <View style={[styles.statsSubSection, { backgroundColor: theme.colors.surface }]}>
                  <Text style={[styles.statsSubHeading, { color: theme.colors.textSecondary }]}>
                    CAREER STATISTICS
                  </Text>
                  {isLoadingPlayerStats ? (
                    <View style={{ paddingVertical: 18, alignItems: 'center' }}>
                      <ActivityIndicator size="small" color={theme.colors.primary} />
                    </View>
                  ) : (
                    <View style={styles.careerStatsGrid}>
                      <View style={styles.careerStatCol}>
                        <Text style={[styles.careerStatNum, { color: theme.colors.textPrimary }]}>
                          {playerProfileStats?.stats?.totalMatches ?? 24}
                        </Text>
                        <Text style={[styles.careerStatTitle, { color: theme.colors.textSecondary }]}>
                          Total Matches
                        </Text>
                      </View>
                      <View style={styles.careerStatCol}>
                        <Text style={[styles.careerStatNum, { color: '#3ED598' }]}>
                          {playerProfileStats?.stats?.totalWins ?? 14}
                        </Text>
                        <Text style={[styles.careerStatTitle, { color: theme.colors.textSecondary }]}>
                          Victories
                        </Text>
                      </View>
                      <View style={styles.careerStatCol}>
                        <Text style={[styles.careerStatNum, { color: '#FFC542' }]}>
                          {playerProfileStats?.stats?.winRate ?? 58}%
                        </Text>
                        <Text style={[styles.careerStatTitle, { color: theme.colors.textSecondary }]}>
                          Win Rate
                        </Text>
                      </View>
                      <View style={styles.careerStatCol}>
                        <Text style={[styles.careerStatNum, { color: '#FF575F' }]}>
                          {playerProfileStats?.stats?.highestStreak ?? 4}
                        </Text>
                        <Text style={[styles.careerStatTitle, { color: theme.colors.textSecondary }]}>
                          Streak
                        </Text>
                      </View>
                    </View>
                  )}
                </View>

                {/* Close Button */}
                <TouchableOpacity
                  style={[styles.statsCloseBtn, { backgroundColor: theme.colors.primary }]}
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
                    style={[styles.modalSecondaryBtn, { backgroundColor: theme.colors.surfaceElevated }]}
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
                    style={[styles.modalSecondaryBtn, { backgroundColor: theme.colors.surfaceElevated }]}
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
    paddingVertical: 10,
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
    backgroundColor: '#1E232E',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  roundText: {
    color: '#FFC542',
    fontWeight: '800',
    fontSize: 12,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    marginVertical: 4,
    minHeight: 52,
    gap: 10,
  },
  playersSideCluster: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  playerCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 14,
    gap: 8,
  },
  avatarWrap: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  turnGlowHalo: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  playerColorCornerBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#1E293B',
  },
  playerMetaCol: {
    flex: 1,
    gap: 2,
  },
  playerNameText: {
    fontSize: 12,
    fontWeight: '700',
  },
  youBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 6,
  },
  youBadgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  playerStatsSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tokensProgressText: {
    fontSize: 10,
    fontWeight: '600',
  },
  statsIconPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  statsIconPillText: {
    fontSize: 9,
    fontWeight: '700',
  },
  fixedSideRow: {
    height: 58,
    minHeight: 58,
    maxHeight: 58,
  },
  fixedSideDiceSlot: {
    width: 104,
    height: 52,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  activeSideDiceBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 14,
    gap: 6,
  },
  diceTextCol: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 46,
  },
  tappableDiceWrapper: {
    padding: 2,
    borderRadius: 10,
  },
  tappableDicePulse: {
    borderWidth: 2,
    shadowColor: '#3ED598',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 4,
  },
  tapDiceCtaText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.6,
    textAlign: 'center',
  },
  diceStatusLabel: {
    fontSize: 10,
    fontWeight: '700',
    minWidth: 44,
    textAlign: 'center',
  },
  turnBanner: {
    marginHorizontal: 14,
    borderRadius: 14,
    padding: 10,
    marginVertical: 4,
  },
  turnInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  turnColorIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
  },
  turnStatusText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  timerBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: '#1E232E',
  },
  timerText: {
    fontSize: 12,
    fontWeight: '800',
  },
  timerBarTrack: {
    height: 4,
    backgroundColor: '#161922',
    borderRadius: 2,
    overflow: 'hidden',
  },
  timerBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  boardContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
  },
  boardWrapper: {
    borderRadius: 22,
    overflow: 'hidden',
    position: 'relative',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
  tokenItem: {
    position: 'absolute',
    left: 0,
    top: 0,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
    elevation: 6,
  },
  tokenTouchHitBox: {
    position: 'absolute',
    top: -16,
    bottom: -16,
    left: -16,
    right: -16,
    zIndex: 50,
  },
  tokenInnerPip: {
    backgroundColor: '#FFFFFF',
  },
  selectableTokenPulse: {
    borderColor: '#3ED598',
    borderWidth: 3,
    shadowColor: '#3ED598',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 12,
  },
  toastContainer: {
    position: 'absolute',
    bottom: 24,
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  statsModalCard: {
    width: '100%',
    maxWidth: 380,
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
    fontSize: 18,
    fontWeight: '800',
  },
  closeIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
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
    fontSize: 17,
    fontWeight: '800',
  },
  statsHeroHandle: {
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
    borderRadius: 16,
    padding: 12,
    gap: 10,
  },
  statsSubHeading: {
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
    fontSize: 16,
    fontWeight: '800',
  },
  careerStatTitle: {
    fontSize: 10,
    fontWeight: '600',
  },
  statsCloseBtn: {
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  statsCloseBtnText: {
    color: '#18080C',
    fontSize: 14,
    fontWeight: '800',
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
  },
  trophyIconWrapper: {
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 16,
    textAlign: 'center',
  },
  rankingsList: {
    width: '100%',
    gap: 8,
    marginBottom: 20,
  },
  rankingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    backgroundColor: '#1E232E',
  },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#272C38',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  rankBadgeText: {
    color: '#FFC542',
    fontWeight: '800',
    fontSize: 12,
  },
  rankingColorPill: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  rankingName: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
  },
  rankingScore: {
    fontSize: 12,
    fontWeight: '600',
  },
  modalActions: {
    width: '100%',
    gap: 10,
  },
  modalPrimaryBtn: {
    width: '100%',
    height: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalPrimaryBtnText: {
    color: '#18080C',
    fontSize: 14,
    fontWeight: '800',
  },
  modalSecondaryBtn: {
    width: '100%',
    height: 50,
    borderRadius: 14,
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
    paddingVertical: 12,
    gap: 10,
  },
  waitingRematchText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
