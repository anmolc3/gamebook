import { GameEngine, GamePlayerMeta } from '../game.definition';
import { GameRegistry } from '../game.registry';
import {
  GameActionResult,
  GameDefinition,
  HeartsTrickCard,
  PlayingCard,
  SpadesAction,
  SpadesResult,
  SpadesState,
  StandardSuit,
} from '../../../../shared/game-types';
import { CardDeck } from './core/deck';
import { CardEvaluator } from './core/evaluator';

export const SPADES_TURN_DURATION_MS = 20000;

export class SpadesEngine implements GameEngine<SpadesState, SpadesAction, SpadesResult> {
  readonly definition: GameDefinition;

  constructor() {
    this.definition = GameRegistry.getGame('SPADES') || {
      id: 'SPADES',
      name: 'Spades',
      category: 'CARD',
      minPlayers: 4,
      maxPlayers: 4,
      defaultPlayers: 4,
      supportsSpectators: true,
      turnTimeSeconds: 20,
      description: 'Partnership trick-taking card game with bidding.',
      iconName: 'gamepad',
    };
  }

  initialize(players: GamePlayerMeta[], settings?: any): SpadesState {
    if (!players || players.length !== 4) {
      throw new Error('Spades requires exactly 4 players');
    }

    const playerIds = players.map((p) => p.userId);
    const shuffled = CardDeck.shuffle(CardDeck.createStandard52());
    const { hands } = CardDeck.deal(shuffled, playerIds, 13);

    const bids: Record<string, number | null> = {};
    const tricksWon: Record<string, number> = {};
    const scores: Record<string, number> = {};
    const bags: Record<string, number> = {};

    playerIds.forEach((id) => {
      bids[id] = null; // Awaiting bids
      tricksWon[id] = 0;
      scores[id] = 0;
      bags[id] = 0;
    });

    const firstPlayerId = settings?.firstPlayerId || playerIds[0];

    return {
      hands,
      bids,
      tricksWon,
      currentTrick: [],
      leadSuit: null,
      spadesBroken: false,
      scores,
      bags,
      turnPlayerId: firstPlayerId,
      winnerId: null,
      turnExpiresAt: Date.now() + SPADES_TURN_DURATION_MS,
    };
  }

  validateAction(state: SpadesState, playerId: string, action: SpadesAction): boolean {
    if (state.winnerId) {
      throw new Error('Game already finished');
    }

    if (state.turnPlayerId !== playerId) {
      throw new Error(`Not your turn. Turn belongs to ${state.turnPlayerId}`);
    }

    const isBiddingPhase = Object.values(state.bids).some((b) => b === null);

    if (isBiddingPhase) {
      if (action.type !== 'BID') {
        throw new Error('Must submit BID during bidding phase');
      }
      if (typeof action.bidAmount !== 'number' || action.bidAmount < 0 || action.bidAmount > 13) {
        throw new Error('Bid amount must be between 0 and 13');
      }
      return true;
    }

    if (action.type !== 'PLAY_CARD') {
      throw new Error('Must submit PLAY_CARD during trick phase');
    }

    if (!action.cardId) {
      throw new Error('cardId is required');
    }

    const hand = state.hands[playerId] || [];
    const card = hand.find((c) => c.id === action.cardId);
    if (!card) {
      throw new Error('Card not found in hand');
    }

    // Follow lead suit
    if (state.leadSuit && card.suit !== state.leadSuit) {
      const hasLeadSuit = hand.some((c) => c.suit === state.leadSuit);
      if (hasLeadSuit) {
        throw new Error(`Must follow lead suit: ${state.leadSuit}`);
      }
    }

    // Leading with Spades
    if (!state.leadSuit && card.suit === 'SPADES' && !state.spadesBroken) {
      const onlySpades = hand.every((c) => c.suit === 'SPADES');
      if (!onlySpades) {
        throw new Error('Spades have not been broken yet; cannot lead with a Spade');
      }
    }

    return true;
  }

