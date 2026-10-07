import { GameEngine, GamePlayerMeta } from '../game.definition';
import { GameRegistry } from '../game.registry';
import {
  GameActionResult,
  GameDefinition,
  GoFishAction,
  GoFishResult,
  GoFishState,
  PlayingCard,
} from '../../../../shared/game-types';
import { CardDeck } from './core/deck';

export const GO_FISH_TURN_DURATION_MS = 20000;

export class GoFishEngine implements GameEngine<GoFishState, GoFishAction, GoFishResult> {
  readonly definition: GameDefinition;

  constructor() {
    this.definition = GameRegistry.getGame('GO_FISH') || {
      id: 'GO_FISH',
      name: 'Go Fish',
      category: 'CARD',
      minPlayers: 2,
      maxPlayers: 4,
      defaultPlayers: 4,
      supportsSpectators: true,
      turnTimeSeconds: 15,
      description: 'Ask opponents for matching ranks to complete books of four.',
      iconName: 'gamepad',
    };
  }

  initialize(players: GamePlayerMeta[], settings?: any): GoFishState {
    if (!players || players.length < 2) {
      throw new Error('Go Fish requires at least 2 players');
    }

    const playerIds = players.map((p) => p.userId);
    const shuffled = CardDeck.shuffle(CardDeck.createStandard52());
    const count = players.length === 2 ? 7 : 5;
    const { hands, remainingDeck } = CardDeck.deal(shuffled, playerIds, count);

    const books: Record<string, number[]> = {};
    playerIds.forEach((id) => {
      books[id] = [];
    });

    const firstPlayerId = settings?.firstPlayerId || playerIds[0];

    const state: GoFishState = {
      hands,
      books,
      oceanCount: remainingDeck.length,
      turnPlayerId: firstPlayerId,
      lastAskResult: null,
      winnerId: null,
      turnExpiresAt: Date.now() + GO_FISH_TURN_DURATION_MS,
    };

    // Check initial books if any
    this.checkAndRemoveBooks(state);
    return state;
  }

  private checkAndRemoveBooks(state: GoFishState): void {
    for (const uid of Object.keys(state.hands)) {
      const hand = state.hands[uid];
      const rankCounts: Record<number, number> = {};
      hand.forEach((c) => {
        rankCounts[c.rank] = (rankCounts[c.rank] || 0) + 1;
      });

      for (const [rStr, count] of Object.entries(rankCounts)) {
        const rank = Number(rStr);
        if (count === 4) {
          state.hands[uid] = hand.filter((c) => c.rank !== rank);
          if (!state.books[uid].includes(rank)) {
            state.books[uid].push(rank);
          }
        }
      }
    }
  }

  validateAction(state: GoFishState, playerId: string, action: GoFishAction): boolean {
    if (state.winnerId) {
      throw new Error('Game already finished');
    }

    if (state.turnPlayerId !== playerId) {
      throw new Error(`Not your turn. Turn belongs to ${state.turnPlayerId}`);
    }

    if (action.type !== 'ASK_RANK') {
      throw new Error(`Unsupported action type: ${action.type}`);
    }

    if (!action.targetUserId || action.targetUserId === playerId) {
      throw new Error('Must select a valid opponent to ask');
    }

    const hand = state.hands[playerId] || [];
    if (!hand.some((c) => c.rank === action.rank)) {
      throw new Error('You can only ask for ranks you currently hold in your hand');
    }

    return true;
  }

  applyAction(state: GoFishState, playerId: string, action: GoFishAction): GameActionResult<GoFishState> {
    try {
      this.validateAction(state, playerId, action);
    } catch (err: any) {
      return { success: false, state, error: err.message };
    }

    const nextState: GoFishState = {
      ...state,
      hands: { ...state.hands },
      books: { ...state.books },
    };

    const playerIds = Object.keys(nextState.hands);
    const currIdx = playerIds.indexOf(playerId);
    const nextPlayerId = playerIds[(currIdx + 1) % playerIds.length];

    const targetHand = nextState.hands[action.targetUserId] || [];
    const matching = targetHand.filter((c) => c.rank === action.rank);

    if (matching.length > 0) {
      // Opponent gives cards!
      nextState.hands[action.targetUserId] = targetHand.filter((c) => c.rank !== action.rank);
      nextState.hands[playerId] = [...nextState.hands[playerId], ...matching];
      nextState.lastAskResult = `Caught ${matching.length} card(s) of rank ${action.rank}!`;
      // Asking player keeps turn
      this.checkAndRemoveBooks(nextState);
    } else {
      // "Go Fish!" Draw 1 from ocean
      nextState.lastAskResult = `Go Fish! Target had no ${action.rank}s.`;
      if (nextState.oceanCount > 0) {
        nextState.oceanCount -= 1;
        const suits = ['HEARTS', 'DIAMONDS', 'CLUBS', 'SPADES'] as const;
        const drawnRank = Math.floor(Math.random() * 13) + 2;
        const drawnSuit = suits[Math.floor(Math.random() * suits.length)];
        const drawnCard: PlayingCard = {
          id: `fish-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          suit: drawnSuit,
          rank: drawnRank,
          label: `${drawnRank}${drawnSuit[0]}`,
          isFaceUp: true,
        };
        nextState.hands[playerId] = [...nextState.hands[playerId], drawnCard];

        this.checkAndRemoveBooks(nextState);

        // Lucky fish rule: if drawn card matches asked rank, player goes again
        if (drawnCard.rank === action.rank) {
          nextState.lastAskResult += ` Lucky Fish! Drew a ${action.rank} and goes again!`;
        } else {
          nextState.turnPlayerId = nextPlayerId;
        }
      } else {
        nextState.turnPlayerId = nextPlayerId;
      }
    }

    // Check game over (ocean empty and hands empty, or 13 books completed)
    const totalBooks = Object.values(nextState.books).reduce((sum, b) => sum + b.length, 0);
    const allHandsEmpty = Object.values(nextState.hands).every((h) => h.length === 0);

    if (totalBooks >= 13 || (nextState.oceanCount === 0 && allHandsEmpty)) {
      let maxBooks = -1;
      let winner = playerIds[0];
      playerIds.forEach((uid) => {
        const count = nextState.books[uid].length;
        if (count > maxBooks) {
          maxBooks = count;
          winner = uid;
        }
      });
      nextState.winnerId = winner;
    }

    nextState.turnExpiresAt = Date.now() + GO_FISH_TURN_DURATION_MS;
    return { success: true, state: nextState };
  }

  checkWinner(state: GoFishState): GoFishResult | null {
    if (!state.winnerId) return null;
    const bookCounts: Record<string, number> = {};
    Object.keys(state.books).forEach((uid) => {
      bookCounts[uid] = state.books[uid].length;
    });
    return {
      winnerId: state.winnerId,
      bookCounts,
    };
  }

  handleTurnTimeout(state: GoFishState): GameActionResult<GoFishState> {
    const hand = state.hands[state.turnPlayerId] || [];
    if (hand.length === 0) return { success: true, state };
    const playerIds = Object.keys(state.hands);
    const targetUserId = playerIds.find((id) => id !== state.turnPlayerId) || playerIds[0];
    return this.applyAction(state, state.turnPlayerId, {
      type: 'ASK_RANK',
      targetUserId,
      rank: hand[0].rank,
    });
  }
}
