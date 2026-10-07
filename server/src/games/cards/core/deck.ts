import crypto from 'crypto';
import { PlayingCard, StandardSuit, UnoColor } from '../../../../../shared/game-types';

export const STANDARD_SUITS: StandardSuit[] = ['HEARTS', 'DIAMONDS', 'CLUBS', 'SPADES'];
export const SUIT_SYMBOLS: Record<StandardSuit, string> = {
  HEARTS: '♥',
  DIAMONDS: '♦',
  CLUBS: '♣',
  SPADES: '♠',
};

export const RANK_LABELS: Record<number, string> = {
  2: '2',
  3: '3',
  4: '4',
  5: '5',
  6: '6',
  7: '7',
  8: '8',
  9: '9',
  10: '10',
  11: 'J',
  12: 'Q',
  13: 'K',
  14: 'A',
};

export const UNO_COLORS: UnoColor[] = ['RED', 'YELLOW', 'GREEN', 'BLUE'];

export class CardDeck {
  /**
   * Generates a standard 52-card poker deck
   */
  static createStandard52(): PlayingCard[] {
    const cards: PlayingCard[] = [];
    for (const suit of STANDARD_SUITS) {
      for (let rank = 2; rank <= 14; rank++) {
        const symbol = SUIT_SYMBOLS[suit];
        const label = `${RANK_LABELS[rank]}${symbol}`;
        cards.push({
          id: `${suit[0]}-${rank}`,
          suit,
          rank,
          label,
          isFaceUp: false,
        });
      }
    }
    return cards;
  }

  /**
   * Generates a 36-card deck (ranks 6..14) for Durak
   */
  static createDurak36(): PlayingCard[] {
    const cards: PlayingCard[] = [];
    for (const suit of STANDARD_SUITS) {
      for (let rank = 6; rank <= 14; rank++) {
        const symbol = SUIT_SYMBOLS[suit];
        const label = `${RANK_LABELS[rank]}${symbol}`;
        cards.push({
          id: `${suit[0]}-${rank}`,
          suit,
          rank,
          label,
          isFaceUp: false,
        });
      }
    }
    return cards;
  }

  /**
   * Generates a 108-card Uno-style deck
   */
  static createUno108(): PlayingCard[] {
    const cards: PlayingCard[] = [];

    UNO_COLORS.forEach((color) => {
      // One 0 per color
      cards.push({
        id: `${color}-0-0`,
        suit: color,
        rank: 0,
        label: `${color} 0`,
        isFaceUp: false,
      });

      // Two of each 1..9
      for (let rank = 1; rank <= 9; rank++) {
        cards.push({
          id: `${color}-${rank}-1`,
          suit: color,
          rank,
          label: `${color} ${rank}`,
          isFaceUp: false,
        });
        cards.push({
          id: `${color}-${rank}-2`,
          suit: color,
          rank,
          label: `${color} ${rank}`,
          isFaceUp: false,
        });
      }

      // Actions: 10 = Skip, 11 = Reverse, 12 = Draw 2 (2 each)
      [10, 11, 12].forEach((rank) => {
        const name = rank === 10 ? 'Skip' : rank === 11 ? 'Reverse' : 'Draw 2';
        cards.push({
          id: `${color}-${name}-1`,
          suit: color,
          rank,
          label: `${color} ${name}`,
          isFaceUp: false,
        });
        cards.push({
          id: `${color}-${name}-2`,
          suit: color,
          rank,
          label: `${color} ${name}`,
          isFaceUp: false,
        });
      });
    });

    // 4 Wild cards (rank 13) and 4 Wild Draw 4 (rank 14)
    for (let i = 1; i <= 4; i++) {
      cards.push({
        id: `WILD-${i}`,
        suit: 'WILD',
        rank: 13,
        label: 'Wild',
        isFaceUp: false,
      });
      cards.push({
        id: `WILD_DRAW4-${i}`,
        suit: 'WILD',
        rank: 14,
        label: 'Wild Draw 4',
        isFaceUp: false,
      });
    }

    return cards;
  }

  /**
   * Cryptographically secure Fisher-Yates array shuffle
   */
  static shuffle<T>(deck: T[]): T[] {
    const copy = [...deck];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = crypto.randomInt(0, i + 1);
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  /**
   * Deals cards evenly to specified player IDs
   */
  static deal(
    shuffledDeck: PlayingCard[],
    playerIds: string[],
    cardsPerPlayer: number
  ): { hands: Record<string, PlayingCard[]>; remainingDeck: PlayingCard[] } {
    const hands: Record<string, PlayingCard[]> = {};
    playerIds.forEach((id) => {
      hands[id] = [];
    });

    const deck = [...shuffledDeck];
    for (let round = 0; round < cardsPerPlayer; round++) {
      for (const id of playerIds) {
        if (deck.length > 0) {
          hands[id].push(deck.pop()!);
        }
      }
    }

    return { hands, remainingDeck: deck };
  }
}
