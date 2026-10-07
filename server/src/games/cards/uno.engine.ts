import { GameEngine, GamePlayerMeta } from '../game.definition';
import { GameRegistry } from '../game.registry';
import {
  GameActionResult,
  GameDefinition,
  PlayingCard,
  UnoAction,
  UnoColor,
  UnoResult,
  UnoState,
} from '../../../../shared/game-types';
import { CardDeck } from './core/deck';

export const UNO_TURN_DURATION_MS = 20000;

export class UnoEngine implements GameEngine<UnoState, UnoAction, UnoResult> {
  readonly definition: GameDefinition;
  private deckMap = new Map<string, PlayingCard[]>(); // room/instance deck store

  constructor() {
    this.definition = GameRegistry.getGame('UNO_STYLE') || {
      id: 'UNO_STYLE',
      name: 'Color Match Clash (UNO-style)',
      category: 'CARD',
      minPlayers: 2,
      maxPlayers: 4,
      defaultPlayers: 4,
      supportsSpectators: true,
      turnTimeSeconds: 15,
      description: 'Discard cards matching color or number with wild cards and skips.',
      iconName: 'palette',
    };
  }

  initialize(players: GamePlayerMeta[], settings?: any): UnoState {
    if (!players || players.length < 2) {
      throw new Error('Uno requires at least 2 players');
    }

    const playerIds = players.map((p) => p.userId);
    const shuffled = CardDeck.shuffle(CardDeck.createUno108());

    // Deal 7 cards per player
    const { hands, remainingDeck } = CardDeck.deal(shuffled, playerIds, 7);

    // Initial discard card (must be a number card 0..9 for standard start)
    let initialTopIndex = remainingDeck.findIndex((c) => c.suit !== 'WILD' && c.rank <= 9);
    if (initialTopIndex === -1) initialTopIndex = 0;
    const topCard = remainingDeck.splice(initialTopIndex, 1)[0];
    topCard.isFaceUp = true;

    const firstPlayerId = settings?.firstPlayerId || playerIds[0];

    return {
      hands,
      drawPileCount: remainingDeck.length,
      discardPile: [topCard],
      currentColor: topCard.suit as UnoColor,
      currentRank: topCard.rank,
      turnPlayerId: firstPlayerId,
      turnDirection: 1,
      drawPenalty: 0,
      calledUno: [],
      winnerId: null,
      turnExpiresAt: Date.now() + UNO_TURN_DURATION_MS,
    };
  }

  validateAction(state: UnoState, playerId: string, action: UnoAction): boolean {
    if (state.winnerId) {
      throw new Error('Game has already finished');
    }

    if (action.type === 'CALL_UNO') {
      const hand = state.hands[playerId];
      if (!hand || hand.length > 2) {
        throw new Error('Can only call UNO when holding 2 or fewer cards');
      }
      return true;
    }

    if (state.turnPlayerId !== playerId) {
      throw new Error(`It is not your turn. Turn belongs to ${state.turnPlayerId}`);
    }

    if (action.type === 'DRAW_CARD') {
      return true;
    }

    if (action.type === 'PLAY_CARD') {
      if (!action.cardId) {
        throw new Error('Must provide cardId to play');
      }
      const hand = state.hands[playerId] || [];
      const card = hand.find((c) => c.id === action.cardId);
      if (!card) {
        throw new Error('Card not found in hand');
      }

      // Wild card is always playable
      if (card.suit === 'WILD') {
        if (!action.chosenColor || action.chosenColor === 'WILD') {
          throw new Error('Must specify chosen color (RED, YELLOW, GREEN, BLUE) for Wild card');
        }
        return true;
      }

      // Match color or rank
      const matchesColor = card.suit === state.currentColor;
      const matchesRank = card.rank === state.currentRank;

      if (!matchesColor && !matchesRank) {
        throw new Error(
          `Card ${card.label} does not match current color (${state.currentColor}) or rank (${state.currentRank})`
        );
      }
      return true;
    }

    throw new Error(`Unknown action type: ${action.type}`);
  }

