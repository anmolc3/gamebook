import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Modal,
  ScrollView,
  Dimensions,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, {
  Rect,
  Circle,
  Path,
  Line,
  G,
  Text as SvgText,
} from 'react-native-svg';
import { useTheme } from '../../theme';
import { TrophyIcon, CrownIcon, StarIcon, InfoIcon } from '../../icons';
import { Avatar } from '../../components/atoms/Avatar';
import { GameRulesModal } from '../../components';
import { useAuth } from '../../features/auth/AuthContext';
import { MobileSocketService } from '../../services/socket.service';
import { RoomPlayer, RoomDetails } from '../../services/room.service';

export type CasualGameType =
  | 'POOL_8_BALL'
  | 'MINI_GOLF'
  | 'AIR_HOCKEY'
  | 'DARTS'
  | 'BOWLING'
  | 'TABLE_TENNIS';

export interface CasualGameScreenProps {
  roomCode: string;
  gameType: CasualGameType;
  roomDetails?: RoomDetails | null;
  onLeave: () => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BOARD_SIZE = Math.min(SCREEN_WIDTH - 28, 380);

export const CasualGameScreen: React.FC<CasualGameScreenProps> = ({
  roomCode,
  gameType,
  roomDetails,
  onLeave,
}) => {
  const { theme } = useTheme();
  const { user } = useAuth();

  // Match Authoritative State
  const [gameState, setGameState] = useState<any>(null);
  const [round, setRound] = useState<number>(1);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [playerList, setPlayerList] = useState<RoomPlayer[]>(roomDetails?.players || []);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(30);
  const [isRulesModalVisible, setIsRulesModalVisible] = useState<boolean>(false);
  const [rematchModalVisible, setRematchModalVisible] = useState<boolean>(false);
  const [rematchOfferPending, setRematchOfferPending] = useState<boolean>(false);
  const [gameResult, setGameResult] = useState<any>(null);

  // Casual Game Control States
  const [aimAngle, setAimAngle] = useState<number>(0);
  const [powerLevel, setPowerLevel] = useState<number>(60);
  const [targetCoord, setTargetCoord] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [shotType, setShotType] = useState<string>('TOPSPIN');
  const [bowlingSpin, setBowlingSpin] = useState<number>(0);

  const turnTimerRef = useRef<any>(null);

  const isMyTurn = gameState?.turnPlayerId === user?.id;

  // --------------------------------------------------------------------------
  // Socket.IO Listeners
  // --------------------------------------------------------------------------
  useEffect(() => {
    MobileSocketService.connect();
    MobileSocketService.getSocket()?.emit('room:join', { roomCode });

    MobileSocketService.getGameState(roomCode)
      .then((res) => {
        if (res && res.state) {
          setGameState(res.state);
          if (res.scores) setScores(res.scores);
          if (res.round) setRound(res.round);
          if (res.players) setPlayerList(res.players);
        }
      })
      .catch((err) => console.log('Could not fetch initial game state:', err));

    const unsubState = MobileSocketService.onGameState((payload) => {
      if (payload.roomCode === roomCode) {
        if (payload.state) setGameState(payload.state);
        if (payload.scores) setScores(payload.scores);
        if (payload.round) setRound(payload.round);
        if (payload.players) setPlayerList(payload.players);
      }
    });

    const unsubOver = MobileSocketService.onGameOver((payload) => {
      if (payload.roomCode === roomCode) {
        setGameResult(payload);
        if (payload.scores) setScores(payload.scores);
        setRematchModalVisible(true);
      }
    });

    const unsubRematch = MobileSocketService.onRematchOffered((payload) => {
      if (payload.roomCode === roomCode && payload.offeredByUserId !== user?.id) {
        Alert.alert(
          'Rematch Challenge',
          `${payload.fromUsername || 'Opponent'} offered a rematch!`,
          [
            { text: 'Decline', style: 'cancel' },
            {
              text: 'Accept',
              onPress: () => {
                MobileSocketService.respondRematch(roomCode, true);
              },
            },
          ]
        );
      }
    });

    const unsubStart = MobileSocketService.onGameStarted((payload: any) => {
      if (payload.roomCode === roomCode) {
        setRematchModalVisible(false);
        setRematchOfferPending(false);
        setGameResult(null);
        if (payload.state) setGameState(payload.state);
        if (payload.scores) setScores(payload.scores);
        if (payload.round) setRound(payload.round);
        if (payload.players) setPlayerList(payload.players);
      }
    });

    return () => {
      unsubState();
      unsubOver();
      unsubRematch();
      unsubStart();
    };
  }, [roomCode, user?.id]);

  // Turn Countdown Timer
  useEffect(() => {
    if (turnTimerRef.current) clearInterval(turnTimerRef.current);

    if (gameState?.turnExpiresAt) {
      const updateClock = () => {
        const diff = Math.max(
          0,
          Math.floor((gameState.turnExpiresAt - Date.now()) / 1000)
        );
        setSecondsRemaining(diff);
      };
      updateClock();
      turnTimerRef.current = setInterval(updateClock, 1000);
    }

    return () => {
      if (turnTimerRef.current) clearInterval(turnTimerRef.current);
    };
  }, [gameState?.turnExpiresAt]);

  // Dispatch Action Helper
  const sendAction = useCallback(
    (action: any) => {
      if (!isMyTurn) return;
      MobileSocketService.sendGameAction(roomCode, action);
    },
    [roomCode, isMyTurn]
  );

  // Rematch request
  const requestRematch = () => {
    setRematchOfferPending(true);
    MobileSocketService.requestRematch(roomCode);
  };

  // Players resolution
  const p1Name = playerList[0]?.user?.displayName || playerList[0]?.user?.username || 'Player 1';
  const p2Name = playerList[1]?.user?.displayName || playerList[1]?.user?.username || 'Player 2';
  const p1Id = playerList[0]?.userId || 'p1';
  const p2Id = playerList[1]?.userId || 'p2';

  const getGameTitle = () => {
    switch (gameType) {
      case 'POOL_8_BALL':
        return '8 Ball Pool Arena';
      case 'MINI_GOLF':
        return 'Mini Golf Battle';
      case 'AIR_HOCKEY':
        return 'Air Hockey';
      case 'DARTS':
        return 'Darts 501';
      case 'BOWLING':
        return 'Bowling Strike';
      case 'TABLE_TENNIS':
        return 'Table Tennis Duel';
      default:
        return 'Arcade Arena';
    }
  };

  // --------------------------------------------------------------------------
  // Vector SVG Renderers
  // --------------------------------------------------------------------------

  // 1. 8 Ball Pool Arena
  const renderPoolBoard = () => {
    const balls = gameState?.balls || [];
    return (
      <View style={styles.boardWrapper}>
        <Svg width={BOARD_SIZE} height={BOARD_SIZE * 0.55} viewBox="0 0 1000 550">
          {/* Wood rail border */}
          <Rect x="0" y="0" width="1000" height="550" rx="30" fill="#4A2E18" />
          <Rect x="20" y="20" width="960" height="510" rx="20" fill="#2E1B0D" />
          {/* Green Baize Felt */}
          <Rect x="40" y="40" width="920" height="470" rx="10" fill="#0E6038" />

          {/* 6 Pockets */}
          {[
            { cx: 45, cy: 45 },
            { cx: 500, cy: 38 },
            { cx: 955, cy: 45 },
            { cx: 45, cy: 505 },
            { cx: 500, cy: 512 },
            { cx: 955, cy: 505 },
          ].map((p, idx) => (
            <G key={`pocket-${idx}`}>
              <Circle cx={p.cx} cy={p.cy} r="28" fill="#111111" />
              <Circle cx={p.cx} cy={p.cy} r="24" fill="#050505" />
            </G>
          ))}

          {/* Headstring kitchen line */}
          <Line x1="280" y1="40" x2="280" y2="510" stroke="#147547" strokeWidth="2" strokeDasharray="6 4" />
          <Circle cx="280" cy="275" r="5" fill="#147547" />

          {/* Render Pool Balls */}
          {balls.map((b: any) => {
            if (b.isPocketed) return null;
            const isCue = b.id === 0;
            const isEight = b.id === 8;
            const isSolid = b.type === 'SOLID';
            const ballFill = isCue
              ? '#FFFFFF'
              : isEight
              ? '#111111'
              : isSolid
              ? '#FF575F'
              : '#FFC542';

            return (
              <G key={`ball-${b.id}`}>
                <Circle cx={b.x} cy={b.y} r="14" fill="#000000" opacity="0.3" />
                <Circle cx={b.x} cy={b.y} r="13" fill={ballFill} stroke="#FFFFFF" strokeWidth={isCue ? 1.5 : 0.5} />
                {!isCue && (
                  <SvgText
                    x={b.x}
                    y={b.y + 4}
                    fontSize="9"
                    fontWeight="bold"
                    fill={isEight ? '#FFFFFF' : '#1F2C34'}
                    textAnchor="middle"
                  >
                    {b.id}
                  </SvgText>
                )}
              </G>
            );
          })}

          {/* Aiming Guide Indicator for Cue Ball */}
          {isMyTurn && (
            <Line
              x1="250"
              y1="250"
              x2={250 + Math.cos((aimAngle * Math.PI) / 180) * 80}
              y2={250 + Math.sin((aimAngle * Math.PI) / 180) * 80}
              stroke="#3ED598"
              strokeWidth="3"
              strokeDasharray="4 3"
            />
          )}
        </Svg>
      </View>
    );
  };

  // 2. Mini Golf Battle
  const renderGolfBoard = () => {
    const hole = gameState?.holes?.[gameState?.currentHoleIndex || 0] || {
      tee: { x: 100, y: 250 },
      cup: { x: 850, y: 250 },
      obstacles: [],
    };
    const players = gameState?.players || [];

    return (
      <View style={styles.boardWrapper}>
        <Svg width={BOARD_SIZE} height={BOARD_SIZE * 0.55} viewBox="0 0 1000 500">
          {/* Fairway Grass */}
          <Rect x="0" y="0" width="1000" height="500" rx="24" fill="#1B4D2B" />
          <Rect x="20" y="20" width="960" height="460" rx="16" fill="#2E7D32" />

          {/* Obstacles */}
          {hole.obstacles?.map((obs: any, idx: number) => {
            const fill = obs.type === 'WATER' ? '#1E88E5' : obs.type === 'SAND' ? '#D4A373' : '#4E342E';
            return (
              <Rect
                key={`obs-${idx}`}
                x={obs.x}
                y={obs.y}
                width={obs.width}
                height={obs.height}
                rx={obs.type === 'WATER' ? 20 : 6}
                fill={fill}
              />
            );
          })}

          {/* Hole Cup */}
          <Circle cx={hole.cup.x} cy={hole.cup.y} r="22" fill="#111111" />
          <Circle cx={hole.cup.x} cy={hole.cup.y} r="16" fill="#000000" />
          {/* Flag Pin */}
          <Line x1={hole.cup.x} y1={hole.cup.y} x2={hole.cup.x} y2={hole.cup.y - 45} stroke="#FFFFFF" strokeWidth="3" />
          <Path d={`M ${hole.cup.x} ${hole.cup.y - 45} L ${hole.cup.x - 28} ${hole.cup.y - 32} L ${hole.cup.x} ${hole.cup.y - 20} Z`} fill="#FF575F" />

          {/* Player Balls */}
          {players.map((p: any, idx: number) => (
            <G key={`ball-${idx}`}>
              <Circle
                cx={p.ballPosition?.x || hole.tee.x}
                cy={p.ballPosition?.y || hole.tee.y}
                r="12"
                fill={idx === 0 ? '#FFFFFF' : '#FFC542'}
                stroke="#1F2C34"
                strokeWidth="1.5"
              />
            </G>
          ))}
        </Svg>
      </View>
    );
  };

  // 3. Air Hockey
  const renderAirHockeyBoard = () => {
    const puck = gameState?.puck || { x: 400, y: 600 };
    const mallets = gameState?.mallets || {
      player1: { x: 400, y: 1050 },
      player2: { x: 400, y: 150 },
    };

    return (
      <View style={styles.boardWrapper}>
        <Svg width={BOARD_SIZE * 0.7} height={BOARD_SIZE} viewBox="0 0 800 1200">
          {/* Table surface */}
          <Rect x="0" y="0" width="800" height="1200" rx="30" fill="#0F172A" />
          <Rect x="20" y="20" width="760" height="1160" rx="20" fill="#1E293B" stroke="#38BDF8" strokeWidth="6" />

          {/* Center Dividing Line & Circle */}
          <Line x1="20" y1="600" x2="780" y2="600" stroke="#FF575F" strokeWidth="6" />
          <Circle cx="400" cy="600" r="120" stroke="#FF575F" strokeWidth="4" fill="none" />
          <Circle cx="400" cy="600" r="14" fill="#FF575F" />

          {/* Top & Bottom Goal Openings */}
          <Rect x="240" y="20" width="320" height="24" fill="#0284C7" rx="4" />
          <Rect x="240" y="1156" width="320" height="24" fill="#0284C7" rx="4" />

          {/* Player 2 Mallet (Top) */}
          <Circle cx={mallets.player2.x} cy={mallets.player2.y} r="48" fill="#EF4444" stroke="#FCA5A5" strokeWidth="4" />
          <Circle cx={mallets.player2.x} cy={mallets.player2.y} r="22" fill="#991B1B" />

          {/* Player 1 Mallet (Bottom) */}
          <Circle cx={mallets.player1.x} cy={mallets.player1.y} r="48" fill="#3B82F6" stroke="#93C5FD" strokeWidth="4" />
          <Circle cx={mallets.player1.x} cy={mallets.player1.y} r="22" fill="#1E40AF" />

          {/* Puck */}
          <Circle cx={puck.x} cy={puck.y} r="32" fill="#FFD700" stroke="#F59E0B" strokeWidth="4" />
          <Circle cx={puck.x} cy={puck.y} r="14" fill="#B45309" />
        </Svg>
      </View>
    );
  };

  // 4. Darts 501
  const renderDartsBoard = () => {
    const center = BOARD_SIZE / 2;
    const sectors = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];

    return (
      <View style={styles.boardWrapper}>
        <Svg width={BOARD_SIZE} height={BOARD_SIZE} viewBox={`0 0 ${BOARD_SIZE} ${BOARD_SIZE}`}>
          {/* Black outer cabinet */}
          <Circle cx={center} cy={center} r={center - 4} fill="#0F172A" stroke="#334155" strokeWidth="6" />

          {/* Sectors */}
          {sectors.map((sec, idx) => {
            const startAngle = (idx * 18 - 99) * (Math.PI / 180);
            const endAngle = ((idx + 1) * 18 - 99) * (Math.PI / 180);
            const r = center - 26;
            const x1 = center + r * Math.cos(startAngle);
            const y1 = center + r * Math.sin(startAngle);
            const x2 = center + r * Math.cos(endAngle);
            const y2 = center + r * Math.sin(endAngle);

            const isEven = idx % 2 === 0;
            const sectorColor = isEven ? '#1E293B' : '#E2E8F0';

            return (
              <G key={`sec-${sec}`}>
                <Path
                  d={`M ${center} ${center} L ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2} Z`}
                  fill={sectorColor}
                />
                {/* Sector Number */}
                <SvgText
                  x={center + (r + 14) * Math.cos((startAngle + endAngle) / 2)}
                  y={center + (r + 14) * Math.sin((startAngle + endAngle) / 2) + 4}
                  fill="#F8FAFC"
                  fontSize="10"
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  {sec}
                </SvgText>
              </G>
            );
          })}

          {/* Triple Ring */}
          <Circle cx={center} cy={center} r={(center - 26) * 0.62} stroke="#EF4444" strokeWidth="10" fill="none" />
          {/* Double Ring */}
          <Circle cx={center} cy={center} r={center - 26} stroke="#22C55E" strokeWidth="10" fill="none" />
          {/* Outer Bull */}
          <Circle cx={center} cy={center} r="22" fill="#22C55E" stroke="#15803D" strokeWidth="2" />
          {/* Bullseye */}
          <Circle cx={center} cy={center} r="10" fill="#EF4444" stroke="#B91C1C" strokeWidth="2" />

          {/* Aim Reticle */}
          {isMyTurn && (
            <G>
              <Circle
                cx={center + targetCoord.x}
                cy={center + targetCoord.y}
                r="14"
                stroke="#3ED598"
                strokeWidth="2"
                fill="none"
              />
              <Line
                x1={center + targetCoord.x - 18}
                y1={center + targetCoord.y}
                x2={center + targetCoord.x + 18}
                y2={center + targetCoord.y}
                stroke="#3ED598"
                strokeWidth="2"
              />
              <Line
                x1={center + targetCoord.x}
                y1={center + targetCoord.y - 18}
                x2={center + targetCoord.x}
                y2={center + targetCoord.y + 18}
                stroke="#3ED598"
                strokeWidth="2"
              />
            </G>
          )}
        </Svg>
      </View>
    );
  };

