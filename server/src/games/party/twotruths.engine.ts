import { GameEngine, GamePlayerMeta } from '../game.definition';
import { GameRegistry } from '../game.registry';
import {
  GameActionResult,
  GameDefinition,
  TwoTruthsAndALieAction,
  TwoTruthsAndALieResult,
  TwoTruthsAndALieState,
} from '../../../../shared/game-types';

export const TWO_TRUTHS_ROUND_MS = 60000;

interface PresetPack {
  statements: string[];
  lieIndex: number;
}

export class TwoTruthsAndALieEngine
  implements GameEngine<TwoTruthsAndALieState, TwoTruthsAndALieAction, TwoTruthsAndALieResult>
{
  readonly definition: GameDefinition;

  private static PRESETS: PresetPack[] = [
    {
      statements: [
        'I have met a world-famous celebrity in an elevator.',
        'I can juggle four oranges without dropping them.',
        'I have never broken any bones in my body.',
      ],
      lieIndex: 1,
    },
    {
      statements: [
        'I have lived in three different countries.',
        'I was born on a leap day (Feb 29).',
        'I have a black belt in martial arts.',
      ],
      lieIndex: 0,
    },
    {
      statements: [
        'I once won a regional speed-typing contest.',
        'I have eaten fried scorpion at a street food market.',
        'I have never watched the Titanic movie.',
      ],
      lieIndex: 1,
    },
  ];

  constructor() {
    this.definition = GameRegistry.getGame('TWO_TRUTHS_AND_A_LIE') || {
      id: 'TWO_TRUTHS_AND_A_LIE',
      name: '2 Truths and a Lie',
      category: 'PARTY',
      minPlayers: 2,
      maxPlayers: 6,
      defaultPlayers: 4,
      supportsSpectators: true,
      turnTimeSeconds: 45,
      description: 'Submit three statements; friends vote which one is false.',
      iconName: 'eye',
    };
  }

  initialize(players: GamePlayerMeta[], settings?: any): TwoTruthsAndALieState {
    if (!players || players.length < 2) {
      throw new Error('2 Truths and a Lie requires at least 2 players');
    }

    const playerIds = players.map((p) => p.userId);
    const scores: Record<string, number> = {};
    const votes: Record<string, number | null> = {};

    for (const pid of playerIds) {
      scores[pid] = 0;
      votes[pid] = null;
    }

    const preset =
      settings?.preset ||
      TwoTruthsAndALieEngine.PRESETS[
        Math.floor(Math.random() * TwoTruthsAndALieEngine.PRESETS.length)
      ];

    return {
      players: playerIds,
      speakerId: playerIds[0],
      statements: preset.statements,
      lieIndex: preset.lieIndex,
      votes,
      scores,
      isRevealed: false,
      winnerId: null,
      turnExpiresAt: Date.now() + TWO_TRUTHS_ROUND_MS,
    };
  }

  validateAction(
    state: TwoTruthsAndALieState,
    playerId: string,
    action: TwoTruthsAndALieAction
  ): boolean {
    if (state.winnerId || state.isRevealed) {
      throw new Error('Round already finished');
    }
    if (!state.players.includes(playerId)) {
      throw new Error('Player not in game');
    }

    if (action.type === 'SUBMIT_STATEMENTS') {
      if (playerId !== state.speakerId) {
        throw new Error('Only the speaker can submit custom statements');
      }
      if (!action.statements || action.statements.length !== 3) {
        throw new Error('Must provide exactly 3 statements');
      }
      if (
        action.lieIndex === undefined ||
        action.lieIndex < 0 ||
        action.lieIndex > 2
      ) {
        throw new Error('Lie index must be 0, 1, or 2');
      }
    } else if (action.type === 'VOTE_LIE') {
      if (playerId === state.speakerId) {
        throw new Error('Speaker cannot vote on their own statements');
      }
      if (
        action.statementIndex === undefined ||
        action.statementIndex < 0 ||
        action.statementIndex > 2
      ) {
        throw new Error('Statement index must be 0, 1, or 2');
      }
    } else {
      throw new Error(`Invalid action type: ${(action as any).type}`);
    }

    return true;
  }

  applyAction(
    state: TwoTruthsAndALieState,
    playerId: string,
    action: TwoTruthsAndALieAction
  ): GameActionResult<TwoTruthsAndALieState> {
    try {
      this.validateAction(state, playerId, action);
    } catch (err: any) {
      return { success: false, state, error: err.message };
    }

    if (action.type === 'SUBMIT_STATEMENTS') {
      return {
        success: true,
        state: {
          ...state,
          statements: [...action.statements!],
          lieIndex: action.lieIndex!,
        },
        events: [
          {
            type: 'STATEMENTS_UPDATED',
            data: { speakerId: playerId, statements: action.statements },
          },
        ],
      };
    }

    if (action.type === 'VOTE_LIE') {
      const nextVotes = { ...state.votes, [playerId]: action.statementIndex! };
      const nonSpeakers = state.players.filter((p) => p !== state.speakerId);
      const allVoted = nonSpeakers.every((p) => nextVotes[p] !== null);

      if (allVoted) {
        const nextScores = { ...state.scores };
        let fooledCount = 0;

        for (const p of nonSpeakers) {
          const vote = nextVotes[p];
          if (vote === state.lieIndex) {
            nextScores[p] = (nextScores[p] || 0) + 15;
          } else {
            fooledCount++;
          }
        }

        // Speaker gets bonus for each fooled player
        nextScores[state.speakerId] =
          (nextScores[state.speakerId] || 0) + fooledCount * 10;

        let bestScore = -1;
        let winner: string | null = null;
        for (const pid of state.players) {
          if (nextScores[pid] > bestScore) {
            bestScore = nextScores[pid];
            winner = pid;
          }
        }

        const nextState: TwoTruthsAndALieState = {
          ...state,
          votes: nextVotes,
          scores: nextScores,
          isRevealed: true,
          winnerId: winner,
          turnExpiresAt: 0,
        };

        return {
          success: true,
          state: nextState,
          events: [
            {
              type: 'LIE_REVEALED',
              data: {
                lieIndex: state.lieIndex,
                scores: nextScores,
                winnerId: winner,
              },
            },
          ],
        };
      }

      return {
        success: true,
        state: {
          ...state,
          votes: nextVotes,
        },
        events: [
          {
            type: 'VOTE_CAST',
            data: { voterId: playerId, statementIndex: action.statementIndex },
          },
        ],
      };
    }

    return { success: true, state };
  }

  checkWinner(state: TwoTruthsAndALieState): TwoTruthsAndALieResult | null {
    if (!state.winnerId || !state.isRevealed) return null;
    return {
      winnerId: state.winnerId,
      scores: state.scores,
    };
  }
}
