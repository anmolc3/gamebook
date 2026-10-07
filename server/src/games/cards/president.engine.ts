import { GameEngine, GamePlayerMeta } from '../game.definition';
import { GameRegistry } from '../game.registry';
import {
  GameActionResult,
  GameDefinition,
  PlayingCard,
  PresidentAction,
  PresidentResult,
  PresidentState,
} from '../../../../shared/game-types';
import { CardDeck } from './core/deck';

export const PRESIDENT_TURN_DURATION_MS = 15000;

export class PresidentEngine
  implements GameEngine<PresidentState, PresidentAction, PresidentResult>
{
  readonly definition: GameDefinition;

  constructor() {
    this.definition = GameRegistry.getGame('PRESIDENT') || {
      id: 'PRESIDENT',
      name: 'President / Scum',
      category: 'CARD',
      minPlayers: 3,
      maxPlayers: 6,
      defaultPlayers: 4,
      supportsSpectators: true,
      turnTimeSeconds: 15,
      description: 'Card shedding game climbing the hierarchy ladder.',
      iconName: 'trophy',
    };
  }

  initialize(players: GamePlayerMeta[], settings?: any): PresidentState {
    if (!players || players.length < 3) {
      throw new Error('President requires at least 3 players');
    }

    const playerIds = players.map((p) => p.userId);
    const shuffled = CardDeck.shuffle(CardDeck.createStandard52());
    const countPerPlayer = Math.floor(52 / playerIds.length);
    const { hands } = CardDeck.deal(shuffled, playerIds, countPerPlayer);

    const firstPlayerId = settings?.firstPlayerId || playerIds[0];

    return {
      hands,
      currentTrick: [],
      lastPlayUserId: null,
      passedPlayers: [],
      activeCardRank: null,
      activeCardCount: 0,
      turnPlayerId: firstPlayerId,
      finishOrder: [],
      winnerId: null,
      turnExpiresAt: Date.now() + PRESIDENT_TURN_DURATION_MS,
    };
  }

  // Adjusted rank: 3 is 3... 14 (Ace) is 14, 2 is highest (15)
  private getEffectiveRank(rank: number): number {
    return rank === 2 ? 15 : rank;
  }

  validateAction(state: PresidentState, playerId: string, action: PresidentAction): boolean {
    if (state.winnerId) {
      throw new Error('Game already finished');
    }

    if (state.turnPlayerId !== playerId) {
      throw new Error(`Not your turn. Turn belongs to ${state.turnPlayerId}`);
    }

    if (action.type === 'PASS') {
      if (state.currentTrick.length === 0) {
        throw new Error('Cannot pass when leading a new trick');
      }
      return true;
    }

    if (action.type === 'PLAY_CARDS') {
      if (!action.cardIds || action.cardIds.length === 0) {
        throw new Error('Must provide at least one card to play');
      }

      const hand = state.hands[playerId] || [];
      const playedCards = action.cardIds.map((id) => hand.find((c) => c.id === id));
      if (playedCards.some((c) => !c)) {
        throw new Error('All played cards must exist in your hand');
      }

      // Must all have matching ranks (e.g. single, pair, triple)
      const firstRank = playedCards[0]!.rank;
      if (!playedCards.every((c) => c!.rank === firstRank)) {
        throw new Error('All played cards in a combination must have the same rank');
      }

      // If trick is active, must match card count
      if (state.activeCardCount > 0 && playedCards.length !== state.activeCardCount) {
        throw new Error(`Must play exactly ${state.activeCardCount} card(s) to match trick`);
      }

      // Must beat previous rank unless trick is fresh
      if (state.activeCardRank !== null) {
        const effPlayed = this.getEffectiveRank(firstRank);
        const effActive = this.getEffectiveRank(state.activeCardRank);
        if (effPlayed <= effActive) {
          throw new Error(`Played rank must be strictly higher than current trick rank`);
        }
      }

      return true;
    }

    throw new Error(`Unsupported action: ${action.type}`);
  }

  private getNextActivePlayer(state: PresidentState, currentId: string): string {
    const allPlayers = Object.keys(state.hands);
    const active = allPlayers.filter(
      (uid) => !state.finishOrder.includes(uid) && !state.passedPlayers.includes(uid)
    );

    if (active.length === 0) {
      // Trick is dead, clear and reset
      state.currentTrick = [];
      state.activeCardRank = null;
      state.activeCardCount = 0;
      state.passedPlayers = [];

      const remaining = allPlayers.filter((uid) => !state.finishOrder.includes(uid));
      return state.lastPlayUserId && !state.finishOrder.includes(state.lastPlayUserId)
        ? state.lastPlayUserId
        : remaining[0];
    }

    const currentIdx = allPlayers.indexOf(currentId);
    for (let i = 1; i <= allPlayers.length; i++) {
      const candidate = allPlayers[(currentIdx + i) % allPlayers.length];
      if (active.includes(candidate)) {
        return candidate;
      }
    }
    return active[0];
  }

  applyAction(state: PresidentState, playerId: string, action: PresidentAction): GameActionResult<PresidentState> {
    try {
      this.validateAction(state, playerId, action);
    } catch (err: any) {
      return { success: false, state, error: err.message };
    }

    const nextState: PresidentState = {
      ...state,
      hands: { ...state.hands },
      currentTrick: [...state.currentTrick],
      passedPlayers: [...state.passedPlayers],
      finishOrder: [...state.finishOrder],
    };

    if (action.type === 'PASS') {
      if (!nextState.passedPlayers.includes(playerId)) {
        nextState.passedPlayers.push(playerId);
      }
      nextState.turnPlayerId = this.getNextActivePlayer(nextState, playerId);
      nextState.turnExpiresAt = Date.now() + PRESIDENT_TURN_DURATION_MS;
      return { success: true, state: nextState };
    }

    if (action.type === 'PLAY_CARDS') {
      const hand = [...nextState.hands[playerId]];
      const played: PlayingCard[] = [];
      action.cardIds!.forEach((cid) => {
        const idx = hand.findIndex((c) => c.id === cid);
        const card = hand.splice(idx, 1)[0];
        card.isFaceUp = true;
        played.push(card);
      });
      nextState.hands[playerId] = hand;
      nextState.lastPlayUserId = playerId;

      const playedRank = played[0].rank;

      // Check if 2 was played: clears trick immediately!
      if (playedRank === 2) {
        nextState.currentTrick = [];
        nextState.activeCardRank = null;
        nextState.activeCardCount = 0;
        nextState.passedPlayers = [];
      } else {
        nextState.currentTrick.push(...played);
        nextState.activeCardRank = playedRank;
        nextState.activeCardCount = played.length;
      }

      // Check if player emptied their hand
      if (hand.length === 0 && !nextState.finishOrder.includes(playerId)) {
        nextState.finishOrder.push(playerId);
        if (!nextState.winnerId) {
          nextState.winnerId = playerId;
        }
      }

      const allPlayers = Object.keys(nextState.hands);
      const remaining = allPlayers.filter((uid) => !nextState.finishOrder.includes(uid));

      if (remaining.length <= 1) {
        // Last player is scum
        if (remaining.length === 1 && !nextState.finishOrder.includes(remaining[0])) {
          nextState.finishOrder.push(remaining[0]);
        }
        return { success: true, state: nextState };
      }

      nextState.turnPlayerId = this.getNextActivePlayer(nextState, playerId);
      nextState.turnExpiresAt = Date.now() + PRESIDENT_TURN_DURATION_MS;

      return { success: true, state: nextState };
    }

    return { success: true, state: nextState };
  }

  checkWinner(state: PresidentState): PresidentResult | null {
    if (!state.winnerId) return null;
    const n = state.finishOrder.length;
    const ranks = state.finishOrder.map((uid, idx) => {
      let role: 'PRESIDENT' | 'VICE_PRESIDENT' | 'NEUTRAL' | 'SCUM' = 'NEUTRAL';
      if (idx === 0) role = 'PRESIDENT';
      else if (idx === 1) role = 'VICE_PRESIDENT';
      else if (idx === n - 1) role = 'SCUM';
      return { userId: uid, role };
    });

    return {
      winnerId: state.winnerId,
      ranks,
    };
  }

  handleTurnTimeout(state: PresidentState): GameActionResult<PresidentState> {
    if (state.currentTrick.length > 0) {
      return this.applyAction(state, state.turnPlayerId, { type: 'PASS' });
    }
    const hand = state.hands[state.turnPlayerId] || [];
    if (hand.length === 0) return { success: true, state };
    return this.applyAction(state, state.turnPlayerId, {
      type: 'PLAY_CARDS',
      cardIds: [hand[0].id],
    });
  }
}
