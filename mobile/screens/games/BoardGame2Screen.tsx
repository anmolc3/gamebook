import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Modal,
  ScrollView,
  Dimensions,
  Alert,
} from 'react-native';
import Svg, {
  Rect,
  Circle,
  Path,
  Line,
  Polygon,
  G,
  Text as SvgText,
} from 'react-native-svg';
import { useTheme } from '../../theme';
import { Icon, TrophyIcon, CrownIcon, StarIcon } from '../../icons';
import { Avatar } from '../../components/atoms/Avatar';
import { GameRulesModal } from '../../components';
import { useAuth } from '../../features/auth/AuthContext';
import { MobileSocketService } from '../../services/socket.service';
import { RoomPlayer, RoomDetails } from '../../services/room.service';

export interface BoardGame2ScreenProps {
  roomCode: string;
  gameType:
    | 'CARROM'
    | 'SNAKES_AND_LADDERS'
    | 'BATTLESHIP'
    | 'DOMINOES'
    | 'BACKGAMMON'
    | 'MANCALA'
    | 'CHINESE_CHECKERS';
  roomDetails?: RoomDetails | null;
  onLeave: () => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BOARD_SIZE = Math.min(SCREEN_WIDTH - 28, 380);

export const BoardGame2Screen: React.FC<BoardGame2ScreenProps> = ({
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
  const [isMatchOver, setIsMatchOver] = useState<boolean>(false);

  // Turn Countdown
  const [secondsRemaining, setSecondsRemaining] = useState<number>(30);
  const countdownIntervalRef = useRef<any>(null);

  // UI / Interaction State
  const [isRulesModalVisible, setIsRulesModalVisible] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<any>(null);

  // Battleship tab: 'radar' (enemy waters to fire) vs 'defense' (own ships)
  const [battleshipTab, setBattleshipTab] = useState<'radar' | 'defense'>('radar');

  // Carrom Controls
  const [carromStrikerX, setCarromStrikerX] = useState<number>(50);
  const [carromPower, setCarromPower] = useState<number>(75);

  // Rematch State
  const [isRematchModalVisible, setIsRematchModalVisible] = useState<boolean>(false);
  const [rematchRequestedByMe, setRematchRequestedByMe] = useState<boolean>(false);
  const [rematchOfferedByPeer, setRematchOfferedByPeer] = useState<boolean>(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2600);
  };

  const turnPlayerId = gameState?.turnPlayerId || '';
  const isMyTurn = turnPlayerId === user?.id && !isMatchOver;

  // Turn timer countdown
  useEffect(() => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }

    const expiresAt = gameState?.turnExpiresAt || 0;
    if (expiresAt > 0 && !isMatchOver) {
      const updateTimer = () => {
        const diff = expiresAt - Date.now();
        setSecondsRemaining(Math.max(0, Math.ceil(diff / 1000)));
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
  }, [gameState?.turnExpiresAt, isMatchOver]);

  // Handle incoming authoritative game updates
  const applyStateUpdate = useCallback(
    (state: any, incomingRound?: number, incomingScores?: Record<string, number>, incomingPlayers?: any[]) => {
      if (!state) return;
      setGameState(state);
      if (incomingRound !== undefined) setRound(incomingRound);
      if (incomingScores) setScores(incomingScores);
      if (incomingPlayers && Array.isArray(incomingPlayers)) {
        setPlayerList(incomingPlayers);
      }

      if (state.winnerId || state.isDraw || state.isComplete || state.isBlocked) {
        setIsMatchOver(true);
      } else {
        setIsMatchOver(false);
      }
    },
    []
  );

  // Real-Time Socket Connection & Synchronization
  useEffect(() => {
    MobileSocketService.connect();
    MobileSocketService.getSocket()?.emit('room:join', { roomCode });

    MobileSocketService.getGameState(roomCode)
      .then((res) => {
        if (res && res.state) {
          applyStateUpdate(res.state, res.round, res.scores, res.players);
        }
      })
      .catch((err) => console.log('Could not fetch active match state:', err));

    const unsubState = MobileSocketService.onGameState((payload) => {
      if (payload.roomCode === roomCode) {
        applyStateUpdate(payload.state, payload.round, payload.scores);
      }
    });

    const unsubOver = MobileSocketService.onGameOver((payload) => {
      if (payload.roomCode === roomCode) {
        setIsMatchOver(true);
        if (payload.scores) setScores(payload.scores);
        setIsRematchModalVisible(true);
      }
    });

    const unsubRematchOffered = MobileSocketService.onRematchOffered((payload) => {
      if (payload.roomCode === roomCode) {
        if (payload.offeredByUserId !== user?.id) {
          setRematchOfferedByPeer(true);
          showToast('Opponent offered a rematch!');
        }
      }
    });

    const unsubGameStarted = MobileSocketService.onGameStarted((payload: any) => {
      if (payload.roomCode === roomCode) {
        setIsMatchOver(false);
        setIsRematchModalVisible(false);
        setRematchRequestedByMe(false);
        setRematchOfferedByPeer(false);
        setSelectedItem(null);
        applyStateUpdate(payload.state, payload.round, payload.scores, payload.players);
        showToast(`Round ${payload.round || 1} has begun!`);
      }
    });

    return () => {
      unsubState();
      unsubOver();
      unsubRematchOffered();
      unsubGameStarted();
    };
  }, [roomCode, applyStateUpdate, user?.id]);

  // Action Dispatcher
  const dispatchAction = async (action: any) => {
    if (!isMyTurn || isSubmitting) return;
    try {
      setIsSubmitting(true);
      const res = await MobileSocketService.sendGameAction(roomCode, action);
      if (res && res.state) {
        applyStateUpdate(res.state, res.round, res.scores);
      }
    } catch (err: any) {
      showToast(err.message || 'Invalid move');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResign = () => {
    Alert.alert('Leave Match', 'Are you sure you want to leave this game room?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Leave', style: 'destructive', onPress: onLeave },
    ]);
  };

  const handleRematchPress = () => {
    try {
      MobileSocketService.requestRematch(roomCode);
      setRematchRequestedByMe(true);
      showToast('Rematch request sent to opponent!');
    } catch {
      showToast('Could not send rematch request');
    }
  };

  const player1 = playerList[0] || null;
  const player2 = playerList[1] || null;

  const getGameTitle = () => {
    switch (gameType) {
      case 'CARROM': return 'Carrom Board Arena';
      case 'SNAKES_AND_LADDERS': return 'Snakes & Ladders';
      case 'BATTLESHIP': return 'Battleship Command';
      case 'DOMINOES': return 'Dominoes Duel';
      case 'BACKGAMMON': return 'Backgammon Classic';
      case 'MANCALA': return 'Mancala Kalah';
      case 'CHINESE_CHECKERS': return 'Chinese Checkers';
      default: return 'Board Game Arena';
    }
  };

  // --------------------------------------------------------------------------
  // GAME BOARD RENDERERS
  // --------------------------------------------------------------------------

  // 1. CARROM BOARD RENDERER
  const renderCarrom = () => {
    const pieces = gameState?.pieces || [];
    const queenPending = !!gameState?.queenCoverPending;

    return (
      <View style={[styles.boardWrapper, { width: BOARD_SIZE }]}>
        {queenPending && (
          <View style={styles.alertBanner}>
            <Text style={styles.alertBannerText}>👑 QUEEN POCKETED! Pocket cover man to secure 25 pts!</Text>
          </View>
        )}

        {/* Square Carrom Surface */}
        <View style={[styles.carromBoard, { width: BOARD_SIZE, height: BOARD_SIZE }]}>
          {/* Pockets at 4 corners */}
          {[[5, 5], [95, 5], [5, 95], [95, 95]].map(([px, py], i) => (
            <View
              key={`pocket-${i}`}
              style={[
                styles.carromPocket,
                {
                  left: (BOARD_SIZE * px) / 100 - 16,
                  top: (BOARD_SIZE * py) / 100 - 16,
                },
              ]}
            />
          ))}

          {/* Center Circle & Pieces */}
          <Svg width={BOARD_SIZE} height={BOARD_SIZE} style={StyleSheet.absoluteFill}>
            <Circle cx={BOARD_SIZE / 2} cy={BOARD_SIZE / 2} r={BOARD_SIZE * 0.16} stroke="#3D5463" strokeWidth={1.5} fill="none" />
            <Circle cx={BOARD_SIZE / 2} cy={BOARD_SIZE / 2} r={BOARD_SIZE * 0.05} stroke="#3ED598" strokeWidth={1} fill="none" />
          </Svg>

          {/* Carrom Men */}
          {pieces.map((piece: any) => {
            if (piece.isPocketed) return null;
            const size = 18;
            let bgColor = '#FFFFFF';
            let borderColor = '#CBD5E1';
            if (piece.type === 'BLACK') {
              bgColor = '#141E24';
              borderColor = '#3A4E5A';
            } else if (piece.type === 'QUEEN') {
              bgColor = '#FF575F';
              borderColor = '#FFC542';
            }

            return (
              <TouchableOpacity
                key={piece.id}
                style={[
                  styles.carromPiece,
                  {
                    width: size,
                    height: size,
                    borderRadius: size / 2,
                    backgroundColor: bgColor,
                    borderColor,
                    borderWidth: 1.5,
                    left: (BOARD_SIZE * piece.x) / 100 - size / 2,
                    top: (BOARD_SIZE * piece.y) / 100 - size / 2,
                  },
                ]}
                onPress={() => isMyTurn && dispatchAction({
                  type: 'STRIKE',
                  strikerX: carromStrikerX,
                  angle: 0,
                  power: carromPower,
                  targetPieceId: piece.id,
                })}
                disabled={!isMyTurn || isMatchOver}
                activeOpacity={0.8}
              />
            );
          })}
        </View>

        {/* Striker Launch Controls */}
        <View style={styles.controlsRow}>
          <TouchableOpacity
            style={[styles.primaryActionBtn, { opacity: isMyTurn && !isMatchOver ? 1 : 0.5 }]}
            onPress={() => dispatchAction({
              type: 'STRIKE',
              strikerX: carromStrikerX,
              angle: 0,
              power: carromPower,
            })}
            disabled={!isMyTurn || isMatchOver}
            activeOpacity={0.85}
          >
            <Icon name="play" size={18} color="#141E24" />
            <Text style={styles.primaryActionBtnText}>Strike Pieces ({carromPower}%)</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // 2. SNAKES & LADDERS RENDERER (10x10)
  const renderSnakesAndLadders = () => {
    const players = gameState?.players || [];
    const roll = gameState?.currentDiceRoll;
    const lastMoveType = gameState?.lastMoveType;

    const cellSize = (BOARD_SIZE - 4) / 10;

    return (
      <View style={[styles.boardWrapper, { width: BOARD_SIZE }]}>
        {lastMoveType && (
          <View style={[styles.alertBanner, { backgroundColor: lastMoveType === 'LADDER' ? 'rgba(62, 213, 152, 0.2)' : 'rgba(255, 87, 95, 0.2)' }]}>
            <Text style={[styles.alertBannerText, { color: lastMoveType === 'LADDER' ? '#3ED598' : '#FF575F' }]}>
              {lastMoveType === 'LADDER' ? '🪜 LADDER CLIMB BOOST!' : '🐍 SNAKE SLIDE!'}
            </Text>
          </View>
        )}

        {/* 100-cell grid */}
        <View style={[styles.snakesGrid, { width: BOARD_SIZE, height: BOARD_SIZE }]}>
          {Array.from({ length: 10 }).map((_, rowIdx) => {
            const r = 9 - rowIdx; // Row 0 is at bottom
            const rowCells = Array.from({ length: 10 }).map((__, colIdx) => {
              const c = r % 2 === 1 ? 9 - colIdx : colIdx;
              const squareNum = r * 10 + c + 1;

              const playersHere = players.filter((p: any) => p.position === squareNum);

              return (
                <View
                  key={`sq-${squareNum}`}
                  style={[
                    styles.snakesCell,
                    {
                      width: cellSize,
                      height: cellSize,
                      backgroundColor: (r + c) % 2 === 0 ? '#263843' : '#1F2C34',
                    },
                  ]}
                >
                  <Text style={styles.squareNumberText}>{squareNum}</Text>
                  {playersHere.map((p: any, idx: number) => (
                    <View
                      key={`token-${p.userId}-${idx}`}
                      style={[
                        styles.snakesToken,
                        {
                          backgroundColor: idx === 0 ? '#3ED598' : '#FFC542',
                        },
                      ]}
                    />
                  ))}
                </View>
              );
            });
            return <View key={`r-${rowIdx}`} style={styles.gridRow}>{rowCells}</View>;
          })}
        </View>

        {/* Roll Dice Action Button */}
        <View style={styles.controlsRow}>
          <TouchableOpacity
            style={[styles.primaryActionBtn, { opacity: isMyTurn && !isMatchOver ? 1 : 0.5 }]}
            onPress={() => dispatchAction({ type: 'ROLL_DICE' })}
            disabled={!isMyTurn || isMatchOver}
            activeOpacity={0.85}
          >
            <Icon name="dice" size={20} color="#141E24" />
            <Text style={styles.primaryActionBtnText}>
              {roll ? `Rolled [ ${roll} ] — Roll Again` : 'Roll Authoritative Dice'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // 3. BATTLESHIP FLEET COMMAND RENDERER
  const renderBattleship = () => {
    const opponentId = playerList.find((p) => p.userId !== user?.id)?.userId;
    const opponentGrid = opponentId ? gameState?.players?.[opponentId] : null;
    const myGrid = user?.id ? gameState?.players?.[user.id] : null;

    const cellSize = (BOARD_SIZE - 4) / 10;
    const activeGrid = battleshipTab === 'radar' ? opponentGrid : myGrid;

    return (
      <View style={[styles.boardWrapper, { width: BOARD_SIZE }]}>
        {/* Radar vs Defense Tab Switcher */}
        <View style={styles.segmentedTabRow}>
          <TouchableOpacity
            style={[styles.segTabBtn, battleshipTab === 'radar' && styles.segTabActive]}
            onPress={() => setBattleshipTab('radar')}
          >
            <Text style={[styles.segTabText, battleshipTab === 'radar' && styles.segTabTextActive]}>
              Enemy Radar (Target)
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.segTabBtn, battleshipTab === 'defense' && styles.segTabActive]}
            onPress={() => setBattleshipTab('defense')}
          >
            <Text style={[styles.segTabText, battleshipTab === 'defense' && styles.segTabTextActive]}>
              Fleet Defense
            </Text>
          </TouchableOpacity>
        </View>

        {/* 10x10 Grid */}
        <View style={[styles.battleshipBoard, { width: BOARD_SIZE, height: BOARD_SIZE }]}>
          {Array.from({ length: 10 }).map((_, r) => (
            <View key={`btr-${r}`} style={styles.gridRow}>
              {Array.from({ length: 10 }).map((__, c) => {
                const shot = activeGrid?.shotsReceived?.find(
                  (s: any) => s.row === r && s.col === c
                );
                const hasMyShip =
                  battleshipTab === 'defense' &&
                  myGrid?.ships?.some((s: any) =>
                    s.orientation === 'H'
                      ? s.row === r && c >= s.col && c < s.col + s.size
                      : s.col === c && r >= s.row && r < s.row + s.size
                  );

                return (
                  <TouchableOpacity
                    key={`btc-${r}-${c}`}
                    style={[
                      styles.battleshipCell,
                      {
                        width: cellSize,
                        height: cellSize,
                        backgroundColor: shot?.status === 'HIT' ? 'rgba(255, 87, 95, 0.4)' : shot?.status === 'MISS' ? 'rgba(255, 255, 255, 0.08)' : hasMyShip ? '#24526E' : '#1A2C38',
                      },
                    ]}
                    onPress={() => battleshipTab === 'radar' && !shot && isMyTurn && dispatchAction({ type: 'FIRE', row: r, col: c })}
                    disabled={battleshipTab !== 'radar' || !!shot || !isMyTurn || isMatchOver}
                    activeOpacity={0.7}
                  >
                    {shot?.status === 'HIT' && <Text style={{ color: '#FF575F', fontWeight: '800' }}>✕</Text>}
                    {shot?.status === 'MISS' && <Text style={{ color: '#97ADB6' }}>•</Text>}
                    {hasMyShip && !shot && <View style={styles.shipSegmentDot} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>
      </View>
    );
  };

  // 4. DOMINOES DUEL RENDERER
  const renderDominoes = () => {
    const boardChain = gameState?.boardChain || [];
    const openEnds = gameState?.openEnds || [0, 0];
    const myHand = user?.id ? gameState?.playerHands?.[user.id] || [] : [];
    const boneyardCount = gameState?.boneyard?.length || 0;

    return (
      <View style={[styles.boardWrapper, { width: BOARD_SIZE }]}>
        <View style={styles.dominoOpenEndsRow}>
          <Text style={styles.dominoEndLabel}>Left Open: [{openEnds[0]}]</Text>
          <Text style={styles.dominoEndLabel}>Right Open: [{openEnds[1]}]</Text>
          <Text style={styles.dominoEndLabel}>Boneyard: {boneyardCount}</Text>
        </View>

        {/* Chain Display */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dominoChainScroll}>
          {boardChain.map((tile: [number, number], idx: number) => (
            <View key={`tile-${idx}`} style={styles.dominoTileOnBoard}>
              <Text style={styles.dominoPipNum}>{tile[0]}</Text>
              <View style={styles.dominoDivider} />
              <Text style={styles.dominoPipNum}>{tile[1]}</Text>
            </View>
          ))}
        </ScrollView>

        {/* Hand Tiles */}
        <Text style={[styles.sectionHeading, { color: theme.colors.textSecondary }]}>Your Hand:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dominoHandScroll}>
          {myHand.map((tile: [number, number], idx: number) => (
            <TouchableOpacity
              key={`hand-${idx}`}
              style={styles.dominoTileInHand}
              onPress={() => {
                if (!isMyTurn || isMatchOver) return;
                // Auto play left or right
                const end = tile[0] === openEnds[0] || tile[1] === openEnds[0] ? 'LEFT' : 'RIGHT';
                dispatchAction({ type: 'PLAY_TILE', tile, end });
              }}
              disabled={!isMyTurn || isMatchOver}
              activeOpacity={0.8}
            >
              <Text style={styles.dominoPipNum}>{tile[0]}</Text>
              <View style={styles.dominoDivider} />
              <Text style={styles.dominoPipNum}>{tile[1]}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Draw / Pass Actions */}
        <View style={styles.controlsRow}>
          {boneyardCount > 0 ? (
            <TouchableOpacity
              style={[styles.secondaryActionBtn, { opacity: isMyTurn ? 1 : 0.5 }]}
              onPress={() => dispatchAction({ type: 'DRAW_TILE' })}
              disabled={!isMyTurn || isMatchOver}
            >
              <Text style={styles.secondaryActionBtnText}>Draw from Boneyard</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.secondaryActionBtn, { opacity: isMyTurn ? 1 : 0.5 }]}
              onPress={() => dispatchAction({ type: 'PASS' })}
              disabled={!isMyTurn || isMatchOver}
            >
              <Text style={styles.secondaryActionBtnText}>Pass Turn</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  // 5. BACKGAMMON RENDERER
  const renderBackgammon = () => {
    const points = gameState?.points || [];
    const diceRemaining = gameState?.diceRemaining || [];
    const isWhite = gameState?.turnColor === 'WHITE';

    return (
      <View style={[styles.boardWrapper, { width: BOARD_SIZE }]}>
        <View style={styles.diceRow}>
          <Text style={styles.turnStatusText}>
            Dice Remaining: {diceRemaining.join(', ') || 'None'}
          </Text>
        </View>

        {/* 24 Triangular Points Board */}
        <View style={[styles.backgammonBoard, { width: BOARD_SIZE, height: BOARD_SIZE * 0.8 }]}>
          {/* Top 12 points (12..23) */}
          <View style={styles.bgRow}>
            {points.slice(12, 24).reverse().map((pt: any, idx: number) => (
              <TouchableOpacity
                key={`top-${idx}`}
                style={[styles.bgPoint, { backgroundColor: idx % 2 === 0 ? '#334856' : '#22323D' }]}
                onPress={() => {
                  if (!isMyTurn || isMatchOver || diceRemaining.length === 0) return;
                  dispatchAction({ type: 'MOVE_CHECKER', from: 23 - idx, die: diceRemaining[0] });
                }}
                disabled={!isMyTurn || isMatchOver}
              >
                {pt.white > 0 && <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '700' }}>W:{pt.white}</Text>}
                {pt.black > 0 && <Text style={{ color: '#FF575F', fontSize: 11, fontWeight: '700' }}>B:{pt.black}</Text>}
              </TouchableOpacity>
            ))}
          </View>

          {/* Bottom 12 points (0..11) */}
          <View style={styles.bgRow}>
            {points.slice(0, 12).map((pt: any, idx: number) => (
              <TouchableOpacity
                key={`bot-${idx}`}
                style={[styles.bgPoint, { backgroundColor: idx % 2 === 0 ? '#22323D' : '#334856' }]}
                onPress={() => {
                  if (!isMyTurn || isMatchOver || diceRemaining.length === 0) return;
                  dispatchAction({ type: 'MOVE_CHECKER', from: idx, die: diceRemaining[0] });
                }}
                disabled={!isMyTurn || isMatchOver}
              >
                {pt.white > 0 && <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '700' }}>W:{pt.white}</Text>}
                {pt.black > 0 && <Text style={{ color: '#FF575F', fontSize: 11, fontWeight: '700' }}>B:{pt.black}</Text>}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    );
  };

  // 6. MANCALA RENDERER
  const renderMancala = () => {
    const board = gameState?.board || [4, 4, 4, 4, 4, 4, 0, 4, 4, 4, 4, 4, 4, 0];
    const isP1 = playerList[0]?.userId === user?.id;

    return (
      <View style={[styles.boardWrapper, { width: BOARD_SIZE }]}>
        {gameState?.freeTurnAwarded && (
          <View style={styles.alertBanner}>
            <Text style={styles.alertBannerText}>⭐ FREE TURN AWARDED! Drop in store grants bonus sow!</Text>
          </View>
        )}

        <View style={styles.mancalaBoard}>
          {/* Player 2 Store (Slot 13) */}
          <View style={styles.mancalaStore}>
            <Text style={styles.mancalaStoreCount}>{board[13]}</Text>
            <Text style={styles.mancalaStoreLabel}>P2 Store</Text>
          </View>

          {/* Central 2 Rows of 6 Pits */}
          <View style={styles.mancalaCenterPits}>
            {/* Top row: P2 pits 12 down to 7 */}
            <View style={styles.mancalaPitRow}>
              {[12, 11, 10, 9, 8, 7].map((pit) => (
                <TouchableOpacity
                  key={`pit-${pit}`}
                  style={styles.mancalaPit}
                  onPress={() => !isP1 && isMyTurn && dispatchAction({ type: 'SOW_PIT', pitIndex: pit })}
                  disabled={isP1 || !isMyTurn || isMatchOver || board[pit] === 0}
                >
                  <Text style={styles.mancalaPitCount}>{board[pit]}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Bottom row: P1 pits 0 up to 5 */}
            <View style={styles.mancalaPitRow}>
              {[0, 1, 2, 3, 4, 5].map((pit) => (
                <TouchableOpacity
                  key={`pit-${pit}`}
                  style={styles.mancalaPit}
                  onPress={() => isP1 && isMyTurn && dispatchAction({ type: 'SOW_PIT', pitIndex: pit })}
                  disabled={!isP1 || !isMyTurn || isMatchOver || board[pit] === 0}
                >
                  <Text style={styles.mancalaPitCount}>{board[pit]}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Player 1 Store (Slot 6) */}
          <View style={styles.mancalaStore}>
            <Text style={styles.mancalaStoreCount}>{board[6]}</Text>
            <Text style={styles.mancalaStoreLabel}>P1 Store</Text>
          </View>
        </View>
      </View>
    );
  };

  // 7. CHINESE CHECKERS RENDERER
  const renderChineseCheckers = () => {
    const marbles = gameState?.marbles || [];

    return (
      <View style={[styles.boardWrapper, { width: BOARD_SIZE }]}>
        <View style={[styles.chineseCheckersBoard, { width: BOARD_SIZE, height: BOARD_SIZE }]}>
          {marbles.map((m: any) => {
            const [r, c] = m.coord;
            const size = 16;
            const xPos = (BOARD_SIZE * (c + 0.5)) / 13;
            const yPos = (BOARD_SIZE * (r + 0.5)) / 17;

            return (
              <TouchableOpacity
                key={m.id}
                style={[
                  styles.chineseMarble,
                  {
                    width: size,
                    height: size,
                    borderRadius: size / 2,
                    backgroundColor: m.color === 'RED' ? '#FF575F' : '#0062FF',
                    left: xPos - size / 2,
                    top: yPos - size / 2,
                  },
                ]}
                onPress={() => {
                  if (!isMyTurn || isMatchOver) return;
                  // Make step forward
                  const dr = m.color === 'RED' ? 1 : -1;
                  dispatchAction({
                    type: 'MOVE_MARBLE',
                    marbleId: m.id,
                    to: [r + dr, c],
                  });
                }}
                disabled={!isMyTurn || isMatchOver}
              />
            );
          })}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={handleResign} activeOpacity={0.8}>
          <Icon name="chevronLeft" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>
            {getGameTitle()}
          </Text>
          <Text style={[styles.headerSubtitle, { color: theme.colors.textSecondary }]}>
            Round {round} • Room: {roomCode}
          </Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <TouchableOpacity
            style={[styles.iconBtn, { backgroundColor: theme.colors.cardTintMint }]}
            onPress={() => setIsRulesModalVisible(true)}
            activeOpacity={0.8}
            accessibilityLabel="Game Rules & Steps"
          >
            <Icon name="info" size={18} color={theme.colors.primary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.iconBtn} onPress={handleResign} activeOpacity={0.8}>
            <Icon name="close" size={20} color={theme.colors.error} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Versus HUD */}
      <View style={[styles.versusCard, { backgroundColor: '#141822', borderColor: '#262D3D', borderWidth: 1.5 }]}>
        <View style={styles.playerColumn}>
          <View style={[styles.avatarWrap, isMyTurn && styles.activeAvatarWrap]}>
            <Avatar avatarUrl={player1?.user?.avatarUrl || null} displayName={player1?.user?.displayName || 'Player 1'} size="md" />
          </View>
          <Text style={styles.playerName} numberOfLines={1}>{player1?.user?.displayName || 'Player 1'}</Text>
          <Text style={styles.playerScore}>Wins: {scores[player1?.userId || ''] || 0}</Text>
        </View>

        <View style={styles.versusCenter}>
          <View style={[styles.timerPill, { borderColor: secondsRemaining <= 5 ? theme.colors.error : theme.colors.primary }]}>
            <Text style={[styles.timerText, { color: secondsRemaining <= 5 ? theme.colors.error : theme.colors.primary }]}>
              {secondsRemaining}s
            </Text>
          </View>
          <Text style={[styles.turnStatusText, { color: isMyTurn ? theme.colors.primary : theme.colors.textSecondary }]}>
            {isMyTurn ? 'Your Turn' : 'Waiting...'}
          </Text>
        </View>

        <View style={styles.playerColumn}>
          <View style={[styles.avatarWrap, !isMyTurn && !isMatchOver && styles.activeAvatarWrap]}>
            <Avatar avatarUrl={player2?.user?.avatarUrl || null} displayName={player2?.user?.displayName || 'Opponent'} size="md" />
          </View>
          <Text style={styles.playerName} numberOfLines={1}>{player2?.user?.displayName || 'Opponent'}</Text>
          <Text style={styles.playerScore}>Wins: {scores[player2?.userId || ''] || 0}</Text>
        </View>
      </View>

      {/* Main Board View */}
      <ScrollView contentContainerStyle={styles.boardScrollContainer} showsVerticalScrollIndicator={false}>
        {gameType === 'CARROM' && renderCarrom()}
        {gameType === 'SNAKES_AND_LADDERS' && renderSnakesAndLadders()}
        {gameType === 'BATTLESHIP' && renderBattleship()}
        {gameType === 'DOMINOES' && renderDominoes()}
        {gameType === 'BACKGAMMON' && renderBackgammon()}
        {gameType === 'MANCALA' && renderMancala()}
        {gameType === 'CHINESE_CHECKERS' && renderChineseCheckers()}
      </ScrollView>

      {/* Rematch Modal */}
      <Modal visible={isRematchModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.gameOverCard, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.trophyWrap}>
              <TrophyIcon size={56} color="#FFC542" />
            </View>

            <Text style={styles.gameOverTitle}>
              {gameState?.winnerId === user?.id ? 'Victory!' : gameState?.isDraw || gameState?.isBlocked ? 'Match Concluded!' : 'Defeat'}
            </Text>

            <TouchableOpacity
              style={[styles.primaryActionBtn, { backgroundColor: rematchOfferedByPeer ? '#3ED598' : theme.colors.primary }]}
              onPress={handleRematchPress}
              disabled={rematchRequestedByMe && !rematchOfferedByPeer}
            >
              <Text style={styles.primaryActionBtnText}>
                {rematchOfferedByPeer ? 'Accept Rematch!' : rematchRequestedByMe ? 'Rematch Offered...' : 'Play Rematch'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.secondaryActionBtn} onPress={onLeave}>
              <Text style={styles.secondaryActionBtnText}>Back to Lobby</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <GameRulesModal
        visible={isRulesModalVisible}
        gameType={gameType}
        gameTitle={getGameTitle()}
        category="BOARD"
        onClose={() => setIsRulesModalVisible(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  headerCenter: { alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  headerSubtitle: { fontSize: 12, fontWeight: '500', marginTop: 2 },
  versusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 14,
    marginVertical: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#262D3D',
  },
  playerColumn: { alignItems: 'center', width: 90 },
  avatarWrap: { borderRadius: 25, padding: 2, borderWidth: 2, borderColor: 'transparent' },
  activeAvatarWrap: { borderColor: '#3ED598', backgroundColor: '#133526' },
  playerName: { color: '#FFFFFF', fontSize: 13, fontWeight: '600', marginTop: 6 },
  playerScore: { color: '#97ADB6', fontSize: 11, fontWeight: '500', marginTop: 1 },
  versusCenter: { alignItems: 'center' },
  timerPill: { paddingHorizontal: 14, paddingVertical: 4, borderRadius: 14, borderWidth: 1 },
  timerText: { fontSize: 15, fontWeight: '700' },
  turnStatusText: { fontSize: 11, fontWeight: '600', marginTop: 4, textTransform: 'uppercase' },
  boardScrollContainer: { alignItems: 'center', paddingVertical: 12 },
  boardWrapper: { alignItems: 'center' },
  gridRow: { flexDirection: 'row' },
  alertBanner: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    marginBottom: 10,
    backgroundColor: 'rgba(62, 213, 152, 0.15)',
  },
  alertBannerText: { color: '#3ED598', fontSize: 12, fontWeight: '700', textAlign: 'center' },

  // Carrom Styles
  carromBoard: {
    backgroundColor: '#273843',
    borderRadius: 16,
    borderWidth: 8,
    borderColor: '#4A3425',
    position: 'relative',
    overflow: 'hidden',
  },
  carromPocket: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#0E171D',
  },
  carromPiece: { position: 'absolute' },

  // Snakes & Ladders
  snakesGrid: {
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#3D5463',
    overflow: 'hidden',
  },
  snakesCell: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.5,
    borderColor: '#334856',
  },
  squareNumberText: { color: '#688291', fontSize: 9, fontWeight: '600' },
  snakesToken: { width: 10, height: 10, borderRadius: 5, marginTop: 2 },

  // Battleship
  segmentedTabRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 14,
    padding: 4,
    marginBottom: 10,
    width: '100%',
  },
  segTabBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 10 },
  segTabActive: { backgroundColor: '#3ED598' },
  segTabText: { color: '#CBD5E1', fontSize: 12, fontWeight: '600' },
  segTabTextActive: { color: '#141E24', fontWeight: '700' },
  battleshipBoard: { borderRadius: 14, borderWidth: 2, borderColor: '#2E4759', overflow: 'hidden' },
  battleshipCell: { alignItems: 'center', justifyContent: 'center', borderWidth: 0.5, borderColor: '#2E4759' },
  shipSegmentDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#3ED598' },

  // Dominoes
  dominoOpenEndsRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 8 },
  dominoEndLabel: { color: '#CBD5E1', fontSize: 12, fontWeight: '600' },
  dominoChainScroll: { paddingVertical: 8, gap: 6 },
  dominoTileOnBoard: {
    width: 38,
    height: 60,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 4,
  },
  dominoTileInHand: {
    width: 44,
    height: 70,
    backgroundColor: '#F5F7FA',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'space-around',
    marginRight: 8,
  },
  dominoHandScroll: { paddingVertical: 8 },
  dominoDivider: { width: '80%', height: 1.5, backgroundColor: '#141E24' },
  dominoPipNum: { color: '#141E24', fontSize: 16, fontWeight: '800' },
  sectionHeading: { fontSize: 13, fontWeight: '700', alignSelf: 'flex-start', marginTop: 10 },

  // Backgammon
  diceRow: { marginBottom: 8 },
  backgammonBoard: { borderRadius: 14, borderWidth: 2, borderColor: '#3D5463', overflow: 'hidden' },
  bgRow: { flex: 1, flexDirection: 'row' },
  bgPoint: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // Mancala
  mancalaBoard: {
    flexDirection: 'row',
    backgroundColor: '#352518',
    borderRadius: 20,
    padding: 10,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#4A3425',
  },
  mancalaStore: {
    width: 48,
    height: 120,
    backgroundColor: '#1C130C',
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mancalaStoreCount: { color: '#FFFFFF', fontSize: 20, fontWeight: '800' },
  mancalaStoreLabel: { color: '#97ADB6', fontSize: 9, marginTop: 4 },
  mancalaCenterPits: { flex: 1, paddingHorizontal: 6, gap: 12 },
  mancalaPitRow: { flexDirection: 'row', justifyContent: 'space-between' },
  mancalaPit: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1C130C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mancalaPitCount: { color: '#3ED598', fontSize: 15, fontWeight: '700' },

  // Chinese Checkers
  chineseCheckersBoard: { backgroundColor: '#202E38', borderRadius: 16, position: 'relative' },
  chineseMarble: { position: 'absolute' },

  // Common Controls & Modals
  controlsRow: { marginTop: 16, width: '100%' },
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: 16,
    backgroundColor: '#3ED598',
    gap: 8,
  },
  primaryActionBtnText: { color: '#141E24', fontSize: 15, fontWeight: '700' },
  secondaryActionBtn: {
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  secondaryActionBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  gameOverCard: { width: '100%', maxWidth: 340, borderRadius: 25, padding: 26, alignItems: 'center' },
  trophyWrap: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(255, 197, 66, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  gameOverTitle: { color: '#FFFFFF', fontSize: 24, fontWeight: '800', marginBottom: 16 },
});
