import { GameEngine, GamePlayerMeta } from '../game.definition';
import { GameRegistry } from '../game.registry';
import {
  GameActionResult,
  GameDefinition,
  PlayingCard,
  WarAction,
  WarResult,
  WarState,
} from '../../../../shared/game-types';
import { CardDeck } from './core/deck';

export const WAR_TURN_DURATION_MS = 10000;

export class WarEngine implements GameEngine<WarState, WarAction, WarResult> {
  readonly definition: GameDefinition;

  constructor() {
    this.definition = GameRegistry.getGame('WAR') || {
      id: 'WAR',
      name: 'War Card Duel',
      category: 'CARD',
      minPlayers: 2,
      maxPlayers: 2,
      defaultPlayers: 2,
      supportsSpectators: true,
      turnTimeSeconds: 10,
      description: 'High card captures cards in classic battle showdowns.',
      iconName: 'gamepad',
    };
  }

  initialize(players: GamePlayerMeta[], settings?: any): WarState {
    if (!players || players.length < 2) {
      throw new Error('War requires 2 players');
    }

    const playerIds = [players[0].userId, players[1].userId];
    const shuffled = CardDeck.shuffle(CardDeck.createStandard52());
    const { hands } = CardDeck.deal(shuffled, playerIds, 26);

    const wonPiles: Record<string, PlayingCard[]> = {};
    const currentBattle: Record<string, PlayingCard | null> = {};

    playerIds.forEach((id) => {
      wonPiles[id] = [];
      currentBattle[id] = null;
    });

    return {
      decks: hands,
      wonPiles,
      currentBattle,
      warWarChest: [],
      isWar: false,
      turnPlayerId: playerIds[0],
      winnerId: null,
      turnExpiresAt: Date.now() + WAR_TURN_DURATION_MS,
    };
  }

  validateAction(state: WarState, playerId: string, action: WarAction): boolean {
    if (state.winnerId) {
      throw new Error('Game already finished');
    }

    if (action.type !== 'FLIP_CARD') {
      throw new Error(`Unsupported action type: ${action.type}`);
    }

    return true;
  }

  private recycleDeck(state: WarState, uid: string): void {
    if (state.decks[uid].length === 0 && state.wonPiles[uid].length > 0) {
      state.decks[uid] = CardDeck.shuffle(state.wonPiles[uid]);
      state.wonPiles[uid] = [];
    }
  }

  applyAction(state: WarState, playerId: string, action: WarAction): GameActionResult<WarState> {
    try {
      this.validateAction(state, playerId, action);
    } catch (err: any) {
      return { success: false, state, error: err.message };
    }

    const nextState: WarState = {
      ...state,
      decks: {
        [Object.keys(state.decks)[0]]: [...state.decks[Object.keys(state.decks)[0]]],
        [Object.keys(state.decks)[1]]: [...state.decks[Object.keys(state.decks)[1]]],
      },
      wonPiles: {
        [Object.keys(state.wonPiles)[0]]: [...state.wonPiles[Object.keys(state.wonPiles)[0]]],
        [Object.keys(state.wonPiles)[1]]: [...state.wonPiles[Object.keys(state.wonPiles)[1]]],
      },
      currentBattle: { ...state.currentBattle },
      warWarChest: [...state.warWarChest],
    };

    const playerIds = Object.keys(nextState.decks);
    const p1 = playerIds[0];
    const p2 = playerIds[1];

    this.recycleDeck(nextState, p1);
    this.recycleDeck(nextState, p2);

    if (nextState.decks[p1].length === 0) {
      nextState.winnerId = p2;
      return { success: true, state: nextState };
    }
    if (nextState.decks[p2].length === 0) {
      nextState.winnerId = p1;
      return { success: true, state: nextState };
    }

    // Both players flip top card
    const c1 = nextState.decks[p1].pop()!;
    const c2 = nextState.decks[p2].pop()!;
    c1.isFaceUp = true;
    c2.isFaceUp = true;

    nextState.currentBattle[p1] = c1;
    nextState.currentBattle[p2] = c2;
    nextState.warWarChest.push(c1, c2);

    if (c1.rank > c2.rank) {
      // P1 wins battle
      nextState.wonPiles[p1].push(...nextState.warWarChest);
      nextState.warWarChest = [];
      nextState.isWar = false;
    } else if (c2.rank > c1.rank) {
      // P2 wins battle
      nextState.wonPiles[p2].push(...nextState.warWarChest);
      nextState.warWarChest = [];
      nextState.isWar = false;
    } else {
      // Tie -> WAR!
      nextState.isWar = true;
      // Add up to 3 face down cards each if available
      for (let i = 0; i < 3; i++) {
        this.recycleDeck(nextState, p1);
        this.recycleDeck(nextState, p2);
        if (nextState.decks[p1].length > 1) {
          nextState.warWarChest.push(nextState.decks[p1].pop()!);
        }
        if (nextState.decks[p2].length > 1) {
          nextState.warWarChest.push(nextState.decks[p2].pop()!);
        }
      }
    }

    // Check winner
    const total1 = nextState.decks[p1].length + nextState.wonPiles[p1].length;
    const total2 = nextState.decks[p2].length + nextState.wonPiles[p2].length;

    if (total1 === 0) {
      nextState.winnerId = p2;
    } else if (total2 === 0) {
      nextState.winnerId = p1;
    }

    nextState.turnPlayerId = playerId === p1 ? p2 : p1;
    nextState.turnExpiresAt = Date.now() + WAR_TURN_DURATION_MS;

    return { success: true, state: nextState };
  }

  checkWinner(state: WarState): WarResult | null {
    if (!state.winnerId) return null;
    const playerIds = Object.keys(state.decks);
    const finalCardCounts: Record<string, number> = {};
    playerIds.forEach((uid) => {
      finalCardCounts[uid] = state.decks[uid].length + state.wonPiles[uid].length;
    });

    return {
      winnerId: state.winnerId,
      finalCardCounts,
    };
  }

  handleTurnTimeout(state: WarState): GameActionResult<WarState> {
    return this.applyAction(state, state.turnPlayerId, { type: 'FLIP_CARD' });
  }
}
