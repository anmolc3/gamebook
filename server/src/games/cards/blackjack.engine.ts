import { GameEngine, GamePlayerMeta } from '../game.definition';
import { GameRegistry } from '../game.registry';
import {
  BlackjackAction,
  BlackjackHand,
  BlackjackResult,
  BlackjackState,
  GameActionResult,
  GameDefinition,
  PlayingCard,
} from '../../../../shared/game-types';
import { CardDeck } from './core/deck';
import { CardEvaluator } from './core/evaluator';

export const BLACKJACK_TURN_DURATION_MS = 20000;
export const DEFAULT_STARTING_CHIPS = 1000;

export class BlackjackEngine
  implements GameEngine<BlackjackState, BlackjackAction, BlackjackResult>
{
  readonly definition: GameDefinition;

  constructor() {
    this.definition = GameRegistry.getGame('BLACKJACK') || {
      id: 'BLACKJACK',
      name: 'Blackjack (Play Money Only)',
      category: 'CARD',
      minPlayers: 1,
      maxPlayers: 5,
      defaultPlayers: 3,
      supportsSpectators: true,
      turnTimeSeconds: 20,
      description: 'Hit, stand, or double down against the dealer to reach 21 with virtual chips.',
      iconName: 'gamepad',
    };
  }

  private generateCard(): PlayingCard {
    const suits = ['HEARTS', 'DIAMONDS', 'CLUBS', 'SPADES'] as const;
    const rank = Math.floor(Math.random() * 13) + 2;
    const suit = suits[Math.floor(Math.random() * suits.length)];
    const symbols = { HEARTS: '♥', DIAMONDS: '♦', CLUBS: '♣', SPADES: '♠' };
    const label = `${rank === 14 ? 'A' : rank === 13 ? 'K' : rank === 12 ? 'Q' : rank === 11 ? 'J' : rank}${symbols[suit]}`;
    return {
      id: `bj-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      suit,
      rank,
      label,
      isFaceUp: true,
    };
  }

  initialize(players: GamePlayerMeta[], settings?: any): BlackjackState {
    if (!players || players.length === 0) {
      throw new Error('Blackjack requires at least 1 player');
    }

    const playerIds = players.map((p) => p.userId);
    const chips: Record<string, number> = {};
    const bets: Record<string, number> = {};
    const playerHands: Record<string, BlackjackHand> = {};

    playerIds.forEach((uid) => {
      chips[uid] = DEFAULT_STARTING_CHIPS;
      bets[uid] = 50; // Initial default virtual bet
      chips[uid] -= 50;

      const c1 = this.generateCard();
      const c2 = this.generateCard();
      const evalRes = CardEvaluator.evaluateBlackjack([c1, c2]);
      playerHands[uid] = {
        cards: [c1, c2],
        value: evalRes.value,
        isBust: evalRes.isBust,
        isBlackjack: evalRes.isBlackjack,
        status: evalRes.isBlackjack ? 'STAND' : 'ACTIVE',
      };
    });

    const d1 = this.generateCard();
    const d2 = this.generateCard();
    d2.isFaceUp = false; // Dealer hole card

    const dealerEval = CardEvaluator.evaluateBlackjack([d1, d2]);
    const dealerHand: BlackjackHand = {
      cards: [d1, d2],
      value: CardEvaluator.evaluateBlackjack([d1]).value, // only show upcard value initially
      isBust: false,
      isBlackjack: dealerEval.isBlackjack,
      status: 'ACTIVE',
    };

    return {
      playerHands,
      dealerHand,
      bets,
      chips,
      turnPlayerId: playerIds[0],
      isDealerTurn: false,
      isRoundComplete: false,
      winnerId: null,
      turnExpiresAt: Date.now() + BLACKJACK_TURN_DURATION_MS,
    };
  }

  validateAction(state: BlackjackState, playerId: string, action: BlackjackAction): boolean {
    if (state.isRoundComplete) {
      throw new Error('Round is already completed');
    }

    if (state.isDealerTurn) {
      throw new Error('Dealer is resolving hand');
    }

    if (state.turnPlayerId !== playerId) {
      throw new Error(`Not your turn. Turn belongs to ${state.turnPlayerId}`);
    }

    const hand = state.playerHands[playerId];
    if (!hand || hand.status !== 'ACTIVE') {
      throw new Error('Player hand is not active');
    }

    if (action.type === 'BET') {
      if (typeof action.amount !== 'number' || action.amount <= 0) {
        throw new Error('Bet amount must be a positive number');
      }
      return true;
    }

    if (action.type === 'DOUBLE_DOWN') {
      const currentBet = state.bets[playerId] || 0;
      if (state.chips[playerId] < currentBet) {
        throw new Error('Not enough virtual chips to double down');
      }
      return true;
    }

    if (action.type === 'HIT' || action.type === 'STAND') {
      return true;
    }

    throw new Error(`Unsupported action type: ${action.type}`);
  }

  private resolveDealerAndPayouts(state: BlackjackState): void {
    state.isDealerTurn = true;
    // Reveal dealer hole card
    state.dealerHand.cards.forEach((c) => {
      c.isFaceUp = true;
    });

    let dEval = CardEvaluator.evaluateBlackjack(state.dealerHand.cards);
    // Dealer hits until value is at least 17
    while (dEval.value < 17) {
      const card = this.generateCard();
      state.dealerHand.cards.push(card);
      dEval = CardEvaluator.evaluateBlackjack(state.dealerHand.cards);
    }

    state.dealerHand.value = dEval.value;
    state.dealerHand.isBust = dEval.isBust;
    state.dealerHand.isBlackjack = dEval.isBlackjack;
    state.dealerHand.status = dEval.isBust ? 'BUST' : 'STAND';

    // Calculate payouts
    const playerIds = Object.keys(state.playerHands);
    let topWinner: string | null = null;
    let topProfit = -1;

    playerIds.forEach((uid) => {
      const pHand = state.playerHands[uid];
      const bet = state.bets[uid] || 0;

      if (pHand.isBust) {
        // Lost bet (already deducted)
      } else if (pHand.isBlackjack && !state.dealerHand.isBlackjack) {
        // Natural 3:2 payout: return bet + 1.5 * bet
        const winAmount = bet + Math.floor(bet * 1.5);
        state.chips[uid] += winAmount;
        if (winAmount > topProfit) {
          topProfit = winAmount;
          topWinner = uid;
        }
      } else if (state.dealerHand.isBust || pHand.value > state.dealerHand.value) {
        // Win 1:1
        const winAmount = bet * 2;
        state.chips[uid] += winAmount;
        if (winAmount > topProfit) {
          topProfit = winAmount;
          topWinner = uid;
        }
      } else if (pHand.value === state.dealerHand.value) {
        // Push: return bet
        state.chips[uid] += bet;
      } else {
        // Dealer beats player
      }
    });

    state.winnerId = topWinner || playerIds[0];
    state.isRoundComplete = true;
  }

  applyAction(state: BlackjackState, playerId: string, action: BlackjackAction): GameActionResult<BlackjackState> {
    try {
      this.validateAction(state, playerId, action);
    } catch (err: any) {
      return { success: false, state, error: err.message };
    }

    const nextState: BlackjackState = {
      ...state,
      playerHands: { ...state.playerHands },
      dealerHand: {
        ...state.dealerHand,
        cards: [...state.dealerHand.cards],
      },
      bets: { ...state.bets },
      chips: { ...state.chips },
    };

    const hand = { ...nextState.playerHands[playerId], cards: [...nextState.playerHands[playerId].cards] };
    nextState.playerHands[playerId] = hand;

    if (action.type === 'HIT') {
      const card = this.generateCard();
      hand.cards.push(card);
      const evalRes = CardEvaluator.evaluateBlackjack(hand.cards);
      hand.value = evalRes.value;
      hand.isBust = evalRes.isBust;
      if (evalRes.isBust) {
        hand.status = 'BUST';
      }
    } else if (action.type === 'STAND') {
      hand.status = 'STAND';
    } else if (action.type === 'DOUBLE_DOWN') {
      const currentBet = nextState.bets[playerId];
      nextState.chips[playerId] -= currentBet;
      nextState.bets[playerId] += currentBet;

      const card = this.generateCard();
      hand.cards.push(card);
      const evalRes = CardEvaluator.evaluateBlackjack(hand.cards);
      hand.value = evalRes.value;
      hand.isBust = evalRes.isBust;
      hand.status = evalRes.isBust ? 'BUST' : 'STAND';
    }

    // Determine next player or dealer turn
    const playerIds = Object.keys(nextState.playerHands);
    const activePlayer = playerIds.find((uid) => nextState.playerHands[uid].status === 'ACTIVE');

    if (activePlayer) {
      nextState.turnPlayerId = activePlayer;
      nextState.turnExpiresAt = Date.now() + BLACKJACK_TURN_DURATION_MS;
    } else {
      // All players resolved -> dealer turn and finish
      this.resolveDealerAndPayouts(nextState);
    }

    return { success: true, state: nextState };
  }

  checkWinner(state: BlackjackState): BlackjackResult | null {
    if (!state.isRoundComplete) return null;
    const payouts: Record<string, number> = {};
    Object.keys(state.chips).forEach((uid) => {
      payouts[uid] = state.chips[uid];
    });

    return {
      winnerId: state.winnerId,
      payouts,
    };
  }

  handleTurnTimeout(state: BlackjackState): GameActionResult<BlackjackState> {
    return this.applyAction(state, state.turnPlayerId, { type: 'STAND' });
  }
}
