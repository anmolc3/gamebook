import { GameEngine, GamePlayerMeta } from '../game.definition';
import { GameRegistry } from '../game.registry';
import {
  GameActionResult,
  GameDefinition,
  GinRummyAction,
  GinRummyResult,
  GinRummyState,
  PlayingCard,
} from '../../../../shared/game-types';
import { CardDeck } from './core/deck';

export const GIN_RUMMY_TURN_DURATION_MS = 20000;

export class GinRummyEngine implements GameEngine<GinRummyState, GinRummyAction, GinRummyResult> {
  readonly definition: GameDefinition;

  constructor() {
    this.definition = GameRegistry.getGame('GIN_RUMMY') || {
      id: 'GIN_RUMMY',
      name: 'Gin Rummy',
      category: 'CARD',
      minPlayers: 2,
      maxPlayers: 2,
      defaultPlayers: 2,
      supportsSpectators: true,
      turnTimeSeconds: 20,
      description: '2-player rummy variant matching deadwood reduction.',
      iconName: 'gamepad',
    };
  }

  initialize(players: GamePlayerMeta[], settings?: any): GinRummyState {
    if (!players || players.length < 2) {
      throw new Error('Gin Rummy requires 2 players');
    }

    const playerIds = [players[0].userId, players[1].userId];
    const shuffled = CardDeck.shuffle(CardDeck.createStandard52());
    const { hands, remainingDeck } = CardDeck.deal(shuffled, playerIds, 10);

    const upCard = remainingDeck.pop() || {
      id: 'up-0',
      suit: 'HEARTS',
      rank: 4,
      label: '4♥',
      isFaceUp: true,
    };
    upCard.isFaceUp = true;

    const firstPlayerId = settings?.firstPlayerId || playerIds[0];

    return {
      hands,
      stockCount: remainingDeck.length,
      discardPile: [upCard],
      turnPlayerId: firstPlayerId,
      hasDrawn: false,
      winnerId: null,
      knockedBy: null,
      isGin: false,
      turnExpiresAt: Date.now() + GIN_RUMMY_TURN_DURATION_MS,
    };
  }

  validateAction(state: GinRummyState, playerId: string, action: GinRummyAction): boolean {
    if (state.winnerId) {
      throw new Error('Game already finished');
    }

    if (state.turnPlayerId !== playerId) {
      throw new Error(`Not your turn. Turn belongs to ${state.turnPlayerId}`);
    }

    const hand = state.hands[playerId] || [];

    if (action.type === 'DRAW_STOCK' || action.type === 'DRAW_DISCARD') {
      if (state.hasDrawn) {
        throw new Error('Already drawn this turn; must DISCARD or KNOCK');
      }
      if (action.type === 'DRAW_DISCARD' && state.discardPile.length === 0) {
        throw new Error('Discard pile is empty');
      }
      return true;
    }

    if (action.type === 'DISCARD' || action.type === 'KNOCK') {
      if (!state.hasDrawn) {
        throw new Error('Must draw a card before discarding or knocking');
      }
      if (!action.cardId) {
        throw new Error('Must specify cardId');
      }
      const hasCard = hand.some((c) => c.id === action.cardId);
      if (!hasCard) {
        throw new Error('Card not found in hand');
      }
      return true;
    }

    throw new Error(`Unsupported action: ${action.type}`);
  }

  private calculateDeadwood(hand: PlayingCard[]): number {
    // Quick deadwood approximation: cards without pairs or sequence neighbors
    let deadwood = 0;
    const rankCounts: Record<number, number> = {};
    hand.forEach((c) => {
      rankCounts[c.rank] = (rankCounts[c.rank] || 0) + 1;
    });

    hand.forEach((c) => {
      const val = c.rank === 14 ? 1 : c.rank >= 10 ? 10 : c.rank;
      // If part of 3+ matching ranks, no deadwood
      if (rankCounts[c.rank] >= 3) {
        return;
      }
      deadwood += val;
    });

    return deadwood;
  }