  applyAction(state: SpadesState, playerId: string, action: SpadesAction): GameActionResult<SpadesState> {
    try {
      this.validateAction(state, playerId, action);
    } catch (err: any) {
      return { success: false, state, error: err.message };
    }

    const nextState: SpadesState = {
      ...state,
      hands: { ...state.hands },
      bids: { ...state.bids },
      tricksWon: { ...state.tricksWon },
      currentTrick: [...state.currentTrick],
      scores: { ...state.scores },
      bags: { ...state.bags },
    };

    const playerIds = Object.keys(nextState.hands);
    const currIdx = playerIds.indexOf(playerId);

    if (action.type === 'BID') {
      nextState.bids[playerId] = action.bidAmount!;
      // Find next player needing to bid
      const unbidPlayer = playerIds.find((id) => nextState.bids[id] === null);
      if (unbidPlayer) {
        nextState.turnPlayerId = unbidPlayer;
      } else {
        // All bids complete; first player starts trick phase
        nextState.turnPlayerId = playerIds[0];
      }
      nextState.turnExpiresAt = Date.now() + SPADES_TURN_DURATION_MS;
      return { success: true, state: nextState };
    }

    // PLAY_CARD
    const hand = [...nextState.hands[playerId]];
    const cardIdx = hand.findIndex((c) => c.id === action.cardId);
    const playedCard = hand.splice(cardIdx, 1)[0];
    nextState.hands[playerId] = hand;

    if (playedCard.suit === 'SPADES') {
      nextState.spadesBroken = true;
    }

    nextState.currentTrick.push({ playerId, card: playedCard });
    if (!nextState.leadSuit) {
      nextState.leadSuit = playedCard.suit as StandardSuit;
    }

    if (nextState.currentTrick.length === 4) {
      // Evaluate trick winner with SPADES trump
      const trickWinnerId = CardEvaluator.evaluateTrick(
        nextState.currentTrick,
        nextState.leadSuit,
        'SPADES'
      );

      nextState.tricksWon[trickWinnerId] = (nextState.tricksWon[trickWinnerId] || 0) + 1;
      nextState.currentTrick = [];
      nextState.leadSuit = null;
      nextState.turnPlayerId = trickWinnerId;

      // Check if round finished (hands empty)
      const allEmpty = Object.values(nextState.hands).every((h) => h.length === 0);
      if (allEmpty) {
        // Calculate scores
        playerIds.forEach((uid) => {
          const bid = nextState.bids[uid] || 0;
          const won = nextState.tricksWon[uid] || 0;

          if (bid === 0) {
            // Nil bid
            if (won === 0) {
              nextState.scores[uid] += 100;
            } else {
              nextState.scores[uid] -= 100;
              nextState.bags[uid] += won;
            }
          } else {
            if (won >= bid) {
              const overtricks = won - bid;
              nextState.scores[uid] += bid * 10 + overtricks;
              nextState.bags[uid] += overtricks;
              if (nextState.bags[uid] >= 10) {
                nextState.scores[uid] -= 100;
                nextState.bags[uid] %= 10;
              }
            } else {
              nextState.scores[uid] -= bid * 10;
            }
          }
        });

        // Determine winner
        let highest = -Infinity;
        let winner = playerIds[0];
        playerIds.forEach((uid) => {
          if (nextState.scores[uid] > highest) {
            highest = nextState.scores[uid];
            winner = uid;
          }
        });
        nextState.winnerId = winner;
      }
    } else {
      nextState.turnPlayerId = playerIds[(currIdx + 1) % playerIds.length];
    }

    nextState.turnExpiresAt = Date.now() + SPADES_TURN_DURATION_MS;
    return { success: true, state: nextState };
  }

  checkWinner(state: SpadesState): SpadesResult | null {
    if (!state.winnerId) return null;
    return {
      winnerId: state.winnerId,
      scores: state.scores,
    };
  }

  handleTurnTimeout(state: SpadesState): GameActionResult<SpadesState> {
    const isBiddingPhase = Object.values(state.bids).some((b) => b === null);
    if (isBiddingPhase) {
      return this.applyAction(state, state.turnPlayerId, { type: 'BID', bidAmount: 2 });
    }

    const hand = state.hands[state.turnPlayerId] || [];
    if (hand.length === 0) return { success: true, state };

    let candidate = hand[0];
    if (state.leadSuit) {
      const match = hand.find((c) => c.suit === state.leadSuit);
      if (match) candidate = match;
    }
    return this.applyAction(state, state.turnPlayerId, { type: 'PLAY_CARD', cardId: candidate.id });
  }
}
