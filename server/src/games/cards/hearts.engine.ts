import { GameEngine, GamePlayerMeta } from '../game.definition';
import { GameRegistry } from '../game.registry';
import {
  GameActionResult,
  GameDefinition,
  HeartsAction,
  HeartsResult,
  HeartsState,
  HeartsTrickCard,
  PlayingCard,
  StandardSuit,
} from '../../../../shared/game-types';
import { CardDeck } from './core/deck';
import { CardEvaluator } from './core/evaluator';

export const HEARTS_TURN_DURATION_MS = 20000;

export class HeartsEngine implements GameEngine<HeartsState, HeartsAction, HeartsResult> {
  readonly definition: GameDefinition;

  constructor() {
    this.definition = GameRegistry.getGame('HEARTS') || {
      id: 'HEARTS',
      name: 'Hearts',
      category: 'CARD',
      minPlayers: 4,
      maxPlayers: 4,
      defaultPlayers: 4,
      supportsSpectators: true,
      turnTimeSeconds: 20,
      description: 'Trick-taking card game avoiding penalty hearts and the Queen of Spades.',
      iconName: 'heart',
    };
  }

  initialize(players: GamePlayerMeta[], settings?: any): HeartsState {
    if (!players || players.length !== 4) {
      throw new Error('Hearts requires exactly 4 players');
    }

    const playerIds = players.map((p) => p.userId);
    const shuffled = CardDeck.shuffle(CardDeck.createStandard52());
    const { hands } = CardDeck.deal(shuffled, playerIds, 13);

    // Find who has 2 of clubs (C-2) to lead first
    let leadPlayer = playerIds[0];
    for (const uid of playerIds) {
      if (hands[uid].some((c) => c.suit === 'CLUBS' && c.rank === 2)) {
        leadPlayer = uid;
        break;
      }
    }

    const tricksWon: Record<string, PlayingCard[][]> = {};
    const roundScores: Record<string, number> = {};
    const totalScores: Record<string, number> = {};

    playerIds.forEach((id) => {
      tricksWon[id] = [];
      roundScores[id] = 0;
      totalScores[id] = 0;
    });

    return {
      hands,
      currentTrick: [],
      tricksWon,
      roundScores,
      totalScores,
      leadSuit: null,
      heartsBroken: false,
      passPhase: false,
      turnPlayerId: leadPlayer,
      winnerId: null,
      turnExpiresAt: Date.now() + HEARTS_TURN_DURATION_MS,
    };
  }

  validateAction(state: HeartsState, playerId: string, action: HeartsAction): boolean {
    if (state.winnerId) {
      throw new Error('Game already finished');
    }

    if (state.turnPlayerId !== playerId) {
      throw new Error(`Not your turn. Turn belongs to ${state.turnPlayerId}`);
    }

    if (action.type !== 'PLAY_CARD') {
      throw new Error(`Action type ${action.type} is not supported during play`);
    }

    if (!action.cardId) {
      throw new Error('cardId is required');
    }

    const hand = state.hands[playerId] || [];
    const card = hand.find((c) => c.id === action.cardId);
    if (!card) {
      throw new Error('Card not found in hand');
    }

    // First trick must lead with 2 of clubs if it's the very first play
    const isFirstTrick = Object.values(state.tricksWon).every((t) => t.length === 0) && state.currentTrick.length === 0;
    if (isFirstTrick && (card.suit !== 'CLUBS' || card.rank !== 2)) {
      if (hand.some((c) => c.suit === 'CLUBS' && c.rank === 2)) {
        throw new Error('First trick must be led with the 2 of Clubs');
      }
    }

    // Follow suit rule
    if (state.leadSuit && card.suit !== state.leadSuit) {
      const hasLeadSuit = hand.some((c) => c.suit === state.leadSuit);
      if (hasLeadSuit) {
        throw new Error(`Must follow lead suit: ${state.leadSuit}`);
      }
    }

    // Hearts broken rule on lead
    if (!state.leadSuit && card.suit === 'HEARTS' && !state.heartsBroken) {
      const onlyHearts = hand.every((c) => c.suit === 'HEARTS');
      if (!onlyHearts) {
        throw new Error('Hearts have not been broken yet; cannot lead with a Heart');
      }
    }

    return true;
  }