  applyAction(state: GinRummyState, playerId: string, action: GinRummyAction): GameActionResult<GinRummyState> {
    try {
      this.validateAction(state, playerId, action);
    } catch (err: any) {
      return { success: false, state, error: err.message };
    }

    const nextState: GinRummyState = {
      ...state,
      hands: {
        [Object.keys(state.hands)[0]]: [...state.hands[Object.keys(state.hands)[0]]],
        [Object.keys(state.hands)[1]]: [...state.hands[Object.keys(state.hands)[1]]],
      },
      discardPile: [...state.discardPile],
    };

    const playerIds = Object.keys(nextState.hands);
    const opponentId = playerIds.find((id) => id !== playerId)!;

    if (action.type === 'DRAW_STOCK') {
      nextState.stockCount = Math.max(0, nextState.stockCount - 1);
      const suits = ['HEARTS', 'DIAMONDS', 'CLUBS', 'SPADES'] as const;
      const rank = Math.floor(Math.random() * 13) + 2;
      const suit = suits[Math.floor(Math.random() * suits.length)];
      nextState.hands[playerId].push({
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
      const drawn = nextState.discardPile.shift()!;
      drawn.isFaceUp = true;
      nextState.hands[playerId].push(drawn);
      nextState.hasDrawn = true;
      return { success: true, state: nextState };
    }

    if (action.type === 'DISCARD') {
      const hand = nextState.hands[playerId];
      const cardIdx = hand.findIndex((c) => c.id === action.cardId);
      const discarded = hand.splice(cardIdx, 1)[0];
      discarded.isFaceUp = true;
      nextState.discardPile.unshift(discarded);
      nextState.hasDrawn = false;
      nextState.turnPlayerId = opponentId;
      nextState.turnExpiresAt = Date.now() + GIN_RUMMY_TURN_DURATION_MS;
      return { success: true, state: nextState };
    }

    if (action.type === 'KNOCK') {
      const hand = nextState.hands[playerId];
      const cardIdx = hand.findIndex((c) => c.id === action.cardId);
      const discarded = hand.splice(cardIdx, 1)[0];
      discarded.isFaceUp = true;
      nextState.discardPile.unshift(discarded);

      const knockerDeadwood = this.calculateDeadwood(hand);
      const opponentDeadwood = this.calculateDeadwood(nextState.hands[opponentId]);

      nextState.knockedBy = playerId;
      nextState.isGin = knockerDeadwood === 0;

      if (knockerDeadwood === 0) {
        // Pure Gin
        nextState.winnerId = playerId;
      } else if (opponentDeadwood <= knockerDeadwood) {
        // Undercut! Opponent wins
        nextState.winnerId = opponentId;
      } else {
        // Knocker wins
        nextState.winnerId = playerId;
      }

      return { success: true, state: nextState };
    }

    return { success: true, state: nextState };
  }

  checkWinner(state: GinRummyState): GinRummyResult | null {
    if (!state.winnerId) return null;
    const playerIds = Object.keys(state.hands);
    const deadwoodScores: Record<string, number> = {};
    playerIds.forEach((uid) => {
      deadwoodScores[uid] = this.calculateDeadwood(state.hands[uid]);
    });

    const isUndercut = state.knockedBy !== null && state.winnerId !== state.knockedBy;

    return {
      winnerId: state.winnerId,
      deadwoodScores,
      isGin: state.isGin,
      isUndercut,
    };
  }

  handleTurnTimeout(state: GinRummyState): GameActionResult<GinRummyState> {
    if (!state.hasDrawn) {
      return this.applyAction(state, state.turnPlayerId, { type: 'DRAW_STOCK' });
    }
    const card = state.hands[state.turnPlayerId][0];
    return this.applyAction(state, state.turnPlayerId, { type: 'DISCARD', cardId: card.id });
  }
}
