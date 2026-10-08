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
  G,
  Text as SvgText,
} from 'react-native-svg';
import { useTheme } from '../../theme';
import { TrophyIcon, CrownIcon, StarIcon, InfoIcon, ClockIcon } from '../../icons';
import { Avatar } from '../../components/atoms/Avatar';
import { GameRulesModal } from '../../components';
import { useAuth } from '../../features/auth/AuthContext';
import { MobileSocketService } from '../../services/socket.service';
import { RoomPlayer, RoomDetails } from '../../services/room.service';
import { PlayingCard, StandardSuit, UnoColor } from '../../../shared/game-types';

export type CardGameType =
  | 'UNO_STYLE'
  | 'HEARTS'
  | 'SPADES'
  | 'RUMMY'
  | 'GIN_RUMMY'
  | 'CRAZY_EIGHTS'
  | 'GO_FISH'
  | 'WAR'
  | 'DURAK'
  | 'PRESIDENT'
  | 'BLACKJACK'
  | 'POKER';

export interface CardGameScreenProps {
  roomCode: string;
  gameType: CardGameType;
  roomDetails?: RoomDetails | null;
  onLeave: () => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ----------------------------------------------------------------------------
// Pure Vector Playing Card SVG Component
// ----------------------------------------------------------------------------
interface VectorCardProps {
  card: PlayingCard;
  isSelected?: boolean;
  onPress?: () => void;
  width?: number;
  height?: number;
  faceDown?: boolean;
}

const VectorCard: React.FC<VectorCardProps> = ({
  card,
  isSelected = false,
  onPress,
  width = 64,
  height = 92,
  faceDown = false,
}) => {
  const isRed = card.suit === 'HEARTS' || card.suit === 'DIAMONDS' || card.suit === 'RED';
  const suitColor = isRed ? '#EF4444' : '#1E293B';

  const getSuitSymbol = (suit: string) => {
    switch (suit) {
      case 'HEARTS': return '♥';
      case 'DIAMONDS': return '♦';
      case 'CLUBS': return '♣';
      case 'SPADES': return '♠';
      case 'RED': return 'R';
      case 'YELLOW': return 'Y';
      case 'GREEN': return 'G';
      case 'BLUE': return 'B';
      default: return '★';
    }
  };

  const getRankDisplay = (rank: number, suit: string) => {
    if (suit === 'WILD') return rank === 14 ? '+4' : '★';
    if (['RED', 'YELLOW', 'GREEN', 'BLUE'].includes(suit)) {
      if (rank === 10) return '⊘'; // Skip
      if (rank === 11) return '⇄'; // Reverse
      if (rank === 12) return '+2'; // Draw 2
      return rank.toString();
    }
    if (rank === 14) return 'A';
    if (rank === 13) return 'K';
    if (rank === 12) return 'Q';
    if (rank === 11) return 'J';
    return rank.toString();
  };

  const cardBg = faceDown
    ? '#1E3A8A'
    : card.suit === 'RED'
    ? '#EF4444'
    : card.suit === 'YELLOW'
    ? '#F59E0B'
    : card.suit === 'GREEN'
    ? '#10B981'
    : card.suit === 'BLUE'
    ? '#3B82F6'
    : card.suit === 'WILD'
    ? '#8B5CF6'
    : '#FFFFFF';

  const textColor = ['RED', 'YELLOW', 'GREEN', 'BLUE', 'WILD'].includes(card.suit as string)
    ? '#FFFFFF'
    : suitColor;

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      disabled={!onPress}
      style={[
        styles.cardContainer,
        {
          width,
          height,
          transform: [{ translateY: isSelected ? -14 : 0 }],
        },
      ]}
    >
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        {/* Card Body */}
        <Rect
          x={1}
          y={1}
          width={width - 2}
          height={height - 2}
          rx={8}
          ry={8}
          fill={cardBg}
          stroke={isSelected ? '#F59E0B' : '#CBD5E1'}
          strokeWidth={isSelected ? 3 : 1}
        />

        {faceDown ? (
          /* Card Back Pattern */
          <G>
            <Rect
              x={5}
              y={5}
              width={width - 10}
              height={height - 10}
              rx={5}
              fill="#172554"
              stroke="#60A5FA"
              strokeWidth={1}
            />
            <Circle cx={width / 2} cy={height / 2} r={12} fill="#2563EB" />
            <SvgText
              x={width / 2}
              y={height / 2 + 4}
              fontSize={10}
              fontWeight="bold"
              fill="#FFFFFF"
              textAnchor="middle"
            >
              ★
            </SvgText>
          </G>
        ) : (
          /* Card Front */
          <G>
            {/* Top-Left Rank & Pip */}
            <SvgText
              x={6}
              y={16}
              fontSize={12}
              fontWeight="bold"
              fill={textColor}
            >
              {getRankDisplay(card.rank, card.suit as string)}
            </SvgText>
            <SvgText
              x={6}
              y={28}
              fontSize={10}
              fill={textColor}
            >
              {getSuitSymbol(card.suit as string)}
            </SvgText>

            {/* Center Symbol */}
            <SvgText
              x={width / 2}
              y={height / 2 + 8}
              fontSize={22}
              fontWeight="bold"
              fill={textColor}
              textAnchor="middle"
            >
              {['RED', 'YELLOW', 'GREEN', 'BLUE'].includes(card.suit as string)
                ? getRankDisplay(card.rank, card.suit as string)
                : getSuitSymbol(card.suit as string)}
            </SvgText>

            {/* Bottom-Right Rank (Inverted) */}
            <SvgText
              x={width - 6}
              y={height - 8}
              fontSize={12}
              fontWeight="bold"
              fill={textColor}
              textAnchor="end"
            >
              {getRankDisplay(card.rank, card.suit as string)}
            </SvgText>
          </G>
        )}
      </Svg>
    </TouchableOpacity>
  );
};