  applyAction(state: UnoState, playerId: string, action: UnoAction): GameActionResult<UnoState> {
    try {
      this.validateAction(state, playerId, action);
    } catch (err: any) {
      return { success: false, state, error: err.message };
    }

    const nextState: UnoState = {
      ...state,
      hands: { ...state.hands },
      discardPile: [...state.discardPile],
      calledUno: [...state.calledUno],
    };

    const playerIds = Object.keys(nextState.hands);
    const currentIndex = playerIds.indexOf(playerId);

    const getNextPlayer = (step = 1): string => {
      const n = playerIds.length;
      const nextIdx = (currentIndex + step * nextState.turnDirection + n * 10) % n;
      return playerIds[nextIdx];
    };

    if (action.type === 'CALL_UNO') {
      if (!nextState.calledUno.includes(playerId)) {
        nextState.calledUno.push(playerId);
      }
      return { success: true, state: nextState };
    }

    if (action.type === 'DRAW_CARD') {
      // Draw card
      const hand = [...nextState.hands[playerId]];
      const penalty = Math.max(1, nextState.drawPenalty);
      for (let i = 0; i < penalty; i++) {
        if (nextState.drawPileCount > 0) {
          nextState.drawPileCount -= 1;
          const dummyCard: PlayingCard = {
            id: `draw-${Date.now()}-${i}`,
            suit: ['RED', 'YELLOW', 'GREEN', 'BLUE'][Math.floor(Math.random() * 4)] as UnoColor,
            rank: Math.floor(Math.random() * 10),
            label: 'Drawn Card',
            isFaceUp: true,
          };
          hand.push(dummyCard);
        }
      }
      nextState.hands[playerId] = hand;
      nextState.drawPenalty = 0;
      nextState.turnPlayerId = getNextPlayer(1);
      nextState.turnExpiresAt = Date.now() + UNO_TURN_DURATION_MS;
      return { success: true, state: nextState };
    }

    if (action.type === 'PLAY_CARD') {
      const hand = nextState.hands[playerId].filter((c) => c.id !== action.cardId);
      const playedCard = nextState.hands[playerId].find((c) => c.id === action.cardId)!;
      playedCard.isFaceUp = true;
      nextState.discardPile.unshift(playedCard);
      nextState.hands[playerId] = hand;

      // Check win condition
      if (hand.length === 0) {
        nextState.winnerId = playerId;
        return { success: true, state: nextState };
      }

      // Handle card effects
      let step = 1;
      if (playedCard.suit === 'WILD') {
        nextState.currentColor = action.chosenColor || 'RED';
        nextState.currentRank = playedCard.rank;
        if (playedCard.rank === 14) {
          // Wild Draw 4
          nextState.drawPenalty += 4;
          step = 2; // skip next player after penalty
        }
      } else {
        nextState.currentColor = playedCard.suit as UnoColor;
        nextState.currentRank = playedCard.rank;

        if (playedCard.rank === 10) {
          // Skip
          step = 2;
        } else if (playedCard.rank === 11) {
          // Reverse
          nextState.turnDirection = (nextState.turnDirection * -1) as 1 | -1;
          step = playerIds.length === 2 ? 2 : 1;
        } else if (playedCard.rank === 12) {
          // Draw 2
          nextState.drawPenalty += 2;
          step = 2;
        }
      }

      nextState.turnPlayerId = getNextPlayer(step);
      nextState.turnExpiresAt = Date.now() + UNO_TURN_DURATION_MS;

      return { success: true, state: nextState };
    }

    return { success: true, state: nextState };
  }

  checkWinner(state: UnoState): UnoResult | null {
    if (!state.winnerId) return null;
    const rankings = Object.keys(state.hands).map((uid) => ({
      userId: uid,
      score: uid === state.winnerId ? 100 : Math.max(0, 100 - state.hands[uid].length * 10),
    }));
    return {
      winnerId: state.winnerId,
      rankings,
    };
  }

  handleTurnTimeout(state: UnoState): GameActionResult<UnoState> {
    return this.applyAction(state, state.turnPlayerId, { type: 'DRAW_CARD' });
  }
}
