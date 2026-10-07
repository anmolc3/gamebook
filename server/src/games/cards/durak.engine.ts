import { GameEngine, GamePlayerMeta } from '../game.definition';
import { GameRegistry } from '../game.registry';
import {
  DurakAction,
  DurakResult,
  DurakState,
  DurakTableAttack,
  GameActionResult,
  GameDefinition,
  PlayingCard,
  StandardSuit,
} from '../../../../shared/game-types';
import { CardDeck } from './core/deck';

export const DURAK_TURN_DURATION_MS = 25000;

export class DurakEngine implements GameEngine<DurakState, DurakAction, DurakResult> {
  readonly definition: GameDefinition;

  constructor() {
    this.definition = GameRegistry.getGame('DURAK') || {
      id: 'DURAK',
      name: 'Durak',
      category: 'CARD',
      minPlayers: 2,
      maxPlayers: 4,
      defaultPlayers: 4,
      supportsSpectators: true,
      turnTimeSeconds: 20,
      description: 'Attack and defend with trump cards to avoid being the fool.',
      iconName: 'shield',
    };
  }

  initialize(players: GamePlayerMeta[], settings?: any): DurakState {
    if (!players || players.length < 2) {
      throw new Error('Durak requires at least 2 players');
    }

    const playerIds = players.map((p) => p.userId);
    const shuffled = CardDeck.shuffle(CardDeck.createDurak36());
    const { hands, remainingDeck } = CardDeck.deal(shuffled, playerIds, 6);

    const trumpCard = remainingDeck[0] || {
      id: 'trump-0',
      suit: 'HEARTS',
      rank: 6,
      label: '6♥',
      isFaceUp: true,
    };
    trumpCard.isFaceUp = true;
    const trumpSuit = trumpCard.suit as StandardSuit;

    // Lowest trump card starts as attacker
    let attackerId = playerIds[0];
    let minTrumpRank = 999;

    for (const uid of playerIds) {
      const trumps = hands[uid].filter((c) => c.suit === trumpSuit);
      for (const t of trumps) {
        if (t.rank < minTrumpRank) {
          minTrumpRank = t.rank;
          attackerId = uid;
        }
      }
    }

    const attIdx = playerIds.indexOf(attackerId);
    const defenderId = playerIds[(attIdx + 1) % playerIds.length];

    return {
      hands,
      deckCount: remainingDeck.length,
      trumpCard,
      trumpSuit,
      attackerId,
      defenderId,
      turnPlayerId: attackerId,
      table: [],
      discardCount: 0,
      winnerId: null,
      loserId: null,
      turnExpiresAt: Date.now() + DURAK_TURN_DURATION_MS,
    };
  }

  validateAction(state: DurakState, playerId: string, action: DurakAction): boolean {
    if (state.winnerId || state.loserId) {
      throw new Error('Game already finished');
    }

    const hand = state.hands[playerId] || [];

    if (action.type === 'ATTACK') {
      if (state.turnPlayerId !== playerId && state.attackerId !== playerId) {
        throw new Error('Only active attacker can lead or add attacks');
      }
      if (!action.cardId) {
        throw new Error('cardId is required for ATTACK');
      }
      const card = hand.find((c) => c.id === action.cardId);
      if (!card) {
        throw new Error('Attack card not found in hand');
      }

      // If table already has cards, attack card rank must match at least one rank on table
      if (state.table.length > 0) {
        const tableRanks = new Set<number>();
        state.table.forEach((t) => {
          tableRanks.add(t.attackCard.rank);
          if (t.defendCard) tableRanks.add(t.defendCard.rank);
        });
        if (!tableRanks.has(card.rank)) {
          throw new Error(`Attack rank ${card.rank} does not match any card on table`);
        }
      }
      return true;
    }

    if (action.type === 'DEFEND') {
      if (state.defenderId !== playerId) {
        throw new Error('Only the defender can defend');
      }
      if (!action.cardId) {
        throw new Error('cardId is required for DEFEND');
      }
      const card = hand.find((c) => c.id === action.cardId);
      if (!card) {
        throw new Error('Defend card not found in hand');
      }

      const undefendedIdx =
        action.defendAgainstIndex !== undefined
          ? action.defendAgainstIndex
          : state.table.findIndex((t) => !t.defendCard);

      if (undefendedIdx === -1 || !state.table[undefendedIdx]) {
        throw new Error('No undefended card found at specified index');
      }

      const attackCard = state.table[undefendedIdx].attackCard;

      // Defense check
      const isTrump = card.suit === state.trumpSuit;
      const attackIsTrump = attackCard.suit === state.trumpSuit;

      if (card.suit === attackCard.suit) {
        if (card.rank <= attackCard.rank) {
          throw new Error('Card rank must be higher than attack card');
        }
      } else if (isTrump && !attackIsTrump) {
        // Trump beats non-trump
      } else {
        throw new Error('Defend card must be higher rank of same suit, or a trump card');
      }
      return true;
    }

    if (action.type === 'TAKE') {
      if (state.defenderId !== playerId) {
        throw new Error('Only defender can take');
      }
      if (state.table.length === 0) {
        throw new Error('Table is empty; nothing to take');
      }
      return true;
    }

    if (action.type === 'PASS_ATTACK') {
      if (state.attackerId !== playerId) {
        throw new Error('Only attacker can pass the attack');
      }
      const hasUndefended = state.table.some((t) => !t.defendCard);
      if (hasUndefended) {
        throw new Error('Cannot pass while attacks remain undefended; defender must defend or take');
      }
      return true;
    }

    throw new Error(`Unsupported action type: ${action.type}`);
  }