// ----------------------------------------------------------------------------
// Main Screen Component
// ----------------------------------------------------------------------------
export const CardGameScreen: React.FC<CardGameScreenProps> = ({
  roomCode,
  gameType,
  roomDetails,
  onLeave,
}) => {
  const { theme } = useTheme();
  const { user } = useAuth();

  const [gameState, setGameState] = useState<any>(null);
  const [round, setRound] = useState<number>(1);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [playerList, setPlayerList] = useState<RoomPlayer[]>(roomDetails?.players || []);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(20);
  const [isRulesModalVisible, setIsRulesModalVisible] = useState<boolean>(false);
  const [rematchModalVisible, setRematchModalVisible] = useState<boolean>(false);
  const [rematchOfferPending, setRematchOfferPending] = useState<boolean>(false);
  const [gameResult, setGameResult] = useState<any>(null);

  // Card Selection & Actions
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [selectedCardIds, setSelectedCardIds] = useState<string[]>([]);
  const [chosenColor, setChosenColor] = useState<UnoColor>('RED');
  const [declaredSuit, setDeclaredSuit] = useState<StandardSuit>('HEARTS');
  const [bidAmount, setBidAmount] = useState<number>(2);
  const [targetOpponentId, setTargetOpponentId] = useState<string>('');
  const [askRank, setAskRank] = useState<number>(14);

  const turnTimerRef = useRef<any>(null);
  const isMyTurn = gameState?.turnPlayerId === user?.id;

  // Sync turn countdown
  useEffect(() => {
    if (gameState?.turnExpiresAt) {
      const remaining = Math.max(0, Math.ceil((gameState.turnExpiresAt - Date.now()) / 1000));
      setSecondsRemaining(remaining);
      if (turnTimerRef.current) clearInterval(turnTimerRef.current);
      turnTimerRef.current = setInterval(() => {
        setSecondsRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(turnTimerRef.current!);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (turnTimerRef.current) clearInterval(turnTimerRef.current);
    };
  }, [gameState?.turnExpiresAt, gameState?.turnPlayerId]);

  // Socket Connection & Event Handling
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
      .catch((err) => console.log('[CardGameScreen] getGameState err:', err));

    const unsubState = MobileSocketService.onGameState((data) => {
      if (data.state) setGameState(data.state);
      if (data.scores) setScores(data.scores);
      if (data.round) setRound(data.round);
    });

    const unsubGameOver = MobileSocketService.onGameOver((data) => {
      setGameResult(data);
      setRematchModalVisible(true);
    });

    const unsubRematch = MobileSocketService.onRematchOffered((data) => {
      if (data.offeredByUserId !== user?.id) {
        Alert.alert('Rematch Offered', 'Opponent wants to play again!', [
          { text: 'Decline', style: 'cancel' },
          {
            text: 'Accept',
            onPress: () => {
              MobileSocketService.respondRematch(roomCode, true);
            },
          },
        ]);
      }
    });

    return () => {
      unsubState();
      unsubGameOver();
      unsubRematch();
    };
  }, [roomCode, user?.id]);

  // Dispatch Action
  const sendAction = useCallback(
    (action: any) => {
      if (!isMyTurn && action.type !== 'CALL_UNO' && action.type !== 'FLIP_CARD') {
        Alert.alert('Not Your Turn', 'Please wait for your turn to make a move.');
        return;
      }
      MobileSocketService.getSocket()?.emit('match:action', {
        roomCode,
        action,
      });
      setSelectedCardId(null);
      setSelectedCardIds([]);
    },
    [roomCode, isMyTurn]
  );

  // Extract My Hand
  const myCards: PlayingCard[] = React.useMemo(() => {
    if (!gameState || !user?.id) return [];
    if (gameState.hands && gameState.hands[user.id]) {
      return gameState.hands[user.id];
    }
    if (gameState.players) {
      const p = gameState.players.find((pl: any) => pl.userId === user.id);
      if (p && p.hand) return p.hand;
    }
    if (gameState.playerHands && gameState.playerHands[user.id]) {
      return gameState.playerHands[user.id].cards || [];
    }
    return [];
  }, [gameState, user?.id]);

  // Toggle Card Selection
  const toggleSelectCard = (id: string) => {
    if (gameType === 'PRESIDENT') {
      setSelectedCardIds((prev) =>
        prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
      );
    } else {
      setSelectedCardId((prev) => (prev === id ? null : id));
    }
  };

  // Rematch action
  const handleRematch = () => {
    setRematchOfferPending(true);
    MobileSocketService.getSocket()?.emit('match:rematch_offer', { roomCode });
  };

  // Render Table Arena Center
  const renderTableArena = () => {
    return (
      <View style={[styles.feltTable, { backgroundColor: '#064E3B', borderColor: '#F59E0B' }]}>
        {/* Felt Texture Ring */}
        <View style={styles.feltInnerRing}>
          {gameType === 'UNO_STYLE' && (
            <View style={styles.centerPileRow}>
              {/* Draw Pile */}
              <View style={styles.deckPile}>
                <VectorCard
                  card={{ id: 'uno-back', suit: 'WILD', rank: 0, label: 'UNO' }}
                  faceDown
                  onPress={() => isMyTurn && sendAction({ type: 'DRAW_CARD' })}
                />
                <Text style={styles.pileBadge}>Deck ({gameState?.drawPileCount || 0})</Text>
              </View>

              {/* Discard Pile */}
              <View style={styles.deckPile}>
                {gameState?.discardPile && gameState.discardPile[0] ? (
                  <VectorCard card={gameState.discardPile[0]} />
                ) : (
                  <View style={styles.emptySlot} />
                )}
                <Text style={styles.pileBadge}>
                  Color: {gameState?.currentColor || 'ANY'}
                </Text>
              </View>
            </View>
          )}

          {(gameType === 'HEARTS' || gameType === 'SPADES' || gameType === 'PRESIDENT') && (
            <View style={styles.trickStage}>
              <Text style={styles.stageTitle}>Current Trick</Text>
              <View style={styles.trickCardsRow}>
                {gameState?.currentTrick && gameState.currentTrick.length > 0 ? (
                  gameState.currentTrick.map((item: any, idx: number) => {
                    const card = item.card || item;
                    return (
                      <View key={idx} style={styles.trickCardWrapper}>
                        <VectorCard card={card} width={52} height={76} />
                        {item.playerId && (
                          <Text style={styles.trickPlayerTag} numberOfLines={1}>
                            {playerList.find((p) => p.userId === item.playerId)?.user?.displayName || 'P'}
                          </Text>
                        )}
                      </View>
                    );
                  })
                ) : (
                  <Text style={styles.emptyTrickText}>Awaiting Lead Card</Text>
                )}
              </View>
            </View>
          )}

          {gameType === 'WAR' && (
            <View style={styles.warClashArea}>
              <Text style={styles.stageTitle}>Card Clash Battle</Text>
              <View style={styles.warCardsRow}>
                {gameState?.currentBattle &&
                  Object.keys(gameState.currentBattle).map((uid) => {
                    const card = gameState.currentBattle[uid];
                    return (
                      <View key={uid} style={styles.warCardCol}>
                        <Text style={styles.warPlayerName}>
                          {playerList.find((p) => p.userId === uid)?.user?.displayName || 'Player'}
                        </Text>
                        {card ? (
                          <VectorCard card={card} width={64} height={92} />
                        ) : (
                          <View style={styles.emptySlot} />
                        )}
                      </View>
                    );
                  })}
              </View>
              {gameState?.isWar && <Text style={styles.warBannerText}>⚔️ WAR DECLARED! ⚔️</Text>}
            </View>
          )}

          {gameType === 'BLACKJACK' && (
            <View style={styles.blackjackArea}>
              {/* Dealer Hand */}
              <Text style={styles.dealerTitle}>Dealer's Hand</Text>
              <View style={styles.dealerHandRow}>
                {gameState?.dealerHand?.cards?.map((c: PlayingCard, idx: number) => (
                  <VectorCard
                    key={idx}
                    card={c}
                    faceDown={!c.isFaceUp}
                    width={50}
                    height={72}
                  />
                ))}
              </View>
              <Text style={styles.dealerScoreText}>
                Dealer: {gameState?.isDealerTurn ? gameState.dealerHand?.value : 'Visible Only'}
              </Text>
            </View>
          )}

          {gameType === 'POKER' && (
            <View style={styles.pokerArea}>
              {/* Pot Counter */}
              <View style={styles.potPill}>
                <Text style={styles.potText}>Pot: {gameState?.pot || 0} Chips</Text>
              </View>
              {/* 5 Community Cards */}
              <View style={styles.communityCardsRow}>
                {[0, 1, 2, 3, 4].map((idx) => {
                  const card = gameState?.communityCards?.[idx];
                  return card ? (
                    <VectorCard key={idx} card={card} width={48} height={70} />
                  ) : (
                    <View key={idx} style={styles.emptyPokerSlot}>
                      <Text style={styles.emptySlotPip}>★</Text>
                    </View>
                  );
                })}
              </View>
              <Text style={styles.pokerStageLabel}>
                Stage: {gameState?.stage || 'PREFLOP'} • Bet: {gameState?.currentBet || 0}
              </Text>
            </View>
          )}

          {gameType === 'DURAK' && (
            <View style={styles.durakArea}>
              <View style={styles.durakTrumpHeader}>
                <Text style={styles.durakTrumpText}>
                  Trump Suit: {gameState?.trumpSuit}
                </Text>
                {gameState?.trumpCard && (
                  <VectorCard card={gameState.trumpCard} width={38} height={54} />
                )}
              </View>
              <View style={styles.durakTablePairs}>
                {gameState?.table && gameState.table.length > 0 ? (
                  gameState.table.map((pair: any, idx: number) => (
                    <View key={idx} style={styles.durakPairCol}>
                      <VectorCard card={pair.attackCard} width={44} height={64} />
                      {pair.defendCard ? (
                        <View style={{ marginTop: -20, marginLeft: 10 }}>
                          <VectorCard card={pair.defendCard} width={44} height={64} />
                        </View>
                      ) : (
                        <Text style={styles.undefendedText}>Open</Text>
                      )}
                    </View>
                  ))
                ) : (
                  <Text style={styles.emptyTrickText}>Table Clear</Text>
                )}
              </View>
            </View>
          )}

          {gameType === 'GO_FISH' && (
            <View style={styles.goFishArea}>
              <Text style={styles.stageTitle}>Ocean Stock Pond</Text>
              <Text style={styles.goFishOceanCount}>
                🐟 {gameState?.oceanCount || 0} Cards Left in Ocean
              </Text>
              {gameState?.lastAskResult && (
                <Text style={styles.goFishLogText}>{gameState.lastAskResult}</Text>
              )}
            </View>
          )}

          {(gameType === 'RUMMY' || gameType === 'GIN_RUMMY') && (
            <View style={styles.rummyStage}>
              <View style={styles.centerPileRow}>
                <TouchableOpacity
                  style={styles.deckPile}
                  disabled={!isMyTurn || gameState?.hasDrawn}
                  onPress={() => sendAction({ type: 'DRAW_STOCK' })}
                >
                  <VectorCard
                    card={{ id: 'stock', suit: 'SPADES', rank: 0, label: 'Deck' }}
                    faceDown
                  />
                  <Text style={styles.pileBadge}>Stock ({gameState?.stockCount || 0})</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.deckPile}
                  disabled={!isMyTurn || gameState?.hasDrawn}
                  onPress={() => sendAction({ type: 'DRAW_DISCARD' })}
                >
                  {gameState?.discardPile && gameState.discardPile[0] ? (
                    <VectorCard card={gameState.discardPile[0]} />
                  ) : (
                    <View style={styles.emptySlot} />
                  )}
                  <Text style={styles.pileBadge}>Discard Pile</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {gameType === 'CRAZY_EIGHTS' && (
            <View style={styles.centerPileRow}>
              <TouchableOpacity
                style={styles.deckPile}
                disabled={!isMyTurn}
                onPress={() => sendAction({ type: 'DRAW_CARD' })}
              >
                <VectorCard
                  card={{ id: 'c8-deck', suit: 'SPADES', rank: 0, label: 'Deck' }}
                  faceDown
                />
                <Text style={styles.pileBadge}>Draw Deck</Text>
              </TouchableOpacity>
              <View style={styles.deckPile}>
                {gameState?.topCard && <VectorCard card={gameState.topCard} />}
                <Text style={styles.pileBadge}>Suit: {gameState?.currentSuit}</Text>
              </View>
            </View>
          )}
        </View>
      </View>
    );
  };

  // Render Action Controls
  const renderActionControls = () => {
    return (
      <View style={styles.actionControlsContainer}>
        {/* Zero Gambling Warning Banner */}
        {(gameType === 'BLACKJACK' || gameType === 'POKER') && (
          <View style={styles.zeroGamblingBanner}>
            <Text style={styles.zeroGamblingText}>
              🛡️ Recreational Play Money Tokens • Zero Real Money Stakes
            </Text>
          </View>
        )}

        <View style={styles.buttonsRow}>
          {gameType === 'UNO_STYLE' && (
            <>
              <TouchableOpacity
                style={[styles.primaryActionBtn, !selectedCardId && styles.btnDisabled]}
                disabled={!selectedCardId || !isMyTurn}
                onPress={() =>
                  sendAction({
                    type: 'PLAY_CARD',
                    cardId: selectedCardId,
                    chosenColor,
                  })
                }
              >
                <Text style={styles.primaryActionBtnText}>Play Card</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.secondaryActionBtn}
                disabled={!isMyTurn}
                onPress={() => sendAction({ type: 'DRAW_CARD' })}
              >
                <Text style={styles.secondaryActionBtnText}>Draw</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.secondaryActionBtn, { backgroundColor: '#DC2626' }]}
                onPress={() => sendAction({ type: 'CALL_UNO' })}
              >
                <Text style={styles.primaryActionBtnText}>UNO!</Text>
              </TouchableOpacity>
            </>
          )}

          {(gameType === 'HEARTS' || gameType === 'CRAZY_EIGHTS') && (
            <>
              <TouchableOpacity
                style={[styles.primaryActionBtn, !selectedCardId && styles.btnDisabled]}
                disabled={!selectedCardId || !isMyTurn}
                onPress={() =>
                  sendAction({
                    type: 'PLAY_CARD',
                    cardId: selectedCardId,
                    declaredSuit,
                  })
                }
              >
                <Text style={styles.primaryActionBtnText}>Play Selected</Text>
              </TouchableOpacity>
              {gameType === 'CRAZY_EIGHTS' && (
                <TouchableOpacity
                  style={styles.secondaryActionBtn}
                  disabled={!isMyTurn}
                  onPress={() => sendAction({ type: 'DRAW_CARD' })}
                >
                  <Text style={styles.secondaryActionBtnText}>Draw Card</Text>
                </TouchableOpacity>
              )}
            </>
          )}

          {gameType === 'SPADES' && (
            <>
              {gameState?.bids && gameState.bids[user?.id || ''] === null ? (
                <View style={styles.bidSelectorRow}>
                  <Text style={styles.bidLabel}>Bid:</Text>
                  {[0, 1, 2, 3, 4, 5].map((b) => (
                    <TouchableOpacity
                      key={b}
                      style={[styles.bidChip, bidAmount === b && styles.bidChipSelected]}
                      onPress={() => setBidAmount(b)}
                    >
                      <Text style={styles.bidChipText}>{b === 0 ? 'Nil' : b}</Text>
                    </TouchableOpacity>
                  ))}
                  <TouchableOpacity
                    style={styles.primaryActionBtn}
                    onPress={() => sendAction({ type: 'BID', bidAmount })}
                  >
                    <Text style={styles.primaryActionBtnText}>Submit Bid</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={[styles.primaryActionBtn, !selectedCardId && styles.btnDisabled]}
                  disabled={!selectedCardId || !isMyTurn}
                  onPress={() => sendAction({ type: 'PLAY_CARD', cardId: selectedCardId })}
                >
                  <Text style={styles.primaryActionBtnText}>Play Card</Text>
                </TouchableOpacity>
              )}
            </>
          )}

          {gameType === 'WAR' && (
            <TouchableOpacity
              style={styles.primaryActionBtn}
              onPress={() => sendAction({ type: 'FLIP_CARD' })}
            >
              <Text style={styles.primaryActionBtnText}>Flip Battle Card</Text>
            </TouchableOpacity>
          )}

          {gameType === 'DURAK' && (
            <>
              {isMyTurn && gameState?.turnPlayerId === gameState?.defenderId ? (
                <>
                  <TouchableOpacity
                    style={[styles.primaryActionBtn, !selectedCardId && styles.btnDisabled]}
                    disabled={!selectedCardId}
                    onPress={() => sendAction({ type: 'DEFEND', cardId: selectedCardId })}
                  >
                    <Text style={styles.primaryActionBtnText}>Defend</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.secondaryActionBtn, { backgroundColor: '#EF4444' }]}
                    onPress={() => sendAction({ type: 'TAKE' })}
                  >
                    <Text style={styles.primaryActionBtnText}>Take All</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <TouchableOpacity
                    style={[styles.primaryActionBtn, !selectedCardId && styles.btnDisabled]}
                    disabled={!selectedCardId || !isMyTurn}
                    onPress={() => sendAction({ type: 'ATTACK', cardId: selectedCardId })}
                  >
                    <Text style={styles.primaryActionBtnText}>Attack</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.secondaryActionBtn}
                    disabled={!isMyTurn}
                    onPress={() => sendAction({ type: 'PASS_ATTACK' })}
                  >
                    <Text style={styles.secondaryActionBtnText}>Pass Attack</Text>
                  </TouchableOpacity>
                </>
              )}
            </>
          )}

          {gameType === 'PRESIDENT' && (
            <>
              <TouchableOpacity
                style={[styles.primaryActionBtn, selectedCardIds.length === 0 && styles.btnDisabled]}
                disabled={selectedCardIds.length === 0 || !isMyTurn}
                onPress={() => sendAction({ type: 'PLAY_CARDS', cardIds: selectedCardIds })}
              >
                <Text style={styles.primaryActionBtnText}>Play ({selectedCardIds.length})</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.secondaryActionBtn}
                disabled={!isMyTurn}
                onPress={() => sendAction({ type: 'PASS' })}
              >
                <Text style={styles.secondaryActionBtnText}>Pass</Text>
              </TouchableOpacity>
            </>
          )}

          {gameType === 'BLACKJACK' && (
            <>
              <TouchableOpacity
                style={styles.primaryActionBtn}
                disabled={!isMyTurn}
                onPress={() => sendAction({ type: 'HIT' })}
              >
                <Text style={styles.primaryActionBtnText}>Hit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.secondaryActionBtn}
                disabled={!isMyTurn}
                onPress={() => sendAction({ type: 'STAND' })}
              >
                <Text style={styles.secondaryActionBtnText}>Stand</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.secondaryActionBtn, { backgroundColor: '#F59E0B' }]}
                disabled={!isMyTurn}
                onPress={() => sendAction({ type: 'DOUBLE_DOWN' })}
              >
                <Text style={styles.primaryActionBtnText}>Double</Text>
              </TouchableOpacity>
            </>
          )}

          {gameType === 'POKER' && (
            <>
              <TouchableOpacity
                style={styles.secondaryActionBtn}
                disabled={!isMyTurn}
                onPress={() => sendAction({ type: 'CHECK' })}
              >
                <Text style={styles.secondaryActionBtnText}>Check</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.primaryActionBtn}
                disabled={!isMyTurn}
                onPress={() => sendAction({ type: 'CALL' })}
              >
                <Text style={styles.primaryActionBtnText}>Call</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.secondaryActionBtn, { backgroundColor: '#3B82F6' }]}
                disabled={!isMyTurn}
                onPress={() => sendAction({ type: 'RAISE' })}
              >
                <Text style={styles.primaryActionBtnText}>Raise</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.secondaryActionBtn, { backgroundColor: '#EF4444' }]}
                disabled={!isMyTurn}
                onPress={() => sendAction({ type: 'FOLD' })}
              >
                <Text style={styles.primaryActionBtnText}>Fold</Text>
              </TouchableOpacity>
            </>
          )}

          {(gameType === 'RUMMY' || gameType === 'GIN_RUMMY') && (
            <>
              <TouchableOpacity
                style={[styles.primaryActionBtn, !selectedCardId && styles.btnDisabled]}
                disabled={!selectedCardId || !isMyTurn || !gameState?.hasDrawn}
                onPress={() => sendAction({ type: 'DISCARD', cardId: selectedCardId })}
              >
                <Text style={styles.primaryActionBtnText}>Discard</Text>
              </TouchableOpacity>
              {gameType === 'GIN_RUMMY' ? (
                <TouchableOpacity
                  style={[styles.secondaryActionBtn, { backgroundColor: '#F59E0B' }]}
                  disabled={!selectedCardId || !isMyTurn || !gameState?.hasDrawn}
                  onPress={() => sendAction({ type: 'KNOCK', cardId: selectedCardId })}
                >
                  <Text style={styles.primaryActionBtnText}>Knock</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.secondaryActionBtn, { backgroundColor: '#10B981' }]}
                  disabled={!selectedCardId || !isMyTurn || !gameState?.hasDrawn}
                  onPress={() => sendAction({ type: 'DECLARE', cardId: selectedCardId })}
                >
                  <Text style={styles.primaryActionBtnText}>Declare</Text>
                </TouchableOpacity>
              )}
            </>
          )}

          {gameType === 'GO_FISH' && (
            <TouchableOpacity
              style={[styles.primaryActionBtn, !selectedCardId && styles.btnDisabled]}
              disabled={!selectedCardId || !isMyTurn}
              onPress={() => {
                const card = myCards.find((c) => c.id === selectedCardId);
                const oppId = playerList.find((p) => p.userId !== user?.id)?.userId || '';
                if (card && oppId) {
                  sendAction({
                    type: 'ASK_RANK',
                    targetUserId: oppId,
                    rank: card.rank,
                  });
                }
              }}
            >
              <Text style={styles.primaryActionBtnText}>Ask for Rank</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle="light-content" />

      {/* Header Bar */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.leaveBtn} onPress={onLeave}>
          <Text style={styles.leaveBtnText}>✕ Resign</Text>
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={[styles.gameTitle, { color: theme.colors.textPrimary }]}>
            {gameType.replace(/_/g, ' ')}
          </Text>
          <Text style={[styles.roomCodeBadge, { color: theme.colors.textSecondary }]}>
            Room: {roomCode} • Round {round}
          </Text>
        </View>

        {/* Right Action: (i) button and Turn Timer Badge */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <TouchableOpacity
            style={[styles.leaveBtn, { backgroundColor: theme.colors.cardTintMint, paddingHorizontal: 8 }]}
            onPress={() => setIsRulesModalVisible(true)}
            activeOpacity={0.7}
            accessibilityLabel="Game Rules & Steps"
          >
            <InfoIcon size={18} color={theme.colors.primary} />
          </TouchableOpacity>

          <View
            style={[
              styles.timerPill,
              {
                backgroundColor: isMyTurn ? '#F59E0B' : theme.colors.surfaceElevated,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
              },
            ]}
          >
            <ClockIcon size={13} color={isMyTurn ? '#000000' : theme.colors.textPrimary} />
            <Text
              style={[
                styles.timerText,
                { color: isMyTurn ? '#000000' : theme.colors.textPrimary },
              ]}
            >
              {secondsRemaining}s
            </Text>
          </View>
        </View>
      </View>

      {/* Opponents HUD */}
      <View style={styles.opponentsRow}>
        {playerList
          .filter((p) => p.userId !== user?.id)
          .map((p) => {
            const isTurn = gameState?.turnPlayerId === p.userId;
            const oppHand = gameState?.hands?.[p.userId] || [];
            const pName = p.user?.displayName || p.user?.username || 'Player';
            return (
              <View
                key={p.userId}
                style={[
                  styles.opponentCard,
                  isTurn && styles.opponentActiveTurn,
                  { backgroundColor: theme.colors.surfaceElevated },
                ]}
              >
                <Avatar displayName={pName} size="sm" />
                <Text style={styles.opponentName} numberOfLines={1}>
                  {pName}
                </Text>
                <Text style={styles.opponentCardsCount}>
                  🂠 {oppHand.length} cards
                </Text>
              </View>
            );
          })}
      </View>

      {/* Main Card Felt Arena */}
      {renderTableArena()}

      {/* Player Hand Fan */}
      <View style={styles.handArea}>
        <View style={styles.handHeader}>
          <Text style={styles.handTitle}>Your Hand ({myCards.length})</Text>
          {isMyTurn && <Text style={styles.yourTurnNotice}>★ YOUR TURN ★</Text>}
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.handScrollContent}
        >
          {myCards.map((card) => {
            const isSelected =
              selectedCardId === card.id || selectedCardIds.includes(card.id);
            return (
              <VectorCard
                key={card.id}
                card={card}
                isSelected={isSelected}
                onPress={() => toggleSelectCard(card.id)}
              />
            );
          })}
        </ScrollView>
      </View>

      {/* Action Controls Dock */}
      {renderActionControls()}

      {/* Game Over / Rematch Modal */}
      <Modal visible={rematchModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.colors.surfaceElevated }]}>
            <TrophyIcon size={56} color="#F59E0B" />
            <Text style={[styles.modalTitle, { color: theme.colors.textPrimary }]}>
              {gameResult?.winnerId === user?.id
                ? 'Victory!'
                : gameResult?.winnerId
                ? 'Round Finished'
                : 'Match Concluded'}
            </Text>
            <Text style={[styles.modalSubtitle, { color: theme.colors.textSecondary }]}>
              {gameResult?.winnerId === user?.id
                ? 'Congratulations, you won the match!'
                : 'Better luck next hand!'}
            </Text>

            <TouchableOpacity
              style={[
                styles.primaryActionBtn,
                { width: '100%', marginTop: 20 },
                rematchOfferPending && styles.btnDisabled,
              ]}
              disabled={rematchOfferPending}
              onPress={handleRematch}
            >
              <Text style={styles.primaryActionBtnText}>
                {rematchOfferPending ? 'Waiting for Opponent...' : 'Offer Rematch'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.secondaryActionBtn, { width: '100%', marginTop: 10 }]}
              onPress={() => {
                setRematchModalVisible(false);
                onLeave();
              }}
            >
              <Text style={styles.secondaryActionBtnText}>Return to Lobby</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <GameRulesModal
        visible={isRulesModalVisible}
        gameType={gameType}
        gameTitle={gameType.replace(/_/g, ' ')}
        category="CARD"
        onClose={() => setIsRulesModalVisible(false)}
      />
    </SafeAreaView>
  );
};

