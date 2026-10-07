import { GameEngine, GamePlayerMeta } from '../game.definition';
import { GameRegistry } from '../game.registry';
import {
  GameActionResult,
  GameDefinition,
  PlayingCard,
  PokerAction,
  PokerPlayerState,
  PokerResult,
  PokerStage,
  PokerState,
} from '../../../../shared/game-types';
import { CardDeck } from './core/deck';
import { CardEvaluator } from './core/evaluator';

export const POKER_TURN_DURATION_MS = 25000;
export const DEFAULT_POKER_CHIPS = 1000;
export const SMALL_BLIND = 10;
export const BIG_BLIND = 20;

export class PokerEngine implements GameEngine<PokerState, PokerAction, PokerResult> {
  readonly definition: GameDefinition;

  constructor() {
    this.definition = GameRegistry.getGame('POKER') || {
      id: 'POKER',
      name: 'Texas Hold’em (Play Money Only)',
      category: 'CARD',
      minPlayers: 2,
      maxPlayers: 6,
      defaultPlayers: 4,
      supportsSpectators: true,
      turnTimeSeconds: 30,
      description: 'Virtual-chip social poker with flop, turn, and river community cards.',
      iconName: 'trophy',
    };
  }

  private generateCard(usedIds: Set<string>): PlayingCard {
    const suits = ['HEARTS', 'DIAMONDS', 'CLUBS', 'SPADES'] as const;
    const rank = Math.floor(Math.random() * 13) + 2;
    const suit = suits[Math.floor(Math.random() * suits.length)];
    const symbols = { HEARTS: '♥', DIAMONDS: '♦', CLUBS: '♣', SPADES: '♠' };
    const label = `${rank === 14 ? 'A' : rank === 13 ? 'K' : rank === 12 ? 'Q' : rank === 11 ? 'J' : rank}${symbols[suit]}`;
    const id = `pk-${suit[0]}-${rank}-${Math.random().toString(36).substr(2, 4)}`;
    return { id, suit, rank, label, isFaceUp: true };
  }

  initialize(players: GamePlayerMeta[], settings?: any): PokerState {
    if (!players || players.length < 2) {
      throw new Error('Texas Hold’em requires at least 2 players');
    }

    const shuffled = CardDeck.shuffle(CardDeck.createStandard52());
    const playerIds = players.map((p) => p.userId);

    const pokerPlayers: PokerPlayerState[] = playerIds.map((uid) => {
      const c1 = shuffled.pop()!;
      const c2 = shuffled.pop()!;
      c1.isFaceUp = true;
      c2.isFaceUp = true;
      return {
        userId: uid,
        chips: DEFAULT_POKER_CHIPS,
        currentBet: 0,
        holeCards: [c1, c2],
        folded: false,
        isAllIn: false,
      };
    });

    // Small blind & Big blind
    const pCount = pokerPlayers.length;
    const sbPlayer = pokerPlayers[0];
    const bbPlayer = pokerPlayers[1 % pCount];

    sbPlayer.chips -= SMALL_BLIND;
    sbPlayer.currentBet = SMALL_BLIND;

    bbPlayer.chips -= BIG_BLIND;
    bbPlayer.currentBet = BIG_BLIND;

    const pot = SMALL_BLIND + BIG_BLIND;
    const firstTurnIdx = (2) % pCount;

    return {
      players: pokerPlayers,
      communityCards: [],
      pot,
      currentBet: BIG_BLIND,
      stage: 'PREFLOP',
      dealerIndex: 0,
      turnPlayerId: pokerPlayers[firstTurnIdx].userId,
      winnerId: null,
      turnExpiresAt: Date.now() + POKER_TURN_DURATION_MS,
    };
  }

  validateAction(state: PokerState, playerId: string, action: PokerAction): boolean {
    if (state.winnerId) {
      throw new Error('Game already finished');
    }

    if (state.turnPlayerId !== playerId) {
      throw new Error(`Not your turn. Turn belongs to ${state.turnPlayerId}`);
    }

    const player = state.players.find((p) => p.userId === playerId);
    if (!player || player.folded) {
      throw new Error('Player is not active or has folded');
    }

    if (action.type === 'CHECK') {
      if (player.currentBet < state.currentBet) {
        throw new Error(`Cannot check; must call ${state.currentBet - player.currentBet} or fold`);
      }
      return true;
    }

    if (action.type === 'CALL') {
      const callAmount = state.currentBet - player.currentBet;
      if (player.chips < callAmount) {
        throw new Error('Not enough chips to call (use ALL_IN instead)');
      }
      return true;
    }

    if (action.type === 'BET' || action.type === 'RAISE') {
      const amount = action.amount || BIG_BLIND;
      if (amount <= state.currentBet) {
        throw new Error(`Raise amount must exceed current bet (${state.currentBet})`);
      }
      if (player.chips < amount - player.currentBet) {
        throw new Error('Not enough chips to bet/raise');
      }
      return true;
    }

    if (action.type === 'FOLD' || action.type === 'ALL_IN') {
      return true;
    }

    throw new Error(`Unsupported action type: ${action.type}`);
  }