  applyAction(state: HeartsState, playerId: string, action: HeartsAction): GameActionResult<HeartsState> {
    try {
      this.validateAction(state, playerId, action);
    } catch (err: any) {
      return { success: false, state, error: err.message };
    }

    const nextState: HeartsState = {
      ...state,
      hands: { ...state.hands },
      currentTrick: [...state.currentTrick],
      tricksWon: { ...state.tricksWon },
      roundScores: { ...state.roundScores },
    };

    const hand = [...nextState.hands[playerId]];
    const cardIndex = hand.findIndex((c) => c.id === action.cardId);
    const playedCard = hand.splice(cardIndex, 1)[0];
    nextState.hands[playerId] = hand;

    // If heart played, hearts are broken
    if (playedCard.suit === 'HEARTS') {
      nextState.heartsBroken = true;
    }

    const trickPlay: HeartsTrickCard = { playerId, card: playedCard };
    nextState.currentTrick.push(trickPlay);

    if (!nextState.leadSuit) {
      nextState.leadSuit = playedCard.suit as StandardSuit;
    }

    const playerIds = Object.keys(nextState.hands);

    // If trick is full (4 cards played)
    if (nextState.currentTrick.length === 4) {
      const trickWinnerId = CardEvaluator.evaluateTrick(
        nextState.currentTrick,
        nextState.leadSuit
      );

      // Award trick cards
      const trickCards = nextState.currentTrick.map((t) => t.card);
      nextState.tricksWon[trickWinnerId] = [...nextState.tricksWon[trickWinnerId], trickCards];

      // Tally penalty points in trick
      let penalty = 0;
      for (const c of trickCards) {
        if (c.suit === 'HEARTS') penalty += 1;
        if (c.suit === 'SPADES' && c.rank === 12) penalty += 13; // Queen of Spades
      }
      nextState.roundScores[trickWinnerId] = (nextState.roundScores[trickWinnerId] || 0) + penalty;

      // Clear trick
      nextState.currentTrick = [];
      nextState.leadSuit = null;
      nextState.turnPlayerId = trickWinnerId;

      // Check if all cards have been played (round over)
      const allEmpty = Object.values(nextState.hands).every((h) => h.length === 0);
      if (allEmpty) {
        // Check Shoot The Moon
        let moonShooter: string | null = null;
        for (const uid of playerIds) {
          if (nextState.roundScores[uid] === 26) {
            moonShooter = uid;
            break;
          }
        }

        if (moonShooter) {
          playerIds.forEach((uid) => {
            nextState.roundScores[uid] = uid === moonShooter ? 0 : 26;
          });
        }

        // Lowest score wins
        let lowestScore = Infinity;
        let winner = playerIds[0];
        for (const uid of playerIds) {
          if (nextState.roundScores[uid] < lowestScore) {
            lowestScore = nextState.roundScores[uid];
            winner = uid;
          }
        }
        nextState.winnerId = winner;
      }
    } else {
      // Next player in clockwise order
      const currIdx = playerIds.indexOf(playerId);
      nextState.turnPlayerId = playerIds[(currIdx + 1) % playerIds.length];
    }

    nextState.turnExpiresAt = Date.now() + HEARTS_TURN_DURATION_MS;
    return { success: true, state: nextState };
  }

  checkWinner(state: HeartsState): HeartsResult | null {
    if (!state.winnerId) return null;
    const shotTheMoon = Object.values(state.roundScores).some((s) => s === 26) && state.roundScores[state.winnerId] === 0;
    return {
      winnerId: state.winnerId,
      scores: state.roundScores,
      shotTheMoon,
    };
  }

  handleTurnTimeout(state: HeartsState): GameActionResult<HeartsState> {
    const hand = state.hands[state.turnPlayerId] || [];
    if (hand.length === 0) return { success: true, state };

    // Find first valid playable card
    let candidate = hand[0];
    if (state.leadSuit) {
      const match = hand.find((c) => c.suit === state.leadSuit);
      if (match) candidate = match;
    }
    return this.applyAction(state, state.turnPlayerId, { type: 'PLAY_CARD', cardId: candidate.id });
  }
}
