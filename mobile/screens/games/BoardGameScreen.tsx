import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
} from 'react-native';
import Svg, {
  Rect,
  Circle,
  Path,
  G,
  Line,
  Polygon,
} from 'react-native-svg';
import { useTheme } from '../../theme';
import { Icon, TrophyIcon, CrownIcon } from '../../icons';
import { Avatar } from '../../components/atoms/Avatar';
import { GameRulesModal } from '../../components';
import { useAuth } from '../../features/auth/AuthContext';
import { MobileSocketService } from '../../services/socket.service';
import { RoomPlayer, RoomDetails } from '../../services/room.service';

export interface BoardGameScreenProps {
  roomCode: string;
  gameType: 'CONNECT_FOUR' | 'REVERSI' | 'GOMOKU' | 'CHECKERS' | 'CHESS';
  roomDetails?: RoomDetails | null;
  onLeave: () => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BOARD_SIZE = Math.min(SCREEN_WIDTH - 28, 380);

// SVG Chess Piece Icons
const ChessPieceSvg: React.FC<{
  type: string;
  color: 'w' | 'b' | string;
  size: number;
}> = ({ type, color, size }) => {
  const isWhite = (color || '').toLowerCase() === 'w';
  const fill = isWhite ? '#FFFFFF' : '#111319';
  const stroke = isWhite ? '#111319' : '#E8ECEF';
  const strokeWidth = 1.2;

  switch (type.toLowerCase()) {
    case 'p': // Pawn
      return (
        <Svg width={size} height={size} viewBox="0 0 45 45">
          <Path
            d="M22.5 9c-2.21 0-4 1.79-4 4 0 .89.29 1.71.78 2.38C17.33 16.5 16 18.59 16 21c0 2.03.92 3.84 2.36 5.07-.8.56-1.36 1.43-1.36 2.43 0 .7.27 1.34.72 1.83C15.34 31.25 14 33.45 14 36h17c0-2.55-1.34-4.75-3.72-5.67.45-.49.72-1.13.72-1.83 0-1-.56-1.87-1.36-2.43 1.44-1.23 2.36-3.04 2.36-5.07 0-2.41-1.33-4.5-3.28-5.62.49-.67.78-1.49.78-2.38 0-2.21-1.79-4-4-4z"
            fill={fill}
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeLinejoin="round"
          />
        </Svg>
      );
    case 'r': // Rook
      return (
        <Svg width={size} height={size} viewBox="0 0 45 45">
          <G fill={fill} stroke={stroke} strokeWidth={strokeWidth} strokeLinejoin="round">
            <Path d="M9 39h27v-3H9v3zM12 36v-4h21v4H12zM11 14V9h4v2h5V9h5v2h5V9h4v5" />
            <Path d="M34 14l-3 3H14l-3-3" />
            <Path d="M14 17v12h17V17H14zM14 29l-3 3h23l-3-3" />
            <Path d="M14 32h17" />
          </G>
        </Svg>
      );
    case 'n': // Knight
      return (
        <Svg width={size} height={size} viewBox="0 0 45 45">
          <Path
            d="M22 10c-3 0-6 2-7 5-2 1-3 4-3 6 0 2 1 4 2 5-1 2-2 4-2 6 0 4 3 7 7 7h9c1 0 3-1 3-3 0-3-2-6-5-8 3-1 5-4 5-8 0-4-4-7-7-9-1-.5-2-1-2-1z"
            fill={fill}
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeLinejoin="round"
          />
          <Circle cx="17" cy="18" r="1.5" fill={isWhite ? '#111319' : '#FFFFFF'} />
        </Svg>
      );
    case 'b': // Bishop
      return (
        <Svg width={size} height={size} viewBox="0 0 45 45">
          <G fill={fill} stroke={stroke} strokeWidth={strokeWidth} strokeLinejoin="round">
            <Path d="M9 36c3.39-.97 10.11.43 13.5-2 3.39 2.43 10.11 1.03 13.5 2 0 0 1.65.54 3 2-.68.97-1.65.99-3 .5-3.39-.97-10.11.46-13.5-1-3.39 1.46-10.11.03-13.5 1-1.35.49-2.32.47-3-.5 1.35-1.46 3-2 3-2zM15 32c2.5 2.5 12.5 2.5 15 0 .5-1.5 0-2 0-2 0-2.5-2.5-4-2.5-4 5.5-1.5 6-11.5-5-15.5-11 4-10.5 14-5 15.5 0 0-2.5 1.5-2.5 4 0 0-.5.5 0 2zM25 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 1 1 5 0z" />
            <Path d="M17.5 26h10M22.5 21v10" stroke={isWhite ? '#111319' : '#FFFFFF'} strokeWidth={1} />
          </G>
        </Svg>
      );
    case 'q': // Queen
      return (
        <Svg width={size} height={size} viewBox="0 0 45 45">
          <G fill={fill} stroke={stroke} strokeWidth={strokeWidth} strokeLinejoin="round">
            <Path d="M9 26c8.5-1.5 21-1.5 27 0l2-12-7 11-8.5-15L14 25l-7-11 2 12z" />
            <Path d="M9 26c0 2 1.5 2 2.5 4 1 1.5 1 1 .5 3.5-1.5 1-1.5 2.5-1.5 2.5-1.5 1.5.5 2.5.5 2.5 6.5 1 16.5 1 23 0 0 0 2-1 .5-2.5 0 0 0-1.5-1.5-2.5-.5-2.5-.5-2 .5-3.5 1-2 2.5-2 2.5-4-8.5-1.5-18.5-1.5-27 0z" />
            <Circle cx="6" cy="12" r="2" />
            <Circle cx="14" cy="9" r="2" />
            <Circle cx="22.5" cy="8" r="2" />
            <Circle cx="31" cy="9" r="2" />
            <Circle cx="39" cy="12" r="2" />
          </G>
        </Svg>
      );
    case 'k': // King
      return (
        <Svg width={size} height={size} viewBox="0 0 45 45">
          <G fill={fill} stroke={stroke} strokeWidth={strokeWidth} strokeLinejoin="round">
            <Path d="M22.5 11.63V6M20 8h5" stroke={stroke} strokeWidth={2} />
            <Path d="M22.5 25s4.5-7.5 3-10.5c0 0-1-2.5-3-2.5s-3 2.5-3 2.5c-1.5 3 3 10.5 3 10.5" />
            <Path d="M11.5 37c5.5 3.5 15.5 3.5 21 0V32H11.5v5zM11.5 32c4.5-2 16.5-2 21 0l1-5c-6.5-1-17.5-1-23 0l1 5z" />
            <Path d="M12.5 27c4.5-3 14.5-3 19 0 1.5-3.5 3-7.5 1.5-11-2-1.5-5.5-1-7.5 1-1.5 1.5-2.5 2-3 2s-1.5-.5-3-2c-2-2-5.5-2.5-7.5-1-1.5 3.5 0 7.5 1.5 11z" />
          </G>
        </Svg>
      );
    default:
      return null;
  }
};

export const BoardGameScreen: React.FC<BoardGameScreenProps> = ({
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
  const [gameOverResult, setGameOverResult] = useState<any>(null);

  // Turn Countdown
  const [secondsRemaining, setSecondsRemaining] = useState<number>(30);
  const countdownIntervalRef = useRef<any>(null);

  // Interaction State
  const [selectedCell, setSelectedCell] = useState<[number, number] | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isRulesModalVisible, setIsRulesModalVisible] = useState<boolean>(false);

  // Rematch State
  const [isRematchModalVisible, setIsRematchModalVisible] = useState<boolean>(false);
  const [rematchRequestedByMe, setRematchRequestedByMe] = useState<boolean>(false);
  const [rematchOfferedByPeer, setRematchOfferedByPeer] = useState<boolean>(false);

  // Pawn Promotion Modal (Chess only)
  const [promotionPendingMove, setPromotionPendingMove] = useState<{
    from: [number, number];
    to: [number, number];
  } | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2600);
  };

  // Turn evaluation
  const turnPlayerId = gameState?.turnPlayerId || '';
  const isMyTurn = turnPlayerId === user?.id && !isMatchOver;

  // Countdown timer management
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

      // Check game conclusion
      if (state.winnerId || state.isDraw || state.winner || state.isCheckmate || state.isStalemate) {
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

    // Initial state query
    MobileSocketService.getGameState(roomCode)
      .then((res) => {
        if (res && res.state) {
          applyStateUpdate(res.state, res.round, res.scores, res.players);
        }
      })
      .catch((err) => console.log('Could not fetch game state:', err));

    // Listeners
    const unsubState = MobileSocketService.onGameState((payload) => {
      if (payload.roomCode === roomCode) {
        applyStateUpdate(payload.state, payload.round, payload.scores);
      }
    });

    const unsubOver = MobileSocketService.onGameOver((payload) => {
      if (payload.roomCode === roomCode) {
        setIsMatchOver(true);
        setGameOverResult(payload.result || payload);
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
        setSelectedCell(null);
        setPromotionPendingMove(null);
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

  // Dispatch Action Helper
  const dispatchAction = async (action: any, bypassTurnCheck = false) => {
    if ((!isMyTurn && !bypassTurnCheck) || isSubmitting) return;
    try {
      setIsSubmitting(true);
      const res = await MobileSocketService.sendGameAction(roomCode, action);
      if (res && res.state) {
        applyStateUpdate(res.state, res.round, res.scores);
      }
    } catch (err: any) {
      showToast(err.message || 'Action invalid');
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- CONNECT FOUR HANDLERS ---
  const handleDropDisc = (colIndex: number) => {
    if (!isMyTurn || isSubmitting) return;
    dispatchAction({ type: 'DROP_DISC', col: colIndex });
  };

  // --- REVERSI HANDLERS ---
  const handlePlaceReversi = (row: number, col: number) => {
    if (!isMyTurn || isSubmitting) return;
    dispatchAction({ type: 'PLACE_DISC', row, col });
  };

  const handlePassReversi = () => {
    if (!isMyTurn || isSubmitting) return;
    dispatchAction({ type: 'PASS' });
  };

  // --- GOMOKU HANDLERS ---
  const handlePlaceGomoku = (row: number, col: number) => {
    if (!isMyTurn || isSubmitting) return;
    dispatchAction({ type: 'PLACE_STONE', row, col });
  };

  // --- CHECKERS HANDLERS ---
  const handleCheckersCellPress = (row: number, col: number) => {
    if (!isMyTurn || isSubmitting || !gameState) return;

    if (!selectedCell) {
      // Select piece if it's player's piece
      const piece = gameState.board?.[row]?.[col];
      if (!piece) return;

      const myColor = gameState.players?.RED === user?.id ? 'RED' : 'BLACK';
      if (piece.color !== myColor) {
        showToast("That's not your checker!");
        return;
      }
      setSelectedCell([row, col]);
    } else {
      const [fromR, fromC] = selectedCell;
      if (fromR === row && fromC === col) {
        setSelectedCell(null); // Deselect
        return;
      }

      // Check if clicking another of own pieces
      const targetPiece = gameState.board?.[row]?.[col];
      const myColor = gameState.players?.RED === user?.id ? 'RED' : 'BLACK';
      if (targetPiece && targetPiece.color === myColor) {
        setSelectedCell([row, col]);
        return;
      }

      // Move piece
      dispatchAction({
        type: 'MOVE_PIECE',
        from: [fromR, fromC],
        to: [row, col],
      });
      setSelectedCell(null);
    }
  };

  // --- CHESS HANDLERS ---
  const handleChessCellPress = (row: number, col: number) => {
    if (!isMyTurn || isSubmitting || !gameState) return;

    // Detect player's assigned color (W or B)
    const isWhite =
      gameState.players?.W === user?.id ||
      gameState.players?.WHITE === user?.id ||
      (Array.isArray(gameState.players) && gameState.players[0] === user?.id);
    const myColorCode = isWhite ? 'W' : 'B';

    if (!selectedCell) {
      const piece = gameState.board?.[row]?.[col];
      if (!piece) return;

      const pieceColor = (piece.color || '').toUpperCase();
      if (pieceColor !== myColorCode) {
        showToast("That's not your piece!");
        return;
      }
      setSelectedCell([row, col]);
    } else {
      const [fromR, fromC] = selectedCell;
      if (fromR === row && fromC === col) {
        setSelectedCell(null); // Deselect
        return;
      }

      const clickedPiece = gameState.board?.[row]?.[col];
      if (clickedPiece && (clickedPiece.color || '').toUpperCase() === myColorCode) {
        // Change selection
        setSelectedCell([row, col]);
        return;
      }

      // Check for pawn promotion: pawn reaching row 0 (white) or row 7 (black)
      const selectedPiece = gameState.board?.[fromR]?.[fromC];
      const isPawn = selectedPiece && (selectedPiece.type || '').toLowerCase() === 'p';
      const isSelectedWhite = selectedPiece && (selectedPiece.color || '').toUpperCase() === 'W';
      if (
        isPawn &&
        ((isSelectedWhite && row === 0) || (!isSelectedWhite && row === 7))
      ) {
        setPromotionPendingMove({ from: [fromR, fromC], to: [row, col] });
        setSelectedCell(null);
        return;
      }

      // Execute standard chess move
      dispatchAction({
        type: 'MOVE_PIECE',
        from: [fromR, fromC],
        to: [row, col],
      });
      setSelectedCell(null);
    }
  };

  const handlePawnPromotionSelect = (promotedType: 'q' | 'r' | 'b' | 'n') => {
    if (!promotionPendingMove) return;
    dispatchAction({
      type: 'MOVE_PIECE',
      from: promotionPendingMove.from,
      to: promotionPendingMove.to,
      promotion: promotedType.toUpperCase(),
    });
    setPromotionPendingMove(null);
  };

  // Handlers for Match Options
  const handleResign = () => {
    Alert.alert('Leave / Resign Match', 'Are you sure you want to resign and leave this match?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Resign & Leave',
        style: 'destructive',
        onPress: async () => {
          try {
            await dispatchAction({ type: 'RESIGN' }, true);
          } catch (e) {
            // Safe fallback if already concluded
          }
          showToast('Leaving match...');
          onLeave();
        },
      },
    ]);
  };

  const handleRematchPress = () => {
    try {
      MobileSocketService.requestRematch(roomCode);
      setRematchRequestedByMe(true);
      showToast('Rematch request sent to opponent!');
    } catch (err: any) {
      showToast('Could not send rematch request');
    }
  };

  // Identify Player Info
  const player1 = playerList[0] || null;
  const player2 = playerList[1] || null;

  const getGameTitle = () => {
    switch (gameType) {
      case 'CONNECT_FOUR':
        return 'Connect Four';
      case 'REVERSI':
        return 'Reversi / Othello';
      case 'GOMOKU':
        return 'Gomoku Duel';
      case 'CHECKERS':
        return 'Checkers Grand';
      case 'CHESS':
        return 'Chess Master';
      default:
        return 'Strategy Board';
    }
  };

  // -------------------------------------------------------------
  // BOARD RENDERERS
  // -------------------------------------------------------------

  // 1. CONNECT FOUR RENDERER (6 rows x 7 cols)
  const renderConnectFour = () => {
    const board = gameState?.board || Array(6).fill(Array(7).fill(null));
    const winningLine = gameState?.winningLine as [number, number][] | undefined;
    const isWinCell = (r: number, c: number) =>
      winningLine?.some(([wr, wc]) => wr === r && wc === c);

    const cellSize = BOARD_SIZE / 7;
    const rackHeight = cellSize * 6;

    return (
      <View style={[styles.boardWrapper, { width: BOARD_SIZE, height: rackHeight + 46 }]}>
        {/* Column Drop Buttons Header */}
        <View style={styles.c4DropRow}>
          {Array.from({ length: 7 }).map((_, colIdx) => (
            <TouchableOpacity
              key={`drop-${colIdx}`}
              style={[
                styles.c4DropBtn,
                {
                  width: cellSize,
                  opacity: isMyTurn && !isMatchOver ? 1 : 0.4,
                },
              ]}
              disabled={!isMyTurn || isMatchOver}
              onPress={() => handleDropDisc(colIdx)}
              activeOpacity={0.7}
            >
              <Icon name="chevronRight" size={16} color={theme.colors.accentMint} />
            </TouchableOpacity>
          ))}
        </View>

        {/* 7x6 Blue Rack Frame */}
        <View style={[styles.c4Rack, { width: BOARD_SIZE, height: rackHeight }]}>
          {board.map((row: any[], rIdx: number) => (
            <View key={`r-${rIdx}`} style={styles.gridRow}>
              {row.map((cell: any, cIdx: number) => {
                const isWinner = isWinCell(rIdx, cIdx);
                let discColor = 'transparent';
                if (cell === 'RED') discColor = '#FF575F';
                if (cell === 'YELLOW') discColor = '#FFC542';

                return (
                  <TouchableOpacity
                    key={`c-${rIdx}-${cIdx}`}
                    style={[
                      styles.c4Slot,
                      {
                        width: cellSize,
                        height: cellSize,
                      },
                    ]}
                    onPress={() => handleDropDisc(cIdx)}
                    disabled={!isMyTurn || isMatchOver}
                    activeOpacity={0.8}
                  >
                    <View
                      style={[
                        styles.c4Disc,
                        {
                          width: cellSize - 10,
                          height: cellSize - 10,
                          borderRadius: (cellSize - 10) / 2,
                          backgroundColor: discColor,
                          borderColor: isWinner ? '#3ED598' : cell ? 'rgba(255,255,255,0.2)' : '#19252F',
                          borderWidth: isWinner ? 3 : 1.5,
                        },
                      ]}
                    />
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>
      </View>
    );
  };

  // 2. REVERSI / OTHELLO RENDERER (8x8)
  const renderReversi = () => {
    const board = gameState?.board || Array(8).fill(Array(8).fill(null));
    const validMoves = (gameState?.validMoves || []) as [number, number][];
    const isValidMove = (r: number, c: number) =>
      validMoves.some(([vr, vc]) => vr === r && vc === c);

    const cellSize = (BOARD_SIZE - 8) / 8;

    return (
      <View style={[styles.boardWrapper, { width: BOARD_SIZE, height: BOARD_SIZE + 44 }]}>
        {/* Reversi Counts Chip */}
        <View style={styles.reversiCountsRow}>
          <View style={styles.reversiCountBadge}>
            <View style={[styles.discPreview, { backgroundColor: '#141E24', borderColor: '#3A4E5A' }]} />
            <Text style={styles.reversiCountText}>
              Black: {gameState?.counts?.BLACK ?? 2}
            </Text>
          </View>
          <View style={styles.reversiCountBadge}>
            <View style={[styles.discPreview, { backgroundColor: '#FFFFFF', borderColor: '#CBD5E1' }]} />
            <Text style={styles.reversiCountText}>
              White: {gameState?.counts?.WHITE ?? 2}
            </Text>
          </View>
          {isMyTurn && validMoves.length === 0 && !isMatchOver && (
            <TouchableOpacity
              style={styles.passBtn}
              onPress={handlePassReversi}
              activeOpacity={0.8}
            >
              <Text style={styles.passBtnText}>Pass Turn</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* 8x8 Felt Grid */}
        <View style={[styles.reversiBoard, { width: BOARD_SIZE, height: BOARD_SIZE }]}>
          {board.map((row: any[], rIdx: number) => (
            <View key={`rev-r-${rIdx}`} style={styles.gridRow}>
              {row.map((cell: any, cIdx: number) => {
                const isLegal = isMyTurn && isValidMove(rIdx, cIdx);
                let discBg = null;
                if (cell === 'BLACK') discBg = '#141E24';
                if (cell === 'WHITE') discBg = '#FFFFFF';

                return (
                  <TouchableOpacity
                    key={`rev-c-${rIdx}-${cIdx}`}
                    style={[
                      styles.reversiCell,
                      {
                        width: cellSize,
                        height: cellSize,
                      },
                    ]}
                    onPress={() => isLegal && handlePlaceReversi(rIdx, cIdx)}
                    disabled={!isLegal || isMatchOver}
                    activeOpacity={0.7}
                  >
                    {discBg && (
                      <View
                        style={[
                          styles.reversiDisc,
                          {
                            width: cellSize - 8,
                            height: cellSize - 8,
                            borderRadius: (cellSize - 8) / 2,
                            backgroundColor: discBg,
                            borderColor: cell === 'BLACK' ? '#3A4E5A' : '#CBD5E1',
                          },
                        ]}
                      />
                    )}
                    {isLegal && !discBg && (
                      <View
                        style={[
                          styles.legalMoveDot,
                          {
                            width: cellSize * 0.3,
                            height: cellSize * 0.3,
                            borderRadius: (cellSize * 0.3) / 2,
                          },
                        ]}
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>
      </View>
    );
  };

  // 3. GOMOKU RENDERER (15x15)
  const renderGomoku = () => {
    const board = gameState?.board || Array(15).fill(Array(15).fill(null));
    const lastMove = gameState?.lastMove as [number, number] | undefined;
    const winningLine = gameState?.winningLine as [number, number][] | undefined;

    const cellSize = (BOARD_SIZE - 4) / 15;
    const stoneSize = cellSize * 0.88;

    const isWinCell = (r: number, c: number) =>
      winningLine?.some(([wr, wc]) => wr === r && wc === c);

    return (
      <View style={[styles.gomokuBoard, { width: BOARD_SIZE, height: BOARD_SIZE }]}>
        {/* Background Grid Lines rendered via SVG */}
        <Svg width={BOARD_SIZE} height={BOARD_SIZE} style={StyleSheet.absoluteFill}>
          {Array.from({ length: 15 }).map((_, i) => {
            const pos = cellSize * i + cellSize / 2;
            return (
              <React.Fragment key={`gom-lines-${i}`}>
                {/* Horizontal line */}
                <Line
                  x1={cellSize / 2}
                  y1={pos}
                  x2={BOARD_SIZE - cellSize / 2}
                  y2={pos}
                  stroke="#475C68"
                  strokeWidth={1}
                />
                {/* Vertical line */}
                <Line
                  x1={pos}
                  y1={cellSize / 2}
                  x2={pos}
                  y2={BOARD_SIZE - cellSize / 2}
                  stroke="#475C68"
                  strokeWidth={1}
                />
              </React.Fragment>
            );
          })}
          {/* Star points (hoshi) at (3,3), (3,11), (7,7), (11,3), (11,11) */}
          {[
            [3, 3],
            [3, 11],
            [7, 7],
            [11, 3],
            [11, 11],
          ].map(([hr, hc], idx) => (
            <Circle
              key={`hoshi-${idx}`}
              cx={cellSize * hc + cellSize / 2}
              cy={cellSize * hr + cellSize / 2}
              r={2.8}
              fill="#5D7482"
            />
          ))}
        </Svg>

        {/* 15x15 Touch Cells */}
        {board.map((row: any[], rIdx: number) => (
          <View key={`gom-r-${rIdx}`} style={styles.gridRow}>
            {row.map((cell: any, cIdx: number) => {
              const isLast = lastMove && lastMove[0] === rIdx && lastMove[1] === cIdx;
              const isWin = isWinCell(rIdx, cIdx);

              return (
                <TouchableOpacity
                  key={`gom-c-${rIdx}-${cIdx}`}
                  style={[
                    styles.gomokuCell,
                    {
                      width: cellSize,
                      height: cellSize,
                    },
                  ]}
                  onPress={() => !cell && handlePlaceGomoku(rIdx, cIdx)}
                  disabled={!!cell || !isMyTurn || isMatchOver}
                  activeOpacity={0.7}
                >
                  {cell && (
                    <View
                      style={[
                        styles.gomokuStone,
                        {
                          width: stoneSize,
                          height: stoneSize,
                          borderRadius: stoneSize / 2,
                          backgroundColor: cell === 'BLACK' ? '#141E24' : '#FFFFFF',
                          borderColor: isWin
                            ? '#3ED598'
                            : isLast
                            ? '#FFC542'
                            : cell === 'BLACK'
                            ? '#344550'
                            : '#D6E0E6',
                          borderWidth: isWin || isLast ? 2.5 : 1,
                        },
                      ]}
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>
    );
  };

  // 4. CHECKERS RENDERER (8x8)
  const renderCheckers = () => {
    const board = gameState?.board || Array(8).fill(Array(8).fill(null));
    const validMoves = (gameState?.validMoves || []) as Array<{
      from: [number, number];
      to: [number, number];
    }>;
    const cellSize = BOARD_SIZE / 8;

    const isAvailableTarget = (r: number, c: number) => {
      if (!selectedCell) return false;
      const [fromR, fromC] = selectedCell;
      return validMoves.some(
        (m) => m.from[0] === fromR && m.from[1] === fromC && m.to[0] === r && m.to[1] === c
      );
    };

    return (
      <View style={[styles.boardWrapper, { width: BOARD_SIZE, height: BOARD_SIZE }]}>
        <View style={[styles.standardGridBoard, { width: BOARD_SIZE, height: BOARD_SIZE }]}>
          {board.map((row: any[], rIdx: number) => (
            <View key={`chk-r-${rIdx}`} style={styles.gridRow}>
              {row.map((cell: any, cIdx: number) => {
                const isDarkSquare = (rIdx + cIdx) % 2 === 1;
                const isSelected = selectedCell && selectedCell[0] === rIdx && selectedCell[1] === cIdx;
                const isTarget = isAvailableTarget(rIdx, cIdx);

                let pieceBg = null;
                let isKing = false;
                if (cell) {
                  pieceBg = cell.color === 'RED' ? '#FF575F' : '#141E24';
                  isKing = cell.isKing;
                }

                return (
                  <TouchableOpacity
                    key={`chk-c-${rIdx}-${cIdx}`}
                    style={[
                      styles.checkersCell,
                      {
                        width: cellSize,
                        height: cellSize,
                        backgroundColor: isDarkSquare ? '#202E38' : '#324552',
                        borderColor: isSelected ? '#FFC542' : isTarget ? '#3ED598' : 'transparent',
                        borderWidth: isSelected || isTarget ? 2 : 0,
                      },
                    ]}
                    onPress={() => handleCheckersCellPress(rIdx, cIdx)}
                    disabled={!isMyTurn || isMatchOver}
                    activeOpacity={0.8}
                  >
                    {pieceBg && (
                      <View
                        style={[
                          styles.checkersPiece,
                          {
                            width: cellSize - 10,
                            height: cellSize - 10,
                            borderRadius: (cellSize - 10) / 2,
                            backgroundColor: pieceBg,
                            borderColor: cell.color === 'RED' ? '#FF8086' : '#455A67',
                          },
                        ]}
                      >
                        {isKing && (
                          <CrownIcon size={cellSize * 0.45} color="#FFC542" />
                        )}
                      </View>
                    )}
                    {isTarget && !pieceBg && (
                      <View
                        style={[
                          styles.legalMoveDot,
                          {
                            width: cellSize * 0.28,
                            height: cellSize * 0.28,
                            borderRadius: (cellSize * 0.28) / 2,
                          },
                        ]}
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>
      </View>
    );
  };

  // 5. CHESS RENDERER (8x8)
  const renderChess = () => {
    const board = gameState?.board || Array(8).fill(Array(8).fill(null));
    const lastMove = gameState?.lastMove as { from: [number, number]; to: [number, number] } | undefined;
    const inCheck = !!gameState?.inCheck;
    const cellSize = BOARD_SIZE / 8;

    return (
      <View style={[styles.boardWrapper, { width: BOARD_SIZE, height: BOARD_SIZE }]}>
        <View style={[styles.standardGridBoard, { width: BOARD_SIZE, height: BOARD_SIZE }]}>
          {board.map((row: any[], rIdx: number) => (
            <View key={`chs-r-${rIdx}`} style={styles.gridRow}>
              {row.map((cell: any, cIdx: number) => {
                const isLightSquare = (rIdx + cIdx) % 2 === 0;
                const isSelected = selectedCell && selectedCell[0] === rIdx && selectedCell[1] === cIdx;
                const isLastFrom = lastMove && lastMove.from[0] === rIdx && lastMove.from[1] === cIdx;
                const isLastTo = lastMove && lastMove.to[0] === rIdx && lastMove.to[1] === cIdx;
                const isKingInCheck =
                  inCheck &&
                  cell &&
                  (cell.type || '').toLowerCase() === 'k' &&
                  (cell.color || '').toUpperCase() === (gameState?.turnColor || gameState?.turn || '').toUpperCase();

                let bgColor = isLightSquare ? '#425866' : '#23343E';
                if (isLastFrom || isLastTo) bgColor = '#2F4B43';
                if (isSelected) bgColor = '#4E5328';
                if (isKingInCheck) bgColor = '#5C272C';

                return (
                  <TouchableOpacity
                    key={`chs-c-${rIdx}-${cIdx}`}
                    style={[
                      styles.chessCell,
                      {
                        width: cellSize,
                        height: cellSize,
                        backgroundColor: bgColor,
                        borderColor: isSelected ? '#FFC542' : 'transparent',
                        borderWidth: isSelected ? 2 : 0,
                      },
                    ]}
                    onPress={() => handleChessCellPress(rIdx, cIdx)}
                    disabled={!isMyTurn || isMatchOver}
                    activeOpacity={0.8}
                  >
                    {cell && (
                      <ChessPieceSvg
                        type={cell.type}
                        color={cell.color}
                        size={cellSize * 0.86}
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle="light-content" />

      {/* Top Header */}
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

      {/* Player Versus Card */}
      <View style={[styles.versusCard, { backgroundColor: '#141822', borderColor: '#262D3D', borderWidth: 1.5 }]}>
        {/* Player 1 (You) */}
        <View style={styles.playerColumn}>
          <View
            style={[
              styles.avatarWrap,
              isMyTurn && styles.activeAvatarWrap,
            ]}
          >
            <Avatar
              avatarUrl={player1?.user?.avatarUrl || null}
              displayName={player1?.user?.displayName || 'Player 1'}
              size="md"
            />
          </View>
          <Text style={styles.playerName} numberOfLines={1}>
            {player1?.user?.displayName || 'Player 1'}
          </Text>
          <Text style={styles.playerScore}>
            Wins: {scores[player1?.userId || ''] || 0}
          </Text>
        </View>

        {/* Center Timer & Status Badge */}
        <View style={styles.versusCenter}>
          <View
            style={[
              styles.timerPill,
              {
                backgroundColor:
                  secondsRemaining <= 5 ? '#3B1820' : '#133526',
                borderColor:
                  secondsRemaining <= 5 ? '#FF575F' : '#3ED598',
              },
            ]}
          >
            <Text
              style={[
                styles.timerText,
                {
                  color:
                    secondsRemaining <= 5 ? '#FF575F' : '#3ED598',
                },
              ]}
            >
              {secondsRemaining}s
            </Text>
          </View>
          <Text
            style={[
              styles.turnStatusText,
              { color: isMyTurn ? theme.colors.primary : theme.colors.textSecondary },
            ]}
          >
            {isMyTurn ? 'Your Turn' : 'Waiting...'}
          </Text>
        </View>

        {/* Player 2 (Opponent) */}
        <View style={styles.playerColumn}>
          <View
            style={[
              styles.avatarWrap,
              !isMyTurn && !isMatchOver && styles.activeAvatarWrap,
            ]}
          >
            <Avatar
              avatarUrl={player2?.user?.avatarUrl || null}
              displayName={player2?.user?.displayName || 'Opponent'}
              size="md"
            />
          </View>
          <Text style={styles.playerName} numberOfLines={1}>
            {player2?.user?.displayName || 'Opponent'}
          </Text>
          <Text style={styles.playerScore}>
            Wins: {scores[player2?.userId || ''] || 0}
          </Text>
        </View>
      </View>

      {/* Main Board View */}
      <ScrollView
        contentContainerStyle={styles.boardScrollContainer}
        showsVerticalScrollIndicator={false}
      >
        {gameType === 'CONNECT_FOUR' && renderConnectFour()}
        {gameType === 'REVERSI' && renderReversi()}
        {gameType === 'GOMOKU' && renderGomoku()}
        {gameType === 'CHECKERS' && renderCheckers()}
        {gameType === 'CHESS' && renderChess()}

        {/* Chess Alerts */}
        {gameType === 'CHESS' && gameState?.inCheck && !isMatchOver && (
          <View style={styles.checkAlertBanner}>
            <Text style={styles.checkAlertText}>⚠️ CHECK! King is under direct threat.</Text>
          </View>
        )}
      </ScrollView>

      {/* Toast Alert */}
      {toastMessage && (
        <View style={[styles.toast, { backgroundColor: theme.colors.surfaceElevated }]}>
          <Text style={styles.toastText}>{toastMessage}</Text>
        </View>
      )}

      {/* Pawn Promotion Modal (Chess) */}
      <Modal visible={!!promotionPendingMove} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.promoModalCard, { backgroundColor: theme.colors.surface }]}>
            <Text style={styles.promoTitle}>Promote Pawn</Text>
            <Text style={styles.promoSubtitle}>Select a replacement piece for your pawn:</Text>

            <View style={styles.promoPiecesRow}>
              {(['q', 'r', 'b', 'n'] as const).map((type) => (
                <TouchableOpacity
                  key={`promo-${type}`}
                  style={styles.promoOptionBtn}
                  onPress={() => handlePawnPromotionSelect(type)}
                  activeOpacity={0.8}
                >
                  <ChessPieceSvg
                    type={type}
                    color={
                      gameState?.players?.W === user?.id || gameState?.players?.WHITE === user?.id
                        ? 'w'
                        : 'b'
                    }
                    size={46}
                  />
                  <Text style={styles.promoPieceLabel}>
                    {type === 'q' ? 'Queen' : type === 'r' ? 'Rook' : type === 'b' ? 'Bishop' : 'Knight'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      {/* Game Over & Rematch Modal */}
      <Modal visible={isRematchModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.gameOverCard, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.trophyWrap}>
              <TrophyIcon size={56} color="#FFC542" />
            </View>

            <Text style={styles.gameOverTitle}>
              {gameState?.winnerId === user?.id
                ? 'Victory!'
                : gameState?.isDraw
                ? 'Stalemate / Draw!'
                : 'Defeat'}
            </Text>

            <Text style={styles.gameOverDesc}>
              {gameState?.winnerId === user?.id
                ? 'You dominated the board and secured the win!'
                : gameState?.isDraw
                ? 'Evenly matched duel! Neither side conceded ground.'
                : 'Your opponent outplayed you this round.'}
            </Text>

            {/* Rematch Handshake Button */}
            <TouchableOpacity
              style={[
                styles.primaryBtn,
                {
                  backgroundColor: rematchOfferedByPeer
                    ? '#3ED598'
                    : rematchRequestedByMe
                    ? theme.colors.surface
                    : theme.colors.primary,
                },
              ]}
              onPress={handleRematchPress}
              disabled={rematchRequestedByMe && !rematchOfferedByPeer}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryBtnText}>
                {rematchOfferedByPeer
                  ? 'Accept Rematch!'
                  : rematchRequestedByMe
                  ? 'Rematch Offered... Waiting'
                  : 'Play Rematch'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={onLeave}
              activeOpacity={0.8}
            >
              <Text style={styles.secondaryBtnText}>Back to Lobby</Text>
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
  safeArea: {
    flex: 1,
  },
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
  headerCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  versusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 14,
    marginVertical: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  playerColumn: {
    alignItems: 'center',
    width: 90,
  },
  avatarWrap: {
    borderRadius: 25,
    padding: 2,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  activeAvatarWrap: {
    borderColor: '#3ED598',
  },
  playerName: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 6,
  },
  playerScore: {
    color: '#97ADB6',
    fontSize: 11,
    fontWeight: '500',
    marginTop: 1,
  },
  versusCenter: {
    alignItems: 'center',
  },
  timerPill: {
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 14,
    borderWidth: 1,
  },
  timerText: {
    fontSize: 15,
    fontWeight: '700',
  },
  turnStatusText: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  boardScrollContainer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  boardWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridRow: {
    flexDirection: 'row',
  },

  // Connect Four Styles
  c4DropRow: {
    flexDirection: 'row',
    height: 38,
    marginBottom: 8,
  },
  c4DropBtn: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  c4Rack: {
    backgroundColor: '#1E3243',
    borderRadius: 18,
    padding: 4,
    borderWidth: 2,
    borderColor: '#2D4B63',
    overflow: 'hidden',
  },
  c4Slot: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  c4Disc: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 3,
    elevation: 3,
  },

  // Reversi Styles
  reversiCountsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 10,
    marginBottom: 8,
  },
  reversiCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  discPreview: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1,
    marginRight: 6,
  },
  reversiCountText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  passBtn: {
    backgroundColor: '#FF575F',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  passBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  reversiBoard: {
    backgroundColor: '#193C2C',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#285C44',
    overflow: 'hidden',
  },
  reversiCell: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.5,
    borderColor: '#234F3A',
  },
  reversiDisc: {
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 2,
    elevation: 2,
  },
  legalMoveDot: {
    backgroundColor: 'rgba(62, 213, 152, 0.45)',
  },

  // Gomoku Styles
  gomokuBoard: {
    backgroundColor: '#273843',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#3B5262',
    overflow: 'hidden',
  },
  gomokuCell: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  gomokuStone: {
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 2,
    elevation: 3,
  },

  // Checkers / Chess Grid Styles
  standardGridBoard: {
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#3D5463',
    overflow: 'hidden',
  },
  checkersCell: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkersPiece: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 2,
    elevation: 2,
  },
  chessCell: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Check Alert
  checkAlertBanner: {
    marginTop: 16,
    backgroundColor: 'rgba(255, 87, 95, 0.15)',
    borderColor: '#FF575F',
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
  },
  checkAlertText: {
    color: '#FF575F',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },

  // Toast
  toast: {
    position: 'absolute',
    bottom: 24,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  toastText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },

  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  promoModalCard: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  promoTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 6,
  },
  promoSubtitle: {
    color: '#97ADB6',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 20,
  },
  promoPiecesRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  promoOptionBtn: {
    alignItems: 'center',
    padding: 8,
  },
  promoPieceLabel: {
    color: '#CBD5E1',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
  },

  gameOverCard: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 25,
    padding: 26,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  trophyWrap: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(255, 197, 66, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  gameOverTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 0.4,
    marginBottom: 8,
  },
  gameOverDesc: {
    color: '#97ADB6',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  primaryBtn: {
    width: '100%',
    height: 52,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  primaryBtnText: {
    color: '#141E24',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryBtn: {
    width: '100%',
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
  },
  secondaryBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
