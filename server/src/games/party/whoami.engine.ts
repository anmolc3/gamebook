import { GameEngine, GamePlayerMeta } from '../game.definition';
import { GameRegistry } from '../game.registry';
import {
  GameActionResult,
  GameDefinition,
  WhoAmIAction,
  WhoAmIQuestion,
  WhoAmIResult,
  WhoAmIState,
} from '../../../../shared/game-types';

export const WHO_AM_I_TURN_DURATION_MS = 40000;

export class WhoAmIEngine
  implements GameEngine<WhoAmIState, WhoAmIAction, WhoAmIResult>
{
  readonly definition: GameDefinition;

  private static IDENTITIES = [
    'Albert Einstein',
    'Cleopatra',
    'Leonardo da Vinci',
    'Sherlock Holmes',
    'Marilyn Monroe',
    'Harry Potter',
    'Marie Curie',
    'Julius Caesar',
    'William Shakespeare',
    'Abraham Lincoln',
  ];

  constructor() {
    this.definition = GameRegistry.getGame('WHO_AM_I') || {
      id: 'WHO_AM_I',
      name: 'Who Am I? (Sticky Note)',
      category: 'PARTY',
      minPlayers: 3,
      maxPlayers: 8,
      defaultPlayers: 4,
      supportsSpectators: true,
      turnTimeSeconds: 30,
      description: 'Ask Yes/No questions to deduce the celebrity on your forehead.',
      iconName: 'users',
    };
  }

  initialize(players: GamePlayerMeta[], settings?: any): WhoAmIState {
    if (!players || players.length < 2) {
      throw new Error('Who Am I requires at least 2 players');
    }

    const playerIds = players.map((p) => p.userId);
    const targetIdentity: Record<string, string> = {};
    const solved: Record<string, boolean> = {};
    const scores: Record<string, number> = {};

    const shuffled = [...WhoAmIEngine.IDENTITIES].sort(() => Math.random() - 0.5);

    playerIds.forEach((pid, index) => {
      targetIdentity[pid] = shuffled[index % shuffled.length];
      solved[pid] = false;
      scores[pid] = 0;
    });

    return {
      players: playerIds,
      targetIdentity,
      turnPlayerId: playerIds[0],
      questionHistory: [],
      solved,
      scores,
      winnerId: null,
      turnExpiresAt: Date.now() + WHO_AM_I_TURN_DURATION_MS,
    };
  }

  validateAction(
    state: WhoAmIState,
    playerId: string,
    action: WhoAmIAction
  ): boolean {
    if (state.winnerId) {
      throw new Error('Game already finished');
    }
    if (!state.players.includes(playerId)) {
      throw new Error('Player not in game');
    }

    if (action.type === 'ASK_QUESTION') {
      if (playerId !== state.turnPlayerId) {
        throw new Error('Only active turn player can ask question');
      }
      if (!action.question || action.question.trim().length === 0) {
        throw new Error('Question cannot be empty');
      }
    } else if (action.type === 'ANSWER_QUESTION') {
      if (playerId === state.turnPlayerId) {
        throw new Error('Cannot answer your own question');
      }
      if (state.questionHistory.length === 0) {
        throw new Error('No question to answer');
      }
      if (typeof action.yes !== 'boolean') {
        throw new Error('Answer must be boolean yes/no');
      }
    } else if (action.type === 'GUESS_IDENTITY') {
      if (playerId !== state.turnPlayerId) {
        throw new Error('Only active turn player can guess identity');
      }
      if (!action.identity || action.identity.trim().length === 0) {
        throw new Error('Identity guess cannot be empty');
      }
    } else {
      throw new Error(`Invalid action type: ${(action as any).type}`);
    }

    return true;
  }

  applyAction(
    state: WhoAmIState,
    playerId: string,
    action: WhoAmIAction
  ): GameActionResult<WhoAmIState> {
    try {
      this.validateAction(state, playerId, action);
    } catch (err: any) {
      return { success: false, state, error: err.message };
    }

    if (action.type === 'ASK_QUESTION') {
      const newQuestion: WhoAmIQuestion = {
        askerId: playerId,
        question: action.question!.trim(),
        answers: {},
      };

      const nextHistory = [...state.questionHistory, newQuestion];

      return {
        success: true,
        state: {
          ...state,
          questionHistory: nextHistory,
        },
        events: [
          {
            type: 'QUESTION_ASKED',
            data: { askerId: playerId, question: action.question },
          },
        ],
      };
    }

    if (action.type === 'ANSWER_QUESTION') {
      const nextHistory = [...state.questionHistory];
      const lastQ = { ...nextHistory[nextHistory.length - 1] };
      lastQ.answers = { ...lastQ.answers, [playerId]: !!action.yes };
      nextHistory[nextHistory.length - 1] = lastQ;

      // Pass turn to next unsolved player
      const currentIndex = state.players.indexOf(state.turnPlayerId);
      let nextIndex = (currentIndex + 1) % state.players.length;
      let attempts = 0;
      while (state.solved[state.players[nextIndex]] && attempts < state.players.length) {
        nextIndex = (nextIndex + 1) % state.players.length;
        attempts++;
      }
      const nextPlayerId = state.players[nextIndex];

      return {
        success: true,
        state: {
          ...state,
          turnPlayerId: nextPlayerId,
          questionHistory: nextHistory,
          turnExpiresAt: Date.now() + WHO_AM_I_TURN_DURATION_MS,
        },
        events: [
          {
            type: 'QUESTION_ANSWERED',
            data: { responderId: playerId, yes: action.yes, nextPlayerId },
          },
        ],
      };
    }

    if (action.type === 'GUESS_IDENTITY') {
      const cleanGuess = action.identity!.trim().toLowerCase();
      const actual = state.targetIdentity[playerId]?.toLowerCase();
      const isCorrect = cleanGuess === actual;

      const nextScores = { ...state.scores };
      const nextSolved = { ...state.solved };

      if (isCorrect) {
        nextScores[playerId] = (nextScores[playerId] || 0) + 30;
        nextSolved[playerId] = true;
      }

      // Check if all players solved or this player won
      const allSolved = state.players.every((pid) => nextSolved[pid]);

      if (isCorrect && (allSolved || state.players.length <= 2)) {
        return {
          success: true,
          state: {
            ...state,
            solved: nextSolved,
            scores: nextScores,
            winnerId: playerId,
            turnExpiresAt: 0,
          },
          events: [
            {
              type: 'IDENTITY_SOLVED',
              data: { playerId, identity: state.targetIdentity[playerId], winnerId: playerId },
            },
            {
              type: 'GAME_OVER',
              data: { winnerId: playerId, scores: nextScores },
            },
          ],
        };
      }

      // Rotate turn
      const currentIndex = state.players.indexOf(state.turnPlayerId);
      let nextIndex = (currentIndex + 1) % state.players.length;
      let attempts = 0;
      while (nextSolved[state.players[nextIndex]] && attempts < state.players.length) {
        nextIndex = (nextIndex + 1) % state.players.length;
        attempts++;
      }
      const nextPlayerId = state.players[nextIndex];

      return {
        success: true,
        state: {
          ...state,
          solved: nextSolved,
          scores: nextScores,
          turnPlayerId: nextPlayerId,
          turnExpiresAt: Date.now() + WHO_AM_I_TURN_DURATION_MS,
        },
        events: [
          {
            type: isCorrect ? 'IDENTITY_SOLVED' : 'INCORRECT_IDENTITY_GUESS',
            data: { playerId, isCorrect, nextPlayerId },
          },
        ],
      };
    }

    return { success: true, state };
  }

  checkWinner(state: WhoAmIState): WhoAmIResult | null {
    if (!state.winnerId) return null;
    return {
      winnerId: state.winnerId,
      scores: state.scores,
    };
  }
}