  // 5. Bowling Strike
  const renderBowlingBoard = () => {
    const standingPins = gameState?.standingPins || [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const pinCoords: Record<number, { x: number; y: number }> = {
      1: { x: 200, y: 130 },
      2: { x: 175, y: 100 },
      3: { x: 225, y: 100 },
      4: { x: 150, y: 70 },
      5: { x: 200, y: 70 },
      6: { x: 250, y: 70 },
      7: { x: 125, y: 40 },
      8: { x: 175, y: 40 },
      9: { x: 225, y: 40 },
      10: { x: 275, y: 40 },
    };

    return (
      <View style={styles.boardWrapper}>
        <Svg width={BOARD_SIZE} height={BOARD_SIZE * 0.75} viewBox="0 0 400 300">
          {/* Parquet Lane */}
          <Rect x="50" y="10" width="300" height="280" fill="#E2BA84" />
          {/* Gutters */}
          <Rect x="20" y="10" width="30" height="280" fill="#1E293B" />
          <Rect x="350" y="10" width="30" height="280" fill="#1E293B" />

          {/* Lane Boards */}
          {[100, 150, 200, 250, 300].map((x) => (
            <Line key={`lane-${x}`} x1={x} y1="10" x2={x} y2="290" stroke="#C69E68" strokeWidth="1" />
          ))}

          {/* Approach Arrows */}
          {[120, 160, 200, 240, 280].map((ax) => (
            <Path key={`arr-${ax}`} d={`M ${ax} 230 L ${ax - 6} 242 L ${ax + 6} 242 Z`} fill="#8D5B2C" />
          ))}

          {/* 10 Bowling Pins */}
          {Object.entries(pinCoords).map(([pinStr, coord]) => {
            const pinNum = parseInt(pinStr, 10);
            const isStanding = standingPins.includes(pinNum);
            return (
              <G key={`pin-${pinNum}`} opacity={isStanding ? 1 : 0.2}>
                <Circle cx={coord.x} cy={coord.y} r="10" fill="#FFFFFF" stroke="#EF4444" strokeWidth="2.5" />
                <Circle cx={coord.x} cy={coord.y} r="4" fill="#FFFFFF" />
              </G>
            );
          })}

          {/* Bowling Ball at bottom */}
          <Circle cx="200" cy="270" r="16" fill="#1E1B4B" stroke="#4338CA" strokeWidth="2" />
          <Circle cx="196" cy="266" r="2.5" fill="#FFFFFF" />
          <Circle cx="204" cy="266" r="2.5" fill="#FFFFFF" />
          <Circle cx="200" cy="274" r="2.5" fill="#FFFFFF" />
        </Svg>
      </View>
    );
  };

  // 6. Table Tennis Duel
  const renderTableTennisBoard = () => {
    const ball = gameState?.ball || { x: 0, y: 100 };

    return (
      <View style={styles.boardWrapper}>
        <Svg width={BOARD_SIZE} height={BOARD_SIZE * 0.75} viewBox="0 0 400 300">
          {/* Blue Table Surface */}
          <Rect x="40" y="20" width="320" height="260" rx="10" fill="#0284C7" stroke="#FFFFFF" strokeWidth="4" />
          {/* Center Dividing White Line */}
          <Line x1="40" y1="150" x2="360" y2="150" stroke="#FFFFFF" strokeWidth="3" />
          <Line x1="200" y1="20" x2="200" y2="280" stroke="#FFFFFF" strokeWidth="2" />

          {/* Net in center */}
          <Rect x="30" y="146" width="340" height="8" fill="#F8FAFC" opacity="0.8" />
          <Line x1="30" y1="146" x2="370" y2="146" stroke="#0F172A" strokeWidth="1" strokeDasharray="3 2" />

          {/* Player 1 Paddle (Bottom) */}
          <Circle cx="200" cy="260" r="18" fill="#EF4444" stroke="#B91C1C" strokeWidth="3" />
          <Rect x="197" y="275" width="6" height="15" fill="#D4A373" rx="2" />

          {/* Player 2 Paddle (Top) */}
          <Circle cx="200" cy="40" r="18" fill="#1E293B" stroke="#0F172A" strokeWidth="3" />
          <Rect x="197" y="15" width="6" height="15" fill="#D4A373" rx="2" />

          {/* Ping Pong Ball */}
          <Circle
            cx={200 + ball.x}
            cy={150 + (ball.tableSide === 'PLAYER1' ? 40 : -40)}
            r="8"
            fill="#FFFFFF"
            stroke="#E2E8F0"
            strokeWidth="1.5"
          />
        </Svg>
      </View>
    );
  };

  // Switch renderer
  const renderGameBoard = () => {
    switch (gameType) {
      case 'POOL_8_BALL':
        return renderPoolBoard();
      case 'MINI_GOLF':
        return renderGolfBoard();
      case 'AIR_HOCKEY':
        return renderAirHockeyBoard();
      case 'DARTS':
        return renderDartsBoard();
      case 'BOWLING':
        return renderBowlingBoard();
      case 'TABLE_TENNIS':
        return renderTableTennisBoard();
      default:
        return null;
    }
  };

  // --------------------------------------------------------------------------
  // Action Handlers
  // --------------------------------------------------------------------------
  const handlePrimaryAction = () => {
    if (!isMyTurn) return;

    switch (gameType) {
      case 'POOL_8_BALL':
        sendAction({
          type: 'STRIKE',
          angle: aimAngle,
          power: powerLevel,
        });
        break;
      case 'MINI_GOLF':
        sendAction({
          type: 'PUTT',
          angle: aimAngle,
          power: powerLevel,
        });
        break;
      case 'AIR_HOCKEY':
        sendAction({
          type: 'STRIKE_PUCK',
          x: 400,
          y: user?.id === p1Id ? 800 : 400,
          strikeAngle: user?.id === p1Id ? -90 : 90,
          strikePower: powerLevel,
        });
        break;
      case 'DARTS':
        sendAction({
          type: 'THROW_DART',
          x: targetCoord.x,
          y: targetCoord.y,
        });
        break;
      case 'BOWLING':
        sendAction({
          type: 'ROLL_BALL',
          lanePosition: targetCoord.x,
          angle: aimAngle,
          speed: powerLevel,
          spin: bowlingSpin,
        });
        break;
      case 'TABLE_TENNIS':
        sendAction({
          type: gameState?.rallyCount === 0 ? 'SERVE' : 'RETURN',
          shotType: shotType as any,
          targetX: targetCoord.x,
          targetY: 50,
          power: powerLevel,
        });
        break;
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle={theme.mode === 'dark' ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity style={styles.backBtn} onPress={onLeave} activeOpacity={0.8}>
          <Text style={[styles.backText, { color: theme.colors.textPrimary }]}>‹ Room</Text>
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>{getGameTitle()}</Text>
          <Text style={[styles.headerSubtitle, { color: theme.colors.textSecondary }]}>
            Room {roomCode} • Round {round}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <TouchableOpacity
            style={[styles.timerBadge, { backgroundColor: theme.colors.cardTintMint, paddingHorizontal: 8 }]}
            onPress={() => setIsRulesModalVisible(true)}
            activeOpacity={0.7}
            accessibilityLabel="Game Rules & Steps"
          >
            <InfoIcon size={18} color={theme.colors.primary} />
          </TouchableOpacity>
          <View style={styles.timerBadge}>
            <Text style={styles.timerText}>{secondsRemaining}s</Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.contentScroll} showsVerticalScrollIndicator={false}>
        {/* Player Versus HUD */}
        <View style={[styles.hudCard, { backgroundColor: '#141822', borderColor: '#262D3D', borderWidth: 1.5 }]}>
          {/* Player 1 */}
          <View style={[styles.playerCol, gameState?.turnPlayerId === p1Id && styles.activePlayerCol]}>
            <Avatar size="md" displayName={p1Name} />
            <Text style={[styles.playerName, { color: theme.colors.textPrimary }]} numberOfLines={1}>
              {p1Name}
            </Text>
            <Text style={[styles.playerScore, { color: theme.colors.accentMint }]}>
              {scores[p1Id] || 0} pts
            </Text>
          </View>

          <View style={styles.vsBadge}>
            <Text style={styles.vsText}>VS</Text>
          </View>

          {/* Player 2 */}
          <View style={[styles.playerCol, gameState?.turnPlayerId === p2Id && styles.activePlayerCol]}>
            <Avatar size="md" displayName={p2Name} />
            <Text style={[styles.playerName, { color: theme.colors.textPrimary }]} numberOfLines={1}>
              {p2Name}
            </Text>
            <Text style={[styles.playerScore, { color: theme.colors.accentAmber }]}>
              {scores[p2Id] || 0} pts
            </Text>
          </View>
        </View>

        {/* Turn Status Alert Banner */}
        <View style={[styles.turnBanner, { backgroundColor: isMyTurn ? '#064E3B' : '#1E293B' }]}>
          <StarIcon size={16} color={isMyTurn ? '#3ED598' : '#94A3B8'} />
          <Text style={[styles.turnBannerText, { color: isMyTurn ? '#3ED598' : '#94A3B8' }]}>
            {isMyTurn ? 'Your Turn to Play!' : 'Waiting for opponent move...'}
          </Text>
        </View>

        {/* The Game Board */}
        {renderGameBoard()}

        {/* Interactive Game Action Bar */}
        <View style={[styles.controlsCard, { backgroundColor: theme.colors.surface }]}>
          {/* Angle Aiming Controls */}
          {['POOL_8_BALL', 'MINI_GOLF', 'BOWLING'].includes(gameType) && (
            <View style={styles.controlRow}>
              <Text style={[styles.controlLabel, { color: theme.colors.textSecondary }]}>Aim Angle: {aimAngle}°</Text>
              <View style={styles.btnGroup}>
                <TouchableOpacity
                  style={[styles.smallBtn, { backgroundColor: theme.colors.surfaceElevated }]}
                  onPress={() => setAimAngle((prev) => Math.max(-85, prev - 15))}
                >
                  <Text style={[styles.smallBtnText, { color: theme.colors.textPrimary }]}>-15°</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.smallBtn, { backgroundColor: theme.colors.surfaceElevated }]}
                  onPress={() => setAimAngle((prev) => Math.min(85, prev + 15))}
                >
                  <Text style={[styles.smallBtnText, { color: theme.colors.textPrimary }]}>+15°</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Power Selector */}
          <View style={styles.controlRow}>
            <Text style={[styles.controlLabel, { color: theme.colors.textSecondary }]}>Power: {powerLevel}%</Text>
            <View style={styles.btnGroup}>
              {[30, 60, 90].map((p) => (
                <TouchableOpacity
                  key={`p-${p}`}
                  style={[
                    styles.powerBtn,
                    powerLevel === p
                      ? { backgroundColor: theme.colors.primary }
                      : { backgroundColor: theme.colors.surfaceElevated },
                  ]}
                  onPress={() => setPowerLevel(p)}
                >
                  <Text
                    style={[
                      styles.powerBtnText,
                      { color: powerLevel === p ? '#1F2C34' : theme.colors.textPrimary },
                    ]}
                  >
                    {p}%
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Shot Type for Table Tennis */}
          {gameType === 'TABLE_TENNIS' && (
            <View style={styles.controlRow}>
              <Text style={[styles.controlLabel, { color: theme.colors.textSecondary }]}>Spin:</Text>
              <View style={styles.btnGroup}>
                {['TOPSPIN', 'BACKSPIN', 'SMASH'].map((st) => (
                  <TouchableOpacity
                    key={`st-${st}`}
                    style={[
                      styles.powerBtn,
                      shotType === st
                        ? { backgroundColor: theme.colors.primary }
                        : { backgroundColor: theme.colors.surfaceElevated },
                    ]}
                    onPress={() => setShotType(st)}
                  >
                    <Text
                      style={[
                        styles.powerBtnText,
                        { color: shotType === st ? '#1F2C34' : theme.colors.textPrimary },
                      ]}
                    >
                      {st}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Main Action Trigger Button */}
          <TouchableOpacity
            style={[
              styles.actionSubmitBtn,
              { backgroundColor: isMyTurn ? theme.colors.primary : theme.colors.border },
            ]}
            onPress={handlePrimaryAction}
            disabled={!isMyTurn}
            activeOpacity={0.8}
          >
            <Text style={styles.actionSubmitText}>
              {gameType === 'POOL_8_BALL'
                ? 'Strike Cue Ball'
                : gameType === 'MINI_GOLF'
                ? 'Putt Golf Ball'
                : gameType === 'AIR_HOCKEY'
                ? 'Hit Puck'
                : gameType === 'DARTS'
                ? 'Throw Dart'
                : gameType === 'BOWLING'
                ? 'Roll Bowling Ball'
                : 'Hit Table Tennis Return'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Rematch Handshake Modal */}
      <Modal visible={rematchModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.colors.surface }]}>
            <TrophyIcon size={56} color="#FFC542" />
            <Text style={[styles.modalTitle, { color: theme.colors.textPrimary }]}>Match Concluded!</Text>
            <Text style={[styles.modalSubtitle, { color: theme.colors.textSecondary }]}>
              {gameResult?.winnerId === user?.id ? '🎉 You are Victorious!' : 'Good Game! Rematch?'}
            </Text>

            <TouchableOpacity
              style={[styles.modalBtn, { backgroundColor: theme.colors.primary }]}
              onPress={requestRematch}
              disabled={rematchOfferPending}
              activeOpacity={0.8}
            >
              <Text style={styles.modalBtnText}>
                {rematchOfferPending ? 'Waiting for Opponent...' : 'Request Rematch'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modalSecondaryBtn, { borderColor: theme.colors.border }]}
              onPress={onLeave}
              activeOpacity={0.8}
            >
              <Text style={[styles.modalSecondaryText, { color: theme.colors.textSecondary }]}>
                Return to Lobby
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <GameRulesModal
        visible={isRulesModalVisible}
        gameType={gameType}
        gameTitle={getGameTitle()}
        category="CASUAL"
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
    borderBottomWidth: 1,
  },
  backBtn: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  backText: {
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitleWrap: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  timerBadge: {
    backgroundColor: '#FF575F',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  timerText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  contentScroll: {
    padding: 14,
    alignItems: 'center',
  },
  hudCard: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 14,
    borderRadius: 25,
    marginBottom: 12,
  },
  playerCol: {
    alignItems: 'center',
    padding: 8,
    borderRadius: 16,
    minWidth: 100,
    backgroundColor: '#161922',
    borderWidth: 1.5,
    borderColor: '#262D3D',
  },
  activePlayerCol: {
    borderWidth: 2,
    borderColor: '#3ED598',
    backgroundColor: '#133526',
  },
  playerName: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 6,
  },
  playerScore: {
    fontSize: 14,
    fontWeight: '800',
    marginTop: 2,
  },
  vsBadge: {
    backgroundColor: '#1E232E',
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vsText: {
    color: '#FFC542',
    fontWeight: '800',
    fontSize: 12,
  },
  turnBanner: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 12,
    marginBottom: 12,
    gap: 8,
  },
  turnBannerText: {
    fontSize: 13,
    fontWeight: '700',
  },
  boardWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 8,
  },
  controlsCard: {
    width: '100%',
    padding: 16,
    borderRadius: 25,
    marginTop: 14,
    gap: 12,
  },
  controlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  controlLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  btnGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  smallBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  smallBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  powerBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  powerBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  actionSubmitBtn: {
    height: 54,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  actionSubmitText: {
    color: '#1F2C34',
    fontSize: 16,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 340,
    padding: 24,
    borderRadius: 25,
    alignItems: 'center',
    gap: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginTop: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
  modalBtn: {
    width: '100%',
    height: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  modalBtnText: {
    color: '#1F2C34',
    fontSize: 15,
    fontWeight: '700',
  },
  modalSecondaryBtn: {
    width: '100%',
    height: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  modalSecondaryText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
