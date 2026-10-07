import { GameEngine, GamePlayerMeta } from '../game.definition';
import { GameRegistry } from '../game.registry';
import {
  GameActionResult,
  GameDefinition,
  ThisOrThatAction,
  ThisOrThatPair,
  ThisOrThatResult,
  ThisOrThatState,
} from '../../../../shared/game-types';

export const THIS_OR_THAT_ROUND_MS = 20000;

export class ThisOrThatEngine
  implements GameEngine<ThisOrThatState, ThisOrThatAction, ThisOrThatResult>
{
  readonly definition: GameDefinition;

  private static PAIRS: ThisOrThatPair[] = [
    { id: 'tot_1', optionA: 'Fresh Brewed Coffee', optionB: 'Artisanal Hot Tea' },
    { id: 'tot_2', optionA: 'Sunny Tropical Beach', optionB: 'Cozy Mountain Cabin' },
    { id: 'tot_3', optionA: 'Early Morning Bird', optionB: 'Late Midnight Owl' },
    { id: 'tot_4', optionA: 'Furry Cuddly Dogs', optionB: 'Independent Playful Cats' },
    { id: 'tot_5', optionA: 'iOS / iPhone', optionB: 'Android Ecosystem' },
    { id: 'tot_6', optionA: 'Binge-watching Movies', optionB: 'Reading Epic Books' },
    { id: 'tot_7', optionA: 'Bustling Metropolis', optionB: 'Quiet Scenic Countryside' },
    { id: 'tot_8', optionA: 'Warm Golden Summer', optionB: 'Snowy Crisp Winter' },
    { id: 'tot_9', optionA: 'Spicy Savory Snacks', optionB: 'Sweet Chocolate Treats' },
    { id: 'tot_10', optionA: 'Live Concert in Arena', optionB: 'Private Intimate Cinema' },
  ];

  constructor() {
    this.definition = GameRegistry.getGame('THIS_OR_THAT') || {
      id: 'THIS_OR_THAT',
      name: 'This or That',
      category: 'PARTY',
      minPlayers: 2,
      maxPlayers: 8,
      defaultPlayers: 4,
      supportsSpectators: true,
      turnTimeSeconds: 15,
      description: 'Speed voting on everyday preferences with friend compatibility scores.',
      iconName: 'heart',
    };
  }

  initialize(players: GamePlayerMeta[], settings?: any): ThisOrThatState {
    if (!players || players.length < 2) {
      throw new Error('This or That requires at least 2 players');
    }

    const playerIds = players.map((p) => p.userId);
    const selections: Record<string, 'A' | 'B' | null> = {};
    const matchScores: Record<string, number> = {};

    for (const pid of playerIds) {
      selections[pid] = null;
      matchScores[pid] = 0;
    }

    const pair =
      settings?.pair ||
      ThisOrThatEngine.PAIRS[
        Math.floor(Math.random() * ThisOrThatEngine.PAIRS.length)
      ];

    return {
      players: playerIds,
      currentPair: pair,
      round: 1,
      totalRounds: settings?.totalRounds || 5,
      selections,
      matchScores,
      winnerId: null,
      turnExpiresAt: Date.now() + THIS_OR_THAT_ROUND_MS,
    };
  }

  validateAction(
    state: ThisOrThatState,
    playerId: string,
    action: ThisOrThatAction
  ): boolean {
    if (state.winnerId) {
      throw new Error('Game already concluded');
    }
    if (!state.players.includes(playerId)) {
      throw new Error('Player not in game');
    }
    if (action.type !== 'CHOOSE') {
      throw new Error(`Invalid action type: ${action.type}`);
    }
    if (action.choice !== 'A' && action.choice !== 'B') {
      throw new Error('Choice must be A or B');
    }
    return true;
  }

  applyAction(
    state: ThisOrThatState,
    playerId: string,
    action: ThisOrThatAction
  ): GameActionResult<ThisOrThatState> {
    try {
      this.validateAction(state, playerId, action);
    } catch (err: any) {
      return { success: false, state, error: err.message };
    }

    const nextSelections = { ...state.selections, [playerId]: action.choice };
    const allSelected = state.players.every((pid) => nextSelections[pid] !== null);

    if (allSelected) {
      const nextScores = { ...state.matchScores };

      // Calculate consensus / agreement
      let countA = 0;
      let countB = 0;
      for (const pid of state.players) {
        if (nextSelections[pid] === 'A') countA++;
        if (nextSelections[pid] === 'B') countB++;
      }

      const majority = countA > countB ? 'A' : countB > countA ? 'B' : null;
      for (const pid of state.players) {
        if (majority && nextSelections[pid] === majority) {
          nextScores[pid] = (nextScores[pid] || 0) + 1;
        } else if (!majority) {
          // Tie bonus
          nextScores[pid] = (nextScores[pid] || 0) + 1;
        }
      }

      if (state.round >= state.totalRounds) {
        let bestScore = -1;
        let winner: string | null = null;
        for (const pid of state.players) {
          if (nextScores[pid] > bestScore) {
            bestScore = nextScores[pid];
            winner = pid;
          }
        }

        const matchPct = Math.min(100, Math.round((bestScore / state.totalRounds) * 100));

        const nextState: ThisOrThatState = {
          ...state,
          selections: nextSelections,
          matchScores: nextScores,
          winnerId: winner,
          turnExpiresAt: 0,
        };

        return {
          success: true,
          state: nextState,
          events: [
            {
              type: 'GAME_OVER',
              data: {
                winnerId: winner,
                matchPercentage: matchPct,
                scores: nextScores,
              },
            },
          ],
        };
      }

      const nextRound = state.round + 1;
      const available = ThisOrThatEngine.PAIRS.filter((p) => p.id !== state.currentPair.id);
      const nextPair =
        available[Math.floor(Math.random() * available.length)] ||
        ThisOrThatEngine.PAIRS[nextRound % ThisOrThatEngine.PAIRS.length];

      const resetSelections: Record<string, 'A' | 'B' | null> = {};
      for (const pid of state.players) {
        resetSelections[pid] = null;
      }

      const nextState: ThisOrThatState = {
        ...state,
        currentPair: nextPair,
        selections: resetSelections,
        matchScores: nextScores,
        round: nextRound,
        turnExpiresAt: Date.now() + THIS_OR_THAT_ROUND_MS,
      };

      return {
        success: true,
        state: nextState,
        events: [
          {
            type: 'ROUND_FINISHED',
            data: { round: state.round, majority, scores: nextScores, nextRound },
          },
        ],
      };
    }

    return {
      success: true,
      state: {
        ...state,
        selections: nextSelections,
      },
      events: [
        {
          type: 'CHOICE_MADE',
          data: { playerId, choice: action.choice },
        },
      ],
    };
  }

  checkWinner(state: ThisOrThatState): ThisOrThatResult | null {
    if (!state.winnerId) return null;
    const bestScore = state.matchScores[state.winnerId] || 0;
    const matchPct = Math.min(100, Math.round((bestScore / state.totalRounds) * 100));

    return {
      winnerId: state.winnerId,
      matchPercentage: matchPct,
    };
  }
}
