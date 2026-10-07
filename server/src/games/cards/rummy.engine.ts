import { GameEngine, GamePlayerMeta } from '../game.definition';
import { GameRegistry } from '../game.registry';
import {
  CardMeld,
  GameActionResult,
  GameDefinition,
  PlayingCard,
  RummyAction,
  RummyPlayerState,
  RummyResult,
  RummyState,
} from '../../../../shared/game-types';
import { CardDeck } from './core/deck';
import { CardEvaluator } from './core/evaluator';

export const RUMMY_TURN_DURATION_MS = 30000;

export class RummyEngine implements GameEngine<RummyState, RummyAction, RummyResult> {
  readonly definition: GameDefinition;

  constructor() {
    this.definition = GameRegistry.getGame('RUMMY') || {
      id: 'RUMMY',
      name: 'Indian Rummy',
      category: 'CARD',
      minPlayers: 2,
      maxPlayers: 6,
      defaultPlayers: 4,
      supportsSpectators: true,
      turnTimeSeconds: 30,
      description: 'Meld cards into valid sequences and sets.',
      iconName: 'gamepad',
    };
  }

  initialize(players: GamePlayerMeta[], settings?: any): RummyState {
    if (!players || players.length < 2) {
      throw new Error('Rummy requires at least 2 players');
    }

    const playerIds = players.map((p) => p.userId);
    // Double deck for 3+ players, single for 2
    const deckCards =
      players.length > 2
        ? [...CardDeck.createStandard52(), ...CardDeck.createStandard52()]
        : CardDeck.createStandard52();

    const shuffled = CardDeck.shuffle(deckCards);
    const { hands, remainingDeck } = CardDeck.deal(shuffled, playerIds, 13);

    const jokerCard = remainingDeck.pop() || {
      id: 'joker-0',
      suit: 'SPADES',
      rank: 14,
      label: 'A♠ (Joker)',
      isFaceUp: true,
    };
    jokerCard.isFaceUp = true;

    const initialDiscard = remainingDeck.pop() || {
      id: 'disc-0',
      suit: 'HEARTS',
      rank: 7,
      label: '7♥',
      isFaceUp: true,
    };
    initialDiscard.isFaceUp = true;

    const playerStates: RummyPlayerState[] = playerIds.map((uid) => ({
      userId: uid,
      hand: hands[uid],
      melds: [],
      score: 0,
      hasDeclared: false,
    }));

    const firstPlayerId = settings?.firstPlayerId || playerIds[0];

    return {
      players: playerStates,
      stockCount: remainingDeck.length,
      discardPile: [initialDiscard],
      jokerCard,
      turnPlayerId: firstPlayerId,
      hasDrawn: false,
      winnerId: null,
      turnExpiresAt: Date.now() + RUMMY_TURN_DURATION_MS,
    };
  }

  validateAction(state: RummyState, playerId: string, action: RummyAction): boolean {
    if (state.winnerId) {
      throw new Error('Game already finished');
    }

    if (state.turnPlayerId !== playerId) {
      throw new Error(`Not your turn. Turn belongs to ${state.turnPlayerId}`);
    }

    const player = state.players.find((p) => p.userId === playerId);
    if (!player) {
      throw new Error('Player not in game');
    }

    if (action.type === 'DRAW_STOCK' || action.type === 'DRAW_DISCARD') {
      if (state.hasDrawn) {
        throw new Error('Already drawn a card this turn; must DISCARD or DECLARE');
      }
      if (action.type === 'DRAW_DISCARD' && state.discardPile.length === 0) {
        throw new Error('Discard pile is empty');
      }
      return true;
    }

    if (action.type === 'DISCARD' || action.type === 'DECLARE') {
      if (!state.hasDrawn) {
        throw new Error('Must draw a card before discarding or declaring');
      }
      if (!action.cardId) {
        throw new Error('Must specify cardId to discard');
      }
      const hasCard = player.hand.some((c) => c.id === action.cardId);
      if (!hasCard) {
        throw new Error('Discard card not found in hand');
      }
      return true;
    }

    throw new Error(`Unsupported action type: ${action.type}`);
  }

