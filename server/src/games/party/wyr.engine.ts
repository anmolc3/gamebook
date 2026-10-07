import { GameEngine, GamePlayerMeta } from '../game.definition';
import { GameRegistry } from '../game.registry';
import {
  GameActionResult,
  GameDefinition,
  WouldYouRatherAction,
  WouldYouRatherDilemma,
  WouldYouRatherResult,
  WouldYouRatherState,
} from '../../../../shared/game-types';

export const WYR_ROUND_DURATION_MS = 25000;

export class WouldYouRatherEngine
  implements GameEngine<WouldYouRatherState, WouldYouRatherAction, WouldYouRatherResult>
{
  readonly definition: GameDefinition;

  private static DILEMMAS: WouldYouRatherDilemma[] = [
    { id: 'wyr_1', optionA: 'Be able to fly at 20 mph', optionB: 'Be able to teleport once per day', globalVotesA: 42, globalVotesB: 58 },
    { id: 'wyr_2', optionA: 'Live 100 years in the past', optionB: 'Live 100 years in the future', globalVotesA: 31, globalVotesB: 69 },
    { id: 'wyr_3', optionA: 'Always speak your mind instantly', optionB: 'Never be able to speak again', globalVotesA: 82, globalVotesB: 18 },
    { id: 'wyr_4', optionA: 'Have unlimited free sushi', optionB: 'Have unlimited free gourmet pizza', globalVotesA: 48, globalVotesB: 52 },
    { id: 'wyr_5', optionA: 'Explore the deepest depths of the ocean', optionB: 'Explore outer space beyond our solar system', globalVotesA: 26, globalVotesB: 74 },
    { id: 'wyr_6', optionA: 'Have a photographic memory', optionB: 'Be able to forget anything you choose', globalVotesA: 71, globalVotesB: 29 },
    { id: 'wyr_7', optionA: 'Be a famous hero who is misunderstood', optionB: 'Be a secret villain who saves the world', globalVotesA: 38, globalVotesB: 62 },
    { id: 'wyr_8', optionA: 'Never have to sleep again', optionB: 'Never have to work again', globalVotesA: 22, globalVotesB: 78 },
    { id: 'wyr_9', optionA: 'Speak every human language fluently', optionB: 'Communicate effortlessly with animals', globalVotesA: 64, globalVotesB: 36 },
    { id: 'wyr_10', optionA: 'Live on a high-tech orbital space station', optionB: 'Live in a cozy luxury cottage in the woods', globalVotesA: 45, globalVotesB: 55 },
    { id: 'wyr_11', optionA: 'Always have the best Wi-Fi everywhere', optionB: 'Have battery that never runs out on any device', globalVotesA: 53, globalVotesB: 47 },
    { id: 'wyr_12', optionA: 'Rewind time by 10 minutes', optionB: 'Fast forward time by 1 day', globalVotesA: 89, globalVotesB: 11 },
  ];

  constructor() {
    this.definition = GameRegistry.getGame('WOULD_YOU_RATHER') || {
      id: 'WOULD_YOU_RATHER',
      name: 'Would You Rather?',
      category: 'PARTY',
      minPlayers: 2,
      maxPlayers: 8,
      defaultPlayers: 4,
      supportsSpectators: true,
      turnTimeSeconds: 20,
      description: 'Pick between two dilemmas and compare choices with friends.',
      iconName: 'users',
    };
  }

  initialize(players: GamePlayerMeta[], settings?: any): WouldYouRatherState {
    if (!players || players.length < 2) {
      throw new Error('Would You Rather requires at least 2 players');
    }

    const playerIds = players.map((p) => p.userId);
    const votes: Record<string, 'A' | 'B' | null> = {};
    const scores: Record<string, number> = {};

    for (const pid of playerIds) {
      votes[pid] = null;
      scores[pid] = 0;
    }

    const firstDilemma =
      settings?.dilemma ||
      WouldYouRatherEngine.DILEMMAS[
        Math.floor(Math.random() * WouldYouRatherEngine.DILEMMAS.length)
      ];

    return {
      players: playerIds,
      currentRound: 1,
      totalRounds: settings?.totalRounds || 5,
      currentDilemma: firstDilemma,
      votes,
      scores,
      winnerId: null,
      turnExpiresAt: Date.now() + WYR_ROUND_DURATION_MS,
    };
  }

  validateAction(
    state: WouldYouRatherState,
    playerId: string,
    action: WouldYouRatherAction
  ): boolean {
    if (state.winnerId) {
      throw new Error('Game already concluded');
    }
    if (!state.players.includes(playerId)) {
      throw new Error('Player not in this game');
    }
    if (action.type !== 'VOTE') {
      throw new Error(`Invalid action type: ${action.type}`);
    }
    if (action.choice !== 'A' && action.choice !== 'B') {
      throw new Error('Choice must be A or B');
    }
    return true;
  }

  applyAction(
    state: WouldYouRatherState,
    playerId: string,
    action: WouldYouRatherAction
  ): GameActionResult<WouldYouRatherState> {
    try {
      this.validateAction(state, playerId, action);
    } catch (err: any) {
      return { success: false, state, error: err.message };
    }

    const nextVotes = { ...state.votes, [playerId]: action.choice };
    const nextScores = { ...state.scores };

    // Check if all players have voted
    const allVoted = state.players.every((pid) => nextVotes[pid] !== null);

    if (allVoted) {
      // Calculate majority
      let countA = 0;
      let countB = 0;
      for (const pid of state.players) {
        if (nextVotes[pid] === 'A') countA++;
        if (nextVotes[pid] === 'B') countB++;
      }

      const majorityChoice = countA > countB ? 'A' : countB > countA ? 'B' : null;

      // Award points for voting with majority
      for (const pid of state.players) {
        if (majorityChoice && nextVotes[pid] === majorityChoice) {
          nextScores[pid] = (nextScores[pid] || 0) + 10;
        } else if (!majorityChoice) {
          // Tie bonus
          nextScores[pid] = (nextScores[pid] || 0) + 5;
        }
      }

      // Check if final round reached
      if (state.currentRound >= state.totalRounds) {
        let bestScore = -1;
        let winner: string | null = null;
        for (const pid of state.players) {
          if (nextScores[pid] > bestScore) {
            bestScore = nextScores[pid];
            winner = pid;
          }
        }

        const nextState: WouldYouRatherState = {
          ...state,
          votes: nextVotes,
          scores: nextScores,
          winnerId: winner,
          turnExpiresAt: 0,
        };

        return {
          success: true,
          state: nextState,
          events: [
            {
              type: 'GAME_OVER',
              data: { winnerId: winner, finalScores: nextScores },
            },
          ],
        };
      } else {
        // Next round
        const usedIds = new Set([state.currentDilemma.id]);
        const available = WouldYouRatherEngine.DILEMMAS.filter((d) => !usedIds.has(d.id));
        const nextDilemma =
          available.length > 0
            ? available[Math.floor(Math.random() * available.length)]
            : WouldYouRatherEngine.DILEMMAS[
                (state.currentRound + 1) % WouldYouRatherEngine.DILEMMAS.length
              ];

        const resetVotes: Record<string, 'A' | 'B' | null> = {};
        for (const pid of state.players) {
          resetVotes[pid] = null;
        }

        const nextState: WouldYouRatherState = {
          ...state,
          currentRound: state.currentRound + 1,
          currentDilemma: nextDilemma,
          votes: resetVotes,
          scores: nextScores,
          turnExpiresAt: Date.now() + WYR_ROUND_DURATION_MS,
        };

        return {
          success: true,
          state: nextState,
          events: [
            {
              type: 'ROUND_COMPLETED',
              data: {
                completedRound: state.currentRound,
                majorityChoice,
                scores: nextScores,
              },
            },
          ],
        };
      }
    }

    return {
      success: true,
      state: {
        ...state,
        votes: nextVotes,
      },
      events: [
        {
          type: 'PLAYER_VOTED',
          data: { playerId, choice: action.choice },
        },
      ],
    };
  }

  checkWinner(state: WouldYouRatherState): WouldYouRatherResult | null {
    if (!state.winnerId) return null;
    return {
      winnerId: state.winnerId,
      finalScores: state.scores,
    };
  }
}
