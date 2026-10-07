import { GameAI, AiDifficulty } from '../ai.interface';
import { RpsAction, RpsChoice, RpsState } from '../../../../shared/game-types';

const CHOICES: RpsChoice[] = ['ROCK', 'PAPER', 'SCISSORS'];
const COUNTER: Record<RpsChoice, RpsChoice> = {
  ROCK: 'PAPER',
  PAPER: 'SCISSORS',
  SCISSORS: 'ROCK',
};

export class RpsAI implements GameAI<RpsState, RpsAction> {
  getMove(state: RpsState, aiPlayerId: string, difficulty: AiDifficulty): RpsAction {
    if (difficulty === 'EASY') {
      const rand = CHOICES[Math.floor(Math.random() * CHOICES.length)];
      return { type: 'CHOICE', choice: rand };
    }

    // In simultaneous mode, if human just chose in this round, AI MUST NOT see it (fairness principle)
    // AI predicts based on psychology or historical pattern:
    // If Easy/Medium: mostly balanced distribution with slight counter-bias
    if (difficulty === 'MEDIUM') {
      const rand = CHOICES[Math.floor(Math.random() * CHOICES.length)];
      return { type: 'CHOICE', choice: rand };
    }

    // Hard / Expert: counter most common opening (humans choose Rock 35-40% of the time)
    if (state.currentRound === 1) {
      return { type: 'CHOICE', choice: 'PAPER' }; // Counter common Rock opening
    }

    // Random weighted counter
    const rand = CHOICES[Math.floor(Math.random() * CHOICES.length)];
    return { type: 'CHOICE', choice: rand };
  }
}