// ----------------------------------------------------------------------------
// Styles
// ----------------------------------------------------------------------------
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
  leaveBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#374151',
  },
  leaveBtnText: {
    color: '#F87171',
    fontWeight: 'bold',
    fontSize: 13,
  },
  headerCenter: {
    alignItems: 'center',
  },
  gameTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  roomCodeBadge: {
    fontSize: 11,
    marginTop: 2,
  },
  timerPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  timerText: {
    fontWeight: 'bold',
    fontSize: 13,
  },
  opponentsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
    marginVertical: 4,
  },
  opponentCard: {
    alignItems: 'center',
    padding: 6,
    borderRadius: 10,
    width: 80,
  },
  opponentActiveTurn: {
    borderColor: '#F59E0B',
    borderWidth: 2,
  },
  opponentName: {
    fontSize: 10,
    color: '#CBD5E1',
    marginTop: 2,
  },
  opponentCardsCount: {
    fontSize: 9,
    color: '#94A3B8',
  },
  feltTable: {
    marginHorizontal: 14,
    height: 220,
    borderRadius: 25,
    borderWidth: 4,
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  feltInnerRing: {
    width: '100%',
    height: '100%',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerPileRow: {
    flexDirection: 'row',
    gap: 24,
    alignItems: 'center',
  },
  deckPile: {
    alignItems: 'center',
  },
  pileBadge: {
    color: '#F1F5F9',
    fontSize: 10,
    fontWeight: 'bold',
    marginTop: 4,
  },
  emptySlot: {
    width: 64,
    height: 92,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
    borderStyle: 'dashed',
  },
  trickStage: {
    alignItems: 'center',
  },
  stageTitle: {
    color: '#FEF08A',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  trickCardsRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  trickCardWrapper: {
    alignItems: 'center',
  },
  trickPlayerTag: {
    color: '#E2E8F0',
    fontSize: 9,
    marginTop: 2,
  },
  emptyTrickText: {
    color: '#A7F3D0',
    fontSize: 12,
    fontStyle: 'italic',
  },
  warClashArea: {
    alignItems: 'center',
  },
  warCardsRow: {
    flexDirection: 'row',
    gap: 24,
  },
  warCardCol: {
    alignItems: 'center',
  },
  warPlayerName: {
    color: '#CBD5E1',
    fontSize: 10,
    marginBottom: 4,
  },
  warBannerText: {
    color: '#F87171',
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 8,
  },
  blackjackArea: {
    alignItems: 'center',
  },
  dealerTitle: {
    color: '#FEF08A',
    fontSize: 11,
    marginBottom: 4,
  },
  dealerHandRow: {
    flexDirection: 'row',
    gap: 6,
  },
  dealerScoreText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 6,
  },
  pokerArea: {
    alignItems: 'center',
  },
  potPill: {
    backgroundColor: '#B45309',
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderRadius: 12,
    marginBottom: 8,
  },
  potText: {
    color: '#FEF08A',
    fontSize: 12,
    fontWeight: 'bold',
  },
  communityCardsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  emptyPokerSlot: {
    width: 48,
    height: 70,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptySlotPip: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 14,
  },
  pokerStageLabel: {
    color: '#CBD5E1',
    fontSize: 10,
    marginTop: 6,
  },
  durakArea: {
    alignItems: 'center',
  },
  durakTrumpHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  durakTrumpText: {
    color: '#FEF08A',
    fontSize: 11,
    fontWeight: 'bold',
  },
  durakTablePairs: {
    flexDirection: 'row',
    gap: 12,
  },
  durakPairCol: {
    alignItems: 'center',
  },
  undefendedText: {
    color: '#F87171',
    fontSize: 9,
    fontWeight: 'bold',
  },
  goFishArea: {
    alignItems: 'center',
  },
  goFishOceanCount: {
    color: '#67E8F9',
    fontSize: 14,
    fontWeight: 'bold',
    marginVertical: 4,
  },
  goFishLogText: {
    color: '#FEF08A',
    fontSize: 11,
    textAlign: 'center',
    paddingHorizontal: 10,
  },
  rummyStage: {
    alignItems: 'center',
  },
  handArea: {
    marginTop: 10,
    paddingHorizontal: 14,
  },
  handHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  handTitle: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: 'bold',
  },
  yourTurnNotice: {
    color: '#F59E0B',
    fontSize: 12,
    fontWeight: 'bold',
  },
  handScrollContent: {
    gap: 8,
    paddingBottom: 6,
    paddingTop: 14,
  },
  cardContainer: {
    borderRadius: 8,
  },
  actionControlsContainer: {
    paddingHorizontal: 14,
    paddingTop: 6,
    paddingBottom: 10,
  },
  zeroGamblingBanner: {
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    marginBottom: 6,
    alignItems: 'center',
  },
  zeroGamblingText: {
    color: '#38BDF8',
    fontSize: 10,
    fontWeight: 'bold',
  },
  buttonsRow: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
  },
  primaryActionBtn: {
    backgroundColor: '#10B981',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryActionBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  secondaryActionBtn: {
    backgroundColor: '#475569',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryActionBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  btnDisabled: {
    opacity: 0.4,
  },
  bidSelectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  bidLabel: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 12,
  },
  bidChip: {
    backgroundColor: '#334155',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
  },
  bidChipSelected: {
    backgroundColor: '#F59E0B',
  },
  bidChipText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 11,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 12,
  },
  modalSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 6,
  },
});
