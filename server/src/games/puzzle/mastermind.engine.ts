import { GameEngine, GamePlayerMeta } from '../game.definition';
import { GameRegistry } from '../game.registry';
import {
  GameActionResult,
  GameDefinition,
  MastermindAction,
  MastermindGuess,
  MastermindResult,
  MastermindState,
} from '../../../../shared/game-types';

export const MASTERMIND_TURN_DURATION_MS = 45000;

export class MastermindEngine
  implements GameEngine<MastermindState, MastermindAction, MastermindResult>
{
  readonly definition: GameDefinition;

  private static COLORS = ['RED', 'BLUE', 'GREEN', 'YELLOW', 'ORANGE', 'PURPLE'];

  constructor() {
    this.definition = GameRegistry.getGame('MASTERMIND') || {
      id: 'MASTERMIND',
      name: 'Code Breaker Mastermind',
      category: 'PUZZLE',
      minPlayers: 2,
      maxPlayers: 2,
      defaultPlayers: 2,
      supportsSpectators: true,
      turnTimeSeconds: 45,
      description: 'Deduce the secret color peg sequence with exact/partial clues.',
      iconName: 'eye',
    };
  }

  private generateCode(): string[] {
    const code: string[] = [];
    for (let i = 0; i < 4; i++) {
      code.push(MastermindEngine.COLORS[Math.floor(Math.random() * MastermindEngine.COLORS.length)]);
    }
    return code;
  }

  initialize(players: GamePlayerMeta[], settings?: any): MastermindState {
    if (!players || players.length < 2) {
      throw new Error('Mastermind requires 2 players');
    }

    const p1 = players[0].userId;
    const p2 = players[1].userId;
    const secretCode = settings?.secretCode || this.generateCode();

    return {
      secretCode,
      players: [p1, p2],
      guesses: { [p1]: [], [p2]: [] },
      maxAttempts: 8,
      winnerId: null,
      turnExpiresAt: Date.now() + MASTERMIND_TURN_DURATION_MS,
    };
  }

  validateAction(state: MastermindState, playerId: string, action: MastermindAction): boolean {
    if (state.winnerId) {
      throw new Error('Match already concluded');
    }

    if (!state.players.includes(playerId)) {
      throw new Error('Player not in match');
    }

    if (action.type !== 'SUBMIT_GUESS') {
      throw new Error(`Unsupported action type: ${action.type}`);
    }

    if (!action.colors || action.colors.length !== 4) {
      throw new Error('Guess must consist of exactly 4 color pegs');
    }

    if (!action.colors.every((c) => MastermindEngine.COLORS.includes(c))) {
      throw new Error('Invalid color peg');
    }

    return true;
  }

  private evaluatePegs(guess: string[], secret: string[]): { exactHits: number; colorHits: number } {
    let exactHits = 0;
    let colorHits = 0;

    const secretCopy = [...secret];
    const guessCopy = [...guess];

    // First pass: exact matches
    for (let i = 0; i < 4; i++) {
      if (guessCopy[i] === secretCopy[i]) {
        exactHits++;
        secretCopy[i] = '#';
        guessCopy[i] = '$';
      }
    }

    // Second pass: color matches
    for (let i = 0; i < 4; i++) {
      if (guessCopy[i] !== '$') {
        const foundIdx = secretCopy.indexOf(guessCopy[i]);
        if (foundIdx !== -1) {
          colorHits++;
          secretCopy[foundIdx] = '#';
        }
      }
    }

    return { exactHits, colorHits };
  }

  applyAction(state: MastermindState, playerId: string, action: MastermindAction): GameActionResult<MastermindState> {
    try {
      this.validateAction(state, playerId, action);
    } catch (err: any) {
      return { success: false, state, error: err.message };
    }

    const nextState: MastermindState = {
      ...state,
      guesses: {
        [state.players[0]]: [...state.guesses[state.players[0]]],
        [state.players[1]]: [...state.guesses[state.players[1]]],
      },
    };

    const { exactHits, colorHits } = this.evaluatePegs(action.colors, nextState.secretCode);
    const guessObj: MastermindGuess = {
      guess: action.colors,
      exactHits,
      colorHits,
    };

    nextState.guesses[playerId].push(guessObj);

    if (exactHits === 4) {
      nextState.winnerId = playerId;
      return { success: true, state: nextState };
    }

    return { success: true, state: nextState };
  }

  checkWinner(state: MastermindState): MastermindResult | null {
    if (!state.winnerId) return null;
    const attempts: Record<string, number> = {};
    state.players.forEach((uid) => {
      attempts[uid] = state.guesses[uid].length;
    });

    return {
      winnerId: state.winnerId,
      secretCode: state.secretCode,
      attempts,
    };
  }

  handleTurnTimeout(state: MastermindState): GameActionResult<MastermindState> {
    return this.applyAction(state, state.players[0], {
      type: 'SUBMIT_GUESS',
      colors: ['RED', 'RED', 'RED', 'RED'],
    });
  }
}
