import { GameEngine, GamePlayerMeta } from '../game.definition';
import { GameRegistry } from '../game.registry';
import {
  GameActionResult,
  GameDefinition,
  QuizBattleAction,
  QuizBattleResult,
  QuizBattleState,
  QuizQuestion,
} from '../../../../shared/game-types';

export const QUIZ_QUESTION_TIMEOUT_MS = 12000;

export class QuizBattleEngine
  implements GameEngine<QuizBattleState, QuizBattleAction, QuizBattleResult>
{
  readonly definition: GameDefinition;

  private static QUESTION_BANK: QuizQuestion[] = [
    {
      question: 'What is the capital city of Australia?',
      options: ['Sydney', 'Melbourne', 'Canberra', 'Brisbane'],
      correctIndex: 2,
      category: 'GEOGRAPHY',
    },
    {
      question: 'Which chemical element has the symbol Au?',
      options: ['Silver', 'Gold', 'Copper', 'Iron'],
      correctIndex: 1,
      category: 'SCIENCE',
    },
    {
      question: 'In which year did the Apollo 11 moon landing occur?',
      options: ['1965', '1969', '1971', '1975'],
      correctIndex: 1,
      category: 'HISTORY',
    },
    {
      question: 'What is the largest internal organ in the human body?',
      options: ['Heart', 'Lungs', 'Liver', 'Kidneys'],
      correctIndex: 2,
      category: 'BIOLOGY',
    },
    {
      question: 'Which planet is known as the Red Planet?',
      options: ['Venus', 'Mars', 'Jupiter', 'Saturn'],
      correctIndex: 1,
      category: 'ASTRONOMY',
    },
  ];

  constructor() {
    this.definition = GameRegistry.getGame('QUIZ_BATTLE') || {
      id: 'QUIZ_BATTLE',
      name: 'Quiz Battle Arena',
      category: 'CASUAL',
      minPlayers: 2,
      maxPlayers: 6,
      defaultPlayers: 4,
      supportsSpectators: true,
      turnTimeSeconds: 12,
      description: 'Rapid-fire multiple choice trivia across general knowledge.',
      iconName: 'bell',
    };
  }

  initialize(players: GamePlayerMeta[]): QuizBattleState {
    if (!players || players.length < 2) {
      throw new Error('Quiz Battle requires at least 2 players');
    }

    const playerIds = players.map((p) => p.userId);
    const scores: Record<string, number> = {};
    const playerAnswers: Record<string, number | null> = {};

    playerIds.forEach((uid) => {
      scores[uid] = 0;
      playerAnswers[uid] = null;
    });

    return {
      currentQuestionIndex: 0,
      questions: QuizBattleEngine.QUESTION_BANK,
      players: playerIds,
      scores,
      playerAnswers,
      winnerId: null,
      turnExpiresAt: Date.now() + QUIZ_QUESTION_TIMEOUT_MS,
    };
  }

  validateAction(state: QuizBattleState, playerId: string, action: QuizBattleAction): boolean {
    if (state.winnerId) {
      throw new Error('Quiz already completed');
    }

    if (!state.players.includes(playerId)) {
      throw new Error('Player not in match');
    }

    if (action.type !== 'SELECT_OPTION') {
      throw new Error(`Unsupported action type: ${action.type}`);
    }

    if (action.optionIndex < 0 || action.optionIndex > 3) {
      throw new Error('Option index must be between 0 and 3');
    }

    if (state.playerAnswers[playerId] !== null) {
      throw new Error('Player already answered this question');
    }

    return true;
  }

  applyAction(state: QuizBattleState, playerId: string, action: QuizBattleAction): GameActionResult<QuizBattleState> {
    try {
      this.validateAction(state, playerId, action);
    } catch (err: any) {
      return { success: false, state, error: err.message };
    }

    const nextState: QuizBattleState = {
      ...state,
      scores: { ...state.scores },
      playerAnswers: { ...state.playerAnswers, [playerId]: action.optionIndex },
    };

    const currentQ = nextState.questions[nextState.currentQuestionIndex];
    if (action.optionIndex === currentQ.correctIndex) {
      nextState.scores[playerId] = (nextState.scores[playerId] || 0) + 10;
    }

    // Check if all players answered
    const allAnswered = nextState.players.every((uid) => nextState.playerAnswers[uid] !== null);

    if (allAnswered) {
      if (nextState.currentQuestionIndex >= nextState.questions.length - 1) {
        // Quiz complete
        let topScore = -1;
        let winner = nextState.players[0];
        nextState.players.forEach((uid) => {
          if (nextState.scores[uid] > topScore) {
            topScore = nextState.scores[uid];
            winner = uid;
          }
        });
        nextState.winnerId = winner;
      } else {
        // Next question
        nextState.currentQuestionIndex += 1;
        nextState.players.forEach((uid) => {
          nextState.playerAnswers[uid] = null;
        });
        nextState.turnExpiresAt = Date.now() + QUIZ_QUESTION_TIMEOUT_MS;
      }
    }

    return { success: true, state: nextState };
  }

  checkWinner(state: QuizBattleState): QuizBattleResult | null {
    if (!state.winnerId) return null;
    return {
      winnerId: state.winnerId,
      finalScores: state.scores,
    };
  }

  handleTurnTimeout(state: QuizBattleState): GameActionResult<QuizBattleState> {
    const unansw = state.players.find((uid) => state.playerAnswers[uid] === null);
    if (!unansw) return { success: true, state };
    return this.applyAction(state, unansw, { type: 'SELECT_OPTION', optionIndex: 0 });
  }
}
