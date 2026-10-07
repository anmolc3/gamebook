import { GameEngine, GamePlayerMeta } from '../game.definition';
import { GameRegistry } from '../game.registry';
import {
  CrazyEightsAction,
  CrazyEightsResult,
  CrazyEightsState,
  GameActionResult,
  GameDefinition,
  PlayingCard,
  StandardSuit,
} from '../../../../shared/game-types';
import { CardDeck } from './core/deck';

export const CRAZY_EIGHTS_TURN_DURATION_MS = 15000;

export class CrazyEightsEngine
  implements GameEngine<CrazyEightsState, CrazyEightsAction, CrazyEightsResult>
{
  readonly definition: GameDefinition;

  constructor() {
    this.definition = GameRegistry.getGame('CRAZY_EIGHTS') || {
      id: 'CRAZY_EIGHTS',
      name: 'Crazy Eights',
      category: 'CARD',
      minPlayers: 2,
      maxPlayers: 4,
      defaultPlayers: 4,
      supportsSpectators: true,
      turnTimeSeconds: 15,
      description: 'Shed cards on matching suits with wild eights.',
      iconName: 'gamepad',
    };
  }

  initialize(players: GamePlayerMeta[], settings?: any): CrazyEightsState {
    if (!players || players.length < 2) {
      throw new Error('Crazy Eights requires at least 2 players');
    }

    const playerIds = players.map((p) => p.userId);
    const shuffled = CardDeck.shuffle(CardDeck.createStandard52());
    const countPerPlayer = players.length === 2 ? 7 : 5;
    const { hands, remainingDeck } = CardDeck.deal(shuffled, playerIds, countPerPlayer);

    // Initial discard card (cannot be an 8 for standard starter)
    let nonEightIdx = remainingDeck.findIndex((c) => c.rank !== 8);
    if (nonEightIdx === -1) nonEightIdx = 0;
    const topCard = remainingDeck.splice(nonEightIdx, 1)[0];
    topCard.isFaceUp = true;

    const firstPlayerId = settings?.firstPlayerId || playerIds[0];

    return {
      hands,
      stockCount: remainingDeck.length,
      topCard,
      currentSuit: topCard.suit as StandardSuit,
      currentRank: topCard.rank,
      turnPlayerId: firstPlayerId,
      drawCount: 0,
      winnerId: null,
      turnExpiresAt: Date.now() + CRAZY_EIGHTS_TURN_DURATION_MS,
    };
  }

  validateAction(state: CrazyEightsState, playerId: string, action: CrazyEightsAction): boolean {
    if (state.winnerId) {
      throw new Error('Game already finished');
    }

    if (state.turnPlayerId !== playerId) {
      throw new Error(`Not your turn. Turn belongs to ${state.turnPlayerId}`);
    }

    if (action.type === 'DRAW_CARD') {
      return true;
    }

    if (action.type === 'PLAY_CARD') {
      if (!action.cardId) {
        throw new Error('Must provide cardId');
      }
      const hand = state.hands[playerId] || [];
      const card = hand.find((c) => c.id === action.cardId);
      if (!card) {
        throw new Error('Card not found in hand');
      }

      if (card.rank === 8) {
        if (!action.declaredSuit) {
          throw new Error('Playing an 8 requires specifying declaredSuit');
        }
        return true;
      }

      const matchesSuit = card.suit === state.currentSuit;
      const matchesRank = card.rank === state.currentRank;

      if (!matchesSuit && !matchesRank) {
        throw new Error(
          `Card ${card.label} does not match current suit (${state.currentSuit}) or rank (${state.currentRank})`
        );
      }
      return true;
    }

    throw new Error(`Unsupported action type: ${action.type}`);
  }

  applyAction(
    state: CrazyEightsState,
    playerId: string,
    action: CrazyEightsAction
  ): GameActionResult<CrazyEightsState> {
    try {
      this.validateAction(state, playerId, action);
    } catch (err: any) {
      return { success: false, state, error: err.message };
    }

    const nextState: CrazyEightsState = {
      ...state,
      hands: { ...state.hands },
    };

    const playerIds = Object.keys(nextState.hands);
    const currIdx = playerIds.indexOf(playerId);
    const nextPlayerId = playerIds[(currIdx + 1) % playerIds.length];

    if (action.type === 'DRAW_CARD') {
      const hand = [...nextState.hands[playerId]];
      if (nextState.stockCount > 0) {
        nextState.stockCount -= 1;
        const suits = ['HEARTS', 'DIAMONDS', 'CLUBS', 'SPADES'] as const;
        const rank = Math.floor(Math.random() * 13) + 2;
        const suit = suits[Math.floor(Math.random() * suits.length)];
        hand.push({
          id: `draw-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          suit,
          rank,
          label: `${rank}${suit[0]}`,
          isFaceUp: true,
        });
      }
      nextState.hands[playerId] = hand;
      nextState.drawCount += 1;

      // After 3 draws or empty stock, pass turn
      if (nextState.drawCount >= 3 || nextState.stockCount === 0) {
        nextState.drawCount = 0;
        nextState.turnPlayerId = nextPlayerId;
      }

      nextState.turnExpiresAt = Date.now() + CRAZY_EIGHTS_TURN_DURATION_MS;
      return { success: true, state: nextState };
    }

    if (action.type === 'PLAY_CARD') {
      const hand = nextState.hands[playerId].filter((c) => c.id !== action.cardId);
      const playedCard = nextState.hands[playerId].find((c) => c.id === action.cardId)!;
      playedCard.isFaceUp = true;

      nextState.hands[playerId] = hand;
      nextState.topCard = playedCard;
      nextState.drawCount = 0;

      if (playedCard.rank === 8) {
        nextState.currentSuit = action.declaredSuit!;
        nextState.currentRank = 8;
      } else {
        nextState.currentSuit = playedCard.suit as StandardSuit;
        nextState.currentRank = playedCard.rank;
      }

      // Check win
      if (hand.length === 0) {
        nextState.winnerId = playerId;
        return { success: true, state: nextState };
      }

      nextState.turnPlayerId = nextPlayerId;
      nextState.turnExpiresAt = Date.now() + CRAZY_EIGHTS_TURN_DURATION_MS;

      return { success: true, state: nextState };
    }

    return { success: true, state: nextState };
  }

  checkWinner(state: CrazyEightsState): CrazyEightsResult | null {
    if (!state.winnerId) return null;
    return { winnerId: state.winnerId };
  }

  handleTurnTimeout(state: CrazyEightsState): GameActionResult<CrazyEightsState> {
    const hand = state.hands[state.turnPlayerId] || [];
    const validCard = hand.find(
      (c) => c.rank === 8 || c.suit === state.currentSuit || c.rank === state.currentRank
    );
    if (validCard) {
      return this.applyAction(state, state.turnPlayerId, {
        type: 'PLAY_CARD',
        cardId: validCard.id,
        declaredSuit: validCard.rank === 8 ? 'HEARTS' : undefined,
      });
    }
    return this.applyAction(state, state.turnPlayerId, { type: 'DRAW_CARD' });
  }
}
