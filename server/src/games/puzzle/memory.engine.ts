import { GameEngine, GamePlayerMeta } from '../game.definition';
import { GameRegistry } from '../game.registry';
import {
  GameActionResult,
  GameDefinition,
  MemoryCard,
  MemoryMatchAction,
  MemoryMatchResult,
  MemoryMatchState,
} from '../../../../shared/game-types';

export const MEMORY_TURN_DURATION_MS = 15000;

export class MemoryMatchEngine
  implements GameEngine<MemoryMatchState, MemoryMatchAction, MemoryMatchResult>
{
  readonly definition: GameDefinition;

  private static ICONS = [
    'star', 'heart', 'diamond', 'trophy',
    'shield', 'crown', 'bell', 'flame',
  ];

  constructor() {
    this.definition = GameRegistry.getGame('MEMORY_MATCH') || {
      id: 'MEMORY_MATCH',
      name: 'Memory Card Match',
      category: 'CASUAL',
      minPlayers: 2,
      maxPlayers: 4,
      defaultPlayers: 2,
      supportsSpectators: true,
      turnTimeSeconds: 15,
      description: 'Flip pairs of matching hidden cards to score points.',
      iconName: 'eye',
    };
  }

  initialize(players: GamePlayerMeta[]): MemoryMatchState {
    if (!players || players.length < 2) {
      throw new Error('Memory Match requires at least 2 players');
    }

    const playerIds = players.map((p) => p.userId);
    const scores: Record<string, number> = {};
    playerIds.forEach((uid) => {
      scores[uid] = 0;
    });

    // Create 16 cards (8 pairs)
    const cardPairs: { iconName: string }[] = [];
    MemoryMatchEngine.ICONS.forEach((icon) => {
      cardPairs.push({ iconName: icon });
      cardPairs.push({ iconName: icon });
    });

    // Shuffle cards
    const shuffled = cardPairs.sort(() => Math.random() - 0.5);
    const cards: MemoryCard[] = shuffled.map((item, idx) => ({
      id: idx,
      iconName: item.iconName,
      isFlipped: false,
      isMatched: false,
    }));

    return {
      cards,
      players: playerIds,
      turnPlayerId: playerIds[0],
      flippedCardIds: [],
      scores,
      winnerId: null,
      turnExpiresAt: Date.now() + MEMORY_TURN_DURATION_MS,
    };
  }

  validateAction(state: MemoryMatchState, playerId: string, action: MemoryMatchAction): boolean {
    if (state.winnerId) {
      throw new Error('Match already completed');
    }

    if (state.turnPlayerId !== playerId) {
      throw new Error(`Not your turn. Turn belongs to ${state.turnPlayerId}`);
    }

    if (action.type !== 'FLIP_CARD') {
      throw new Error(`Unsupported action type: ${action.type}`);
    }

    const card = state.cards.find((c) => c.id === action.cardId);
    if (!card) {
      throw new Error('Invalid card ID');
    }

    if (card.isMatched) {
      throw new Error('Card is already matched');
    }

    if (state.flippedCardIds.includes(action.cardId)) {
      throw new Error('Card is already flipped this turn');
    }

    return true;
  }

  applyAction(state: MemoryMatchState, playerId: string, action: MemoryMatchAction): GameActionResult<MemoryMatchState> {
    try {
      this.validateAction(state, playerId, action);
    } catch (err: any) {
      return { success: false, state, error: err.message };
    }

    const nextState: MemoryMatchState = {
      ...state,
      cards: state.cards.map((c) => ({ ...c })),
      flippedCardIds: [...state.flippedCardIds, action.cardId],
      scores: { ...state.scores },
    };

    const card = nextState.cards.find((c) => c.id === action.cardId)!;
    card.isFlipped = true;

    // If 2 cards are flipped, check for match
    if (nextState.flippedCardIds.length === 2) {
      const id1 = nextState.flippedCardIds[0];
      const id2 = nextState.flippedCardIds[1];
      const c1 = nextState.cards.find((c) => c.id === id1)!;
      const c2 = nextState.cards.find((c) => c.id === id2)!;

      if (c1.iconName === c2.iconName) {
        // MATCH!
        c1.isMatched = true;
        c2.isMatched = true;
        c1.matchedBy = playerId;
        c2.matchedBy = playerId;
        nextState.scores[playerId] = (nextState.scores[playerId] || 0) + 1;
        nextState.flippedCardIds = []; // Clear for next pair (same player continues)
      } else {
        // No match: turn passes to next player
        c1.isFlipped = false;
        c2.isFlipped = false;
        nextState.flippedCardIds = [];

        const currIdx = nextState.players.indexOf(playerId);
        nextState.turnPlayerId = nextState.players[(currIdx + 1) % nextState.players.length];
      }

      // Check if all 16 cards are matched
      const allMatched = nextState.cards.every((c) => c.isMatched);
      if (allMatched) {
        let topScore = -1;
        let winner = nextState.players[0];
        nextState.players.forEach((uid) => {
          if (nextState.scores[uid] > topScore) {
            topScore = nextState.scores[uid];
            winner = uid;
          }
        });
        nextState.winnerId = winner;
      }
    }

    nextState.turnExpiresAt = Date.now() + MEMORY_TURN_DURATION_MS;
    return { success: true, state: nextState };
  }

  checkWinner(state: MemoryMatchState): MemoryMatchResult | null {
    if (!state.winnerId) return null;
    return {
      winnerId: state.winnerId,
      scores: state.scores,
    };
  }

  handleTurnTimeout(state: MemoryMatchState): GameActionResult<MemoryMatchState> {
    const unflip = state.cards.find((c) => !c.isMatched && !state.flippedCardIds.includes(c.id));
    if (!unflip) return { success: true, state };
    return this.applyAction(state, state.turnPlayerId, { type: 'FLIP_CARD', cardId: unflip.id });
  }
}