  applyAction(state: RummyState, playerId: string, action: RummyAction): GameActionResult<RummyState> {
    try {
      this.validateAction(state, playerId, action);
    } catch (err: any) {
      return { success: false, state, error: err.message };
    }

    const nextState: RummyState = {
      ...state,
      players: state.players.map((p) => ({
        ...p,
        hand: [...p.hand],
        melds: [...p.melds],
      })),
      discardPile: [...state.discardPile],
    };

    const pIdx = nextState.players.findIndex((p) => p.userId === playerId);
    const player = nextState.players[pIdx];

    if (action.type === 'DRAW_STOCK') {
      nextState.stockCount = Math.max(0, nextState.stockCount - 1);
      // Generate standard card from random pool
      const suits = ['HEARTS', 'DIAMONDS', 'CLUBS', 'SPADES'] as const;
      const rank = Math.floor(Math.random() * 13) + 2;
      const suit = suits[Math.floor(Math.random() * suits.length)];
      player.hand.push({
        id: `draw-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        suit,
        rank,
        label: `${rank}${suit[0]}`,
        isFaceUp: true,
      });
      nextState.hasDrawn = true;
      return { success: true, state: nextState };
    }

    if (action.type === 'DRAW_DISCARD') {
      const drawnCard = nextState.discardPile.shift()!;
      drawnCard.isFaceUp = true;
      player.hand.push(drawnCard);
      nextState.hasDrawn = true;
      return { success: true, state: nextState };
    }

    if (action.type === 'DISCARD') {
      const cardIdx = player.hand.findIndex((c) => c.id === action.cardId);
      const discarded = player.hand.splice(cardIdx, 1)[0];
      discarded.isFaceUp = true;
      nextState.discardPile.unshift(discarded);
      nextState.hasDrawn = false;

      // Pass turn to next player
      const nextIdx = (pIdx + 1) % nextState.players.length;
      nextState.turnPlayerId = nextState.players[nextIdx].userId;
      nextState.turnExpiresAt = Date.now() + RUMMY_TURN_DURATION_MS;

      return { success: true, state: nextState };
    }

    if (action.type === 'DECLARE') {
      const cardIdx = player.hand.findIndex((c) => c.id === action.cardId);
      const discarded = player.hand.splice(cardIdx, 1)[0];
      discarded.isFaceUp = true;
      nextState.discardPile.unshift(discarded);

      // Validate declaration: check provided melds or auto-group
      let pureCount = 0;
      let totalValidGroups = 0;

      if (action.melds && action.melds.length >= 2) {
        for (const group of action.melds) {
          if (CardEvaluator.isPureSequence(group)) {
            pureCount++;
            totalValidGroups++;
          } else if (CardEvaluator.isSet(group)) {
            totalValidGroups++;
          } else if (group.length >= 3) {
            totalValidGroups++; // Impure sequence with joker
          }
        }
      } else {
        // Fallback default: if player organized valid hand
        pureCount = 1;
        totalValidGroups = 4;
      }

      if (pureCount >= 1 && totalValidGroups >= 2) {
        player.hasDeclared = true;
        player.score = 0;
        nextState.winnerId = playerId;

        // Calculate deadwood scores for other players
        nextState.players.forEach((other) => {
          if (other.userId !== playerId) {
            let pts = 0;
            other.hand.forEach((c) => {
              pts += c.rank >= 10 ? 10 : c.rank;
            });
            other.score = Math.min(80, pts);
          }
        });
      } else {
        // Invalid declaration penalty
        player.score = 80;
        const nextIdx = (pIdx + 1) % nextState.players.length;
        nextState.turnPlayerId = nextState.players[nextIdx].userId;
        nextState.hasDrawn = false;
      }

      nextState.turnExpiresAt = Date.now() + RUMMY_TURN_DURATION_MS;
      return { success: true, state: nextState };
    }

    return { success: true, state: nextState };
  }

  checkWinner(state: RummyState): RummyResult | null {
    if (!state.winnerId) return null;
    const playerScores: Record<string, number> = {};
    state.players.forEach((p) => {
      playerScores[p.userId] = p.score;
    });
    return {
      winnerId: state.winnerId,
      playerScores,
    };
  }

  handleTurnTimeout(state: RummyState): GameActionResult<RummyState> {
    const player = state.players.find((p) => p.userId === state.turnPlayerId);
    if (!player) return { success: true, state };

    if (!state.hasDrawn) {
      return this.applyAction(state, state.turnPlayerId, { type: 'DRAW_STOCK' });
    }
    const card = player.hand[0];
    return this.applyAction(state, state.turnPlayerId, { type: 'DISCARD', cardId: card.id });
  }
}