  private replenishHands(state: DurakState): void {
    const playerIds = Object.keys(state.hands);
    const order = [state.attackerId, state.defenderId];
    playerIds.forEach((uid) => {
      if (!order.includes(uid)) order.push(uid);
    });

    for (const uid of order) {
      const need = 6 - state.hands[uid].length;
      if (need > 0 && state.deckCount > 0) {
        const drawCount = Math.min(need, state.deckCount);
        state.deckCount -= drawCount;
        for (let i = 0; i < drawCount; i++) {
          const suits = ['HEARTS', 'DIAMONDS', 'CLUBS', 'SPADES'] as const;
          const rank = Math.floor(Math.random() * 9) + 6;
          const suit = suits[Math.floor(Math.random() * suits.length)];
          state.hands[uid].push({
            id: `draw-${Date.now()}-${uid}-${i}`,
            suit,
            rank,
            label: `${rank}${suit[0]}`,
            isFaceUp: true,
          });
        }
      }
    }
  }

  private checkGameEnd(state: DurakState): void {
    const playerIds = Object.keys(state.hands);
    const remaining = playerIds.filter((uid) => state.hands[uid].length > 0);

    if (state.deckCount === 0) {
      if (remaining.length === 1) {
        state.loserId = remaining[0];
        const winners = playerIds.filter((uid) => uid !== state.loserId);
        state.winnerId = winners[0];
      } else if (remaining.length === 0) {
        state.winnerId = playerIds[0];
      }
    }
  }

  applyAction(state: DurakState, playerId: string, action: DurakAction): GameActionResult<DurakState> {
    try {
      this.validateAction(state, playerId, action);
    } catch (err: any) {
      return { success: false, state, error: err.message };
    }

    const nextState: DurakState = {
      ...state,
      hands: { ...state.hands },
      table: state.table.map((t) => ({ ...t })),
    };

    const playerIds = Object.keys(nextState.hands);
    const defIdx = playerIds.indexOf(nextState.defenderId);

    if (action.type === 'ATTACK') {
      const hand = [...nextState.hands[playerId]];
      const cardIdx = hand.findIndex((c) => c.id === action.cardId);
      const attackCard = hand.splice(cardIdx, 1)[0];
      attackCard.isFaceUp = true;
      nextState.hands[playerId] = hand;

      nextState.table.push({ attackCard });
      nextState.turnPlayerId = nextState.defenderId;
      nextState.turnExpiresAt = Date.now() + DURAK_TURN_DURATION_MS;

      return { success: true, state: nextState };
    }

    if (action.type === 'DEFEND') {
      const hand = [...nextState.hands[playerId]];
      const cardIdx = hand.findIndex((c) => c.id === action.cardId);
      const defendCard = hand.splice(cardIdx, 1)[0];
      defendCard.isFaceUp = true;
      nextState.hands[playerId] = hand;

      const undefendedIdx =
        action.defendAgainstIndex !== undefined
          ? action.defendAgainstIndex
          : nextState.table.findIndex((t) => !t.defendCard);

      nextState.table[undefendedIdx].defendCard = defendCard;

      // Turn switches back to attacker to add attacks or pass
      nextState.turnPlayerId = nextState.attackerId;
      nextState.turnExpiresAt = Date.now() + DURAK_TURN_DURATION_MS;

      return { success: true, state: nextState };
    }

    if (action.type === 'TAKE') {
      // Defender picks up all table cards
      const allTableCards: PlayingCard[] = [];
      nextState.table.forEach((t) => {
        allTableCards.push(t.attackCard);
        if (t.defendCard) allTableCards.push(t.defendCard);
      });

      nextState.hands[nextState.defenderId].push(...allTableCards);
      nextState.table = [];

      this.replenishHands(nextState);

      // Defender forfeits turn: next attacker is player after defender
      const nextAttackerIdx = (defIdx + 1) % playerIds.length;
      nextState.attackerId = playerIds[nextAttackerIdx];
      const nextDefIdx = (nextAttackerIdx + 1) % playerIds.length;
      nextState.defenderId = playerIds[nextDefIdx];
      nextState.turnPlayerId = nextState.attackerId;

      this.checkGameEnd(nextState);
      nextState.turnExpiresAt = Date.now() + DURAK_TURN_DURATION_MS;

      return { success: true, state: nextState };
    }

    if (action.type === 'PASS_ATTACK') {
      // Defense was successful! Move table cards to discard
      let discardedCount = 0;
      nextState.table.forEach((t) => {
        discardedCount += t.defendCard ? 2 : 1;
      });
      nextState.discardCount += discardedCount;
      nextState.table = [];

      this.replenishHands(nextState);

      // Defender successfully defended and becomes next attacker!
      nextState.attackerId = nextState.defenderId;
      const nextAttIdx = playerIds.indexOf(nextState.attackerId);
      nextState.defenderId = playerIds[(nextAttIdx + 1) % playerIds.length];
      nextState.turnPlayerId = nextState.attackerId;

      this.checkGameEnd(nextState);
      nextState.turnExpiresAt = Date.now() + DURAK_TURN_DURATION_MS;

      return { success: true, state: nextState };
    }

    return { success: true, state: nextState };
  }

  checkWinner(state: DurakState): DurakResult | null {
    if (!state.winnerId && !state.loserId) return null;
    return {
      durakUserId: state.loserId,
      winnerId: state.winnerId,
    };
  }

  handleTurnTimeout(state: DurakState): GameActionResult<DurakState> {
    if (state.turnPlayerId === state.defenderId) {
      return this.applyAction(state, state.defenderId, { type: 'TAKE' });
    }
    return this.applyAction(state, state.attackerId, { type: 'PASS_ATTACK' });
  }
}
