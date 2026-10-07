import { GameAI, AiDifficulty } from '../ai.interface';
import { BlackjackAction, BlackjackState } from '../../../../shared/game-types';

export class BlackjackAI implements GameAI<BlackjackState, BlackjackAction> {
  getMove(state: BlackjackState, aiPlayerId: string, difficulty: AiDifficulty): BlackjackAction {
    const hand = state.playerHands[aiPlayerId];
    if (!hand || hand.cards.length === 0) {
      // Must place initial bet (play money only)
      return { type: 'BET', amount: 50 };
    }

    if (hand.isBust || hand.status === 'STAND') {
      return { type: 'STAND' };
    }

    // Calculate hand value
    let total = 0;
    let aces = 0;
    for (const card of hand.cards) {
      if (card.rank === 14) {
        aces++;
        total += 11;
      } else if (card.rank >= 10) {
        total += 10;
      } else {
        total += card.rank;
      }
    }
    while (total > 21 && aces > 0) {
      total -= 10;
      aces--;
    }

    // Basic strategy
    if (total <= 11) {
      return { type: 'HIT' };
    }
    if (total >= 17) {
      return { type: 'STAND' };
    }

    // Between 12 and 16: check dealer's visible card (upcard)
    const dealerUpcard = state.dealerHand?.cards?.[0]?.rank || 7;
    if (dealerUpcard >= 2 && dealerUpcard <= 6) {
      return { type: 'STAND' };
    } else {
      return { type: 'HIT' };
    }
  }
}
