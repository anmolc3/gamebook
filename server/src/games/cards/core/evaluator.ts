import { PlayingCard, StandardSuit } from '../../../../../shared/game-types';

export class CardEvaluator {
  /**
   * Evaluates blackjack hand value with soft ace adjustments
   */
  static evaluateBlackjack(cards: PlayingCard[]): {
    value: number;
    isBust: boolean;
    isBlackjack: boolean;
  } {
    let value = 0;
    let aceCount = 0;

    for (const card of cards) {
      if (card.rank === 14) {
        // Ace
        aceCount += 1;
        value += 11;
      } else if (card.rank >= 10 && card.rank <= 13) {
        // 10, J, Q, K
        value += 10;
      } else {
        value += card.rank;
      }
    }

    // Adjust Aces from 11 to 1 if busted
    while (value > 21 && aceCount > 0) {
      value -= 10;
      aceCount -= 1;
    }

    const isBust = value > 21;
    const isBlackjack = cards.length === 2 && value === 21;

    return { value, isBust, isBlackjack };
  }

  /**
   * Determines the winner of a trick
   */
  static evaluateTrick(
    trick: { playerId: string; card: PlayingCard }[],
    leadSuit: StandardSuit,
    trumpSuit?: StandardSuit
  ): string {
    if (!trick || trick.length === 0) return '';

    let winningPlay = trick[0];

    for (let i = 1; i < trick.length; i++) {
      const candidate = trick[i];
      const winCard = winningPlay.card;
      const candCard = candidate.card;

      if (trumpSuit && candCard.suit === trumpSuit) {
        if (winCard.suit !== trumpSuit) {
          // Trump beats non-trump
          winningPlay = candidate;
        } else if (candCard.rank > winCard.rank) {
          // Higher trump beats lower trump
          winningPlay = candidate;
        }
      } else if (winCard.suit !== trumpSuit && candCard.suit === leadSuit) {
        if (winCard.suit !== leadSuit || candCard.rank > winCard.rank) {
          // Higher lead suit card beats lower
          winningPlay = candidate;
        }
      }
    }

    return winningPlay.playerId;
  }

  /**
   * Checks if cards form a Pure Sequence (same suit, strictly consecutive, min 3 cards)
   */
  static isPureSequence(cards: PlayingCard[]): boolean {
    if (cards.length < 3) return false;
    const suit = cards[0].suit;
    if (!cards.every((c) => c.suit === suit)) return false;

    const ranks = cards.map((c) => c.rank).sort((a, b) => a - b);
    for (let i = 0; i < ranks.length - 1; i++) {
      if (ranks[i + 1] !== ranks[i] + 1) return false;
    }
    return true;
  }

  /**
   * Checks if cards form a valid Set (same rank, distinct suits, 3 or 4 cards)
   */
  static isSet(cards: PlayingCard[]): boolean {
    if (cards.length < 3 || cards.length > 4) return false;
    const rank = cards[0].rank;
    if (!cards.every((c) => c.rank === rank)) return false;

    const suits = new Set(cards.map((c) => c.suit));
    return suits.size === cards.length;
  }

  /**
   * Evaluates poker hand (best 5 of up to 7 cards)
   */
  static evaluatePokerHand(cards: PlayingCard[]): {
    rankName: string;
    score: number;
  } {
    if (cards.length < 5) return { rankName: 'High Card', score: 100 };

    // Group by rank and suit
    const rankCounts: Record<number, number> = {};
    const suitCards: Record<string, PlayingCard[]> = {};

    cards.forEach((c) => {
      rankCounts[c.rank] = (rankCounts[c.rank] || 0) + 1;
      const s = c.suit as string;
      if (!suitCards[s]) suitCards[s] = [];
      suitCards[s].push(c);
    });

    const uniqueRanks = Object.keys(rankCounts)
      .map(Number)
      .sort((a, b) => b - a);

    // Check Flush (5 or more of same suit)
    let flushSuit: string | null = null;
    for (const [s, list] of Object.entries(suitCards)) {
      if (list.length >= 5) {
        flushSuit = s;
        break;
      }
    }

    // Check Straight
    const checkStraight = (ranks: number[]): number | null => {
      const sorted = [...new Set(ranks)].sort((a, b) => b - a);
      if (sorted.includes(14)) sorted.push(1); // Ace low straight
      for (let i = 0; i <= sorted.length - 5; i++) {
        if (
          sorted[i] - sorted[i + 1] === 1 &&
          sorted[i + 1] - sorted[i + 2] === 1 &&
          sorted[i + 2] - sorted[i + 3] === 1 &&
          sorted[i + 3] - sorted[i + 4] === 1
        ) {
          return sorted[i];
        }
      }
      return null;
    };

    const straightHigh = checkStraight(cards.map((c) => c.rank));

    // 1. Straight Flush / Royal Flush
    if (flushSuit) {
      const flushStraightHigh = checkStraight(suitCards[flushSuit].map((c) => c.rank));
      if (flushStraightHigh) {
        if (flushStraightHigh === 14) {
          return { rankName: 'Royal Flush', score: 10000 };
        }
        return { rankName: 'Straight Flush', score: 9000 + flushStraightHigh };
      }
    }

    // 2. Four of a Kind
    const fourRank = uniqueRanks.find((r) => rankCounts[r] === 4);
    if (fourRank) {
      return { rankName: 'Four of a Kind', score: 8000 + fourRank };
    }

    // 3. Full House (3 + 2)
    const threeRank = uniqueRanks.find((r) => rankCounts[r] >= 3);
    const pairRank = uniqueRanks.find((r) => r !== threeRank && rankCounts[r] >= 2);
    if (threeRank && pairRank) {
      return { rankName: 'Full House', score: 7000 + threeRank * 10 + pairRank };
    }

    // 4. Flush
    if (flushSuit) {
      const highestFlush = Math.max(...suitCards[flushSuit].map((c) => c.rank));
      return { rankName: 'Flush', score: 6000 + highestFlush };
    }

    // 5. Straight
    if (straightHigh) {
      return { rankName: 'Straight', score: 5000 + straightHigh };
    }

    // 6. Three of a Kind
    if (threeRank) {
      return { rankName: 'Three of a Kind', score: 4000 + threeRank };
    }

    // 7. Two Pair
    const pairs = uniqueRanks.filter((r) => rankCounts[r] === 2);
    if (pairs.length >= 2) {
      return { rankName: 'Two Pair', score: 3000 + pairs[0] * 10 + pairs[1] };
    }

    // 8. One Pair
    if (pairs.length === 1) {
      return { rankName: 'One Pair', score: 2000 + pairs[0] };
    }

    // 9. High Card
    return { rankName: 'High Card', score: 1000 + uniqueRanks[0] };
  }
}
