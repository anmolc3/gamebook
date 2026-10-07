import { GameEngine, GamePlayerMeta } from '../game.definition';
import { GameRegistry } from '../game.registry';
import {
  GameActionResult,
  GameDefinition,
  RpsAction,
  RpsChoice,
  RpsResult,
  RpsState,
} from '../../../../shared/game-types';

export const RPS_TURN_DURATION_MS = 10000;

export class RpsEngine implements GameEngine<RpsState, RpsAction, RpsResult> {
  readonly definition: GameDefinition;

  constructor() {
    this.definition = GameRegistry.getGame('ROCK_PAPER_SCISSORS') || {
      id: 'ROCK_PAPER_SCISSORS',
      name: 'Rock Paper Scissors',
      category: 'COMPETITIVE',
      minPlayers: 2,
      maxPlayers: 2,
      defaultPlayers: 2,
      supportsSpectators: true,
      turnTimeSeconds: 10,
      description: 'Best of 3 or 5 simultaneous hand sign duel.',
      iconName: 'gamepad',
    };
  }

  initialize(players: GamePlayerMeta[], settings?: any): RpsState {
    if (!players || players.length < 2) {
      throw new Error('Rock Paper Scissors requires 2 players');
    }

    const p1 = players[0].userId;
    const p2 = players[1].userId;
    const targetWins = settings?.targetWins || 3;

    return {
      players: [p1, p2],
      currentRound: 1,
      targetWins,
      choices: { [p1]: null, [p2]: null },
      roundScores: { [p1]: 0, [p2]: 0 },
      lastRoundWinner: null,
      winnerId: null,
      turnExpiresAt: Date.now() + RPS_TURN_DURATION_MS,
    };
  }

  validateAction(state: RpsState, playerId: string, action: RpsAction): boolean {
    if (state.winnerId) {
      throw new Error('Game already finished');
    }

    if (!state.players.includes(playerId)) {
      throw new Error('Player not in match');
    }

    if (action.type !== 'CHOICE') {
      throw new Error(`Unsupported action type: ${action.type}`);
    }

    if (!['ROCK', 'PAPER', 'SCISSORS'].includes(action.choice)) {
      throw new Error('Invalid choice; must be ROCK, PAPER, or SCISSORS');
    }

    return true;
  }

  applyAction(state: RpsState, playerId: string, action: RpsAction): GameActionResult<RpsState> {
    try {
      this.validateAction(state, playerId, action);
    } catch (err: any) {
      return { success: false, state, error: err.message };
    }

    const nextState: RpsState = {
      ...state,
      choices: { ...state.choices, [playerId]: action.choice },
      roundScores: { ...state.roundScores },
    };

    const [p1, p2] = nextState.players;

    // Check if both players have submitted choices
    if (nextState.choices[p1] !== null && nextState.choices[p2] !== null) {
      const c1 = nextState.choices[p1]!;
      const c2 = nextState.choices[p2]!;

      let roundWinner: string | 'TIE' = 'TIE';

      if (c1 === c2) {
        roundWinner = 'TIE';
      } else if (
        (c1 === 'ROCK' && c2 === 'SCISSORS') ||
        (c1 === 'SCISSORS' && c2 === 'PAPER') ||
        (c1 === 'PAPER' && c2 === 'ROCK')
      ) {
        roundWinner = p1;
        nextState.roundScores[p1] += 1;
      } else {
        roundWinner = p2;
        nextState.roundScores[p2] += 1;
      }

      nextState.lastRoundWinner = roundWinner;

      // Check match victory
      if (nextState.roundScores[p1] >= nextState.targetWins) {
        nextState.winnerId = p1;
      } else if (nextState.roundScores[p2] >= nextState.targetWins) {
        nextState.winnerId = p2;
      } else {
        // Next round reset choices
        nextState.currentRound += 1;
        nextState.choices[p1] = null;
        nextState.choices[p2] = null;
        nextState.turnExpiresAt = Date.now() + RPS_TURN_DURATION_MS;
      }
    }

    return { success: true, state: nextState };
  }

  checkWinner(state: RpsState): RpsResult | null {
    if (!state.winnerId) return null;
    return {
      winnerId: state.winnerId,
      scores: state.roundScores,
    };
  }

  handleTurnTimeout(state: RpsState): GameActionResult<RpsState> {
    const choices: RpsChoice[] = ['ROCK', 'PAPER', 'SCISSORS'];
    const randomChoice = choices[Math.floor(Math.random() * choices.length)];

    const unpicked = state.players.find((uid) => state.choices[uid] === null);
    if (!unpicked) return { success: true, state };

    return this.applyAction(state, unpicked, { type: 'CHOICE', choice: randomChoice });
  }
}