  private advanceStage(state: PokerState): void {
    const usedIds = new Set<string>();
    state.communityCards.forEach((c) => usedIds.add(c.id));

    // Reset current bets for the new betting round
    state.players.forEach((p) => {
      p.currentBet = 0;
    });
    state.currentBet = 0;

    if (state.stage === 'PREFLOP') {
      // Deal Flop (3 cards)
      state.stage = 'FLOP';
      state.communityCards.push(
        this.generateCard(usedIds),
        this.generateCard(usedIds),
        this.generateCard(usedIds)
      );
    } else if (state.stage === 'FLOP') {
      // Deal Turn (1 card)
      state.stage = 'TURN';
      state.communityCards.push(this.generateCard(usedIds));
    } else if (state.stage === 'TURN') {
      // Deal River (1 card)
      state.stage = 'RIVER';
      state.communityCards.push(this.generateCard(usedIds));
    } else if (state.stage === 'RIVER') {
      // Showdown!
      state.stage = 'SHOWDOWN';
      this.resolveShowdown(state);
    }
  }

  private resolveShowdown(state: PokerState): void {
    const active = state.players.filter((p) => !p.folded);
    let bestScore = -1;
    let winningPlayer = active[0];

    active.forEach((p) => {
      const combined = [...p.holeCards, ...state.communityCards];
      const res = CardEvaluator.evaluatePokerHand(combined);
      p.handRank = res.rankName;
      if (res.score > bestScore) {
        bestScore = res.score;
        winningPlayer = p;
      }
    });

    winningPlayer.chips += state.pot;
    state.winnerId = winningPlayer.userId;
  }

  applyAction(state: PokerState, playerId: string, action: PokerAction): GameActionResult<PokerState> {
    try {
      this.validateAction(state, playerId, action);
    } catch (err: any) {
      return { success: false, state, error: err.message };
    }

    const nextState: PokerState = {
      ...state,
      players: state.players.map((p) => ({
        ...p,
        holeCards: [...p.holeCards],
      })),
      communityCards: [...state.communityCards],
    };

    const pIdx = nextState.players.findIndex((p) => p.userId === playerId);
    const player = nextState.players[pIdx];

    if (action.type === 'FOLD') {
      player.folded = true;
      const nonFolded = nextState.players.filter((p) => !p.folded);
      if (nonFolded.length === 1) {
        // Last player remaining wins pot immediately
        nonFolded[0].chips += nextState.pot;
        nextState.winnerId = nonFolded[0].userId;
        return { success: true, state: nextState };
      }
    } else if (action.type === 'CHECK') {
      // Checked
    } else if (action.type === 'CALL') {
      const callDiff = nextState.currentBet - player.currentBet;
      player.chips -= callDiff;
      player.currentBet += callDiff;
      nextState.pot += callDiff;
    } else if (action.type === 'BET' || action.type === 'RAISE') {
      const targetBet = action.amount || (nextState.currentBet + BIG_BLIND);
      const diff = targetBet - player.currentBet;
      player.chips -= diff;
      player.currentBet = targetBet;
      nextState.currentBet = targetBet;
      nextState.pot += diff;
    } else if (action.type === 'ALL_IN') {
      const allInChips = player.chips;
      player.chips = 0;
      player.currentBet += allInChips;
      nextState.pot += allInChips;
      player.isAllIn = true;
      if (player.currentBet > nextState.currentBet) {
        nextState.currentBet = player.currentBet;
      }
    }

    // Check if betting round is settled
    const activePlayers = nextState.players.filter((p) => !p.folded && !p.isAllIn);
    const allBetsEqual = activePlayers.every((p) => p.currentBet === nextState.currentBet);

    // Find next player to act
    const pCount = nextState.players.length;
    let nextIdx = (pIdx + 1) % pCount;
    let found = false;

    for (let i = 0; i < pCount; i++) {
      const cand = nextState.players[(pIdx + 1 + i) % pCount];
      if (!cand.folded && !cand.isAllIn) {
        nextIdx = (pIdx + 1 + i) % pCount;
        found = true;
        break;
      }
    }

    if (allBetsEqual && (!found || activePlayers.length <= 1)) {
      if (nextState.stage === 'RIVER' || nextState.stage === 'SHOWDOWN') {
        this.resolveShowdown(nextState);
      } else {
        this.advanceStage(nextState);
        nextState.turnPlayerId = nextState.players[0].userId;
      }
    } else if (found) {
      nextState.turnPlayerId = nextState.players[nextIdx].userId;
    }

    nextState.turnExpiresAt = Date.now() + POKER_TURN_DURATION_MS;
    return { success: true, state: nextState };
  }

  checkWinner(state: PokerState): PokerResult | null {
    if (!state.winnerId) return null;
    const winner = state.players.find((p) => p.userId === state.winnerId);
    return {
      winnerId: state.winnerId,
      winningHandRank: winner?.handRank,
      potWon: state.pot,
    };
  }

  handleTurnTimeout(state: PokerState): GameActionResult<PokerState> {
    const player = state.players.find((p) => p.userId === state.turnPlayerId);
    if (!player) return { success: true, state };

    if (player.currentBet >= state.currentBet) {
      return this.applyAction(state, state.turnPlayerId, { type: 'CHECK' });
    }
    return this.applyAction(state, state.turnPlayerId, { type: 'FOLD' });
  }
}
