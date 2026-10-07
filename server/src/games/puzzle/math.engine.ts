import { GameEngine, GamePlayerMeta } from '../game.definition';
import { GameRegistry } from '../game.registry';
import {
  GameActionResult,
  GameDefinition,
  MathBattleAction,
  MathBattleResult,
  MathBattleState,
  MathEquation,
} from '../../../../shared/game-types';

export const MATH_BATTLE_ROUND_DURATION_MS = 10000;

export class MathBattleEngine
  implements GameEngine<MathBattleState, MathBattleAction, MathBattleResult>
{
  readonly definition: GameDefinition;

  constructor() {
    this.definition = GameRegistry.getGame('MATH_BATTLE') || {
      id: 'MATH_BATTLE',
      name: 'Speed Math Duel',
      category: 'COMPETITIVE',
      minPlayers: 2,
      maxPlayers: 4,
      defaultPlayers: 2,
      supportsSpectators: true,
      turnTimeSeconds: 10,
      description: 'Solve arithmetic equations faster than your opponent.',
      iconName: 'target',
    };
  }

  private generateEquation(): MathEquation {
    const ops: ('+' | '-' | '×')[] = ['+', '-', '×'];
    const operator = ops[Math.floor(Math.random() * ops.length)];

    let num1: number;
    let num2: number;
    let answer: number;

    if (operator === '+') {
      num1 = Math.floor(Math.random() * 40) + 10;
      num2 = Math.floor(Math.random() * 40) + 5;
      answer = num1 + num2;
    } else if (operator === '-') {
      num1 = Math.floor(Math.random() * 50) + 20;
      num2 = Math.floor(Math.random() * 20) + 1;
      answer = num1 - num2;
    } else {
      num1 = Math.floor(Math.random() * 12) + 2;
      num2 = Math.floor(Math.random() * 12) + 2;
      answer = num1 * num2;
    }

    const options = new Set<number>([answer]);
    while (options.size < 4) {
      const delta = (Math.floor(Math.random() * 5) + 1) * (Math.random() < 0.5 ? 1 : -1);
      const fake = Math.max(1, answer + delta);
      options.add(fake);
    }

    return {
      num1,
      num2,
      operator,
      answer,
      options: Array.from(options).sort(() => Math.random() - 0.5),
    };
  }

  initialize(players: GamePlayerMeta[], settings?: any): MathBattleState {
    if (!players || players.length < 2) {
      throw new Error('Speed Math requires 2 players');
    }

    const p1 = players[0].userId;
    const p2 = players[1].userId;
    const totalRounds = settings?.totalRounds || 5;

    return {
      players: [p1, p2],
      currentRound: 1,
      totalRounds,
      equation: this.generateEquation(),
      scores: { [p1]: 0, [p2]: 0 },
      answered: { [p1]: null, [p2]: null },
      winnerId: null,
      turnExpiresAt: Date.now() + MATH_BATTLE_ROUND_DURATION_MS,
    };
  }

  validateAction(state: MathBattleState, playerId: string, action: MathBattleAction): boolean {
    if (state.winnerId) {
      throw new Error('Game already finished');
    }

    if (!state.players.includes(playerId)) {
      throw new Error('Player not in match');
    }

    if (action.type !== 'SUBMIT_ANSWER') {
      throw new Error(`Unsupported action type: ${action.type}`);
    }

    if (typeof action.answer !== 'number') {
      throw new Error('Answer must be a number');
    }

    return true;
  }

  applyAction(state: MathBattleState, playerId: string, action: MathBattleAction): GameActionResult<MathBattleState> {
    try {
      this.validateAction(state, playerId, action);
    } catch (err: any) {
      return { success: false, state, error: err.message };
    }

    const nextState: MathBattleState = {
      ...state,
      scores: { ...state.scores },
      answered: { ...state.answered, [playerId]: action.answer },
    };

    if (action.answer === nextState.equation.answer) {
      nextState.scores[playerId] = (nextState.scores[playerId] || 0) + 10;
    }

    const allDone = nextState.players.every((uid) => nextState.answered[uid] !== null);

    if (allDone) {
      if (nextState.currentRound >= nextState.totalRounds) {
        const [p1, p2] = nextState.players;
        if (nextState.scores[p1] > nextState.scores[p2]) {
          nextState.winnerId = p1;
        } else if (nextState.scores[p2] > nextState.scores[p1]) {
          nextState.winnerId = p2;
        } else {
          nextState.winnerId = p1; // Tie-breaker P1
        }
      } else {
        nextState.currentRound += 1;
        nextState.equation = this.generateEquation();
        nextState.players.forEach((uid) => {
          nextState.answered[uid] = null;
        });
        nextState.turnExpiresAt = Date.now() + MATH_BATTLE_ROUND_DURATION_MS;
      }
    }

    return { success: true, state: nextState };
  }

  checkWinner(state: MathBattleState): MathBattleResult | null {
    if (!state.winnerId) return null;
    return {
      winnerId: state.winnerId,
      scores: state.scores,
    };
  }

  handleTurnTimeout(state: MathBattleState): GameActionResult<MathBattleState> {
    const unrec = state.players.find((uid) => state.answered[uid] === null);
    if (!unrec) return { success: true, state };
    return this.applyAction(state, unrec, { type: 'SUBMIT_ANSWER', answer: -999 });
  }
}
