import crypto from 'crypto';
import { GameEngine, GamePlayerMeta } from '../game.definition';
import { GameRegistry } from '../game.registry';
import {
  GameActionResult,
  GameDefinition,
  BackgammonAction,
  BackgammonResult,
  BackgammonState,
} from '../../../../shared/game-types';

export const BACKGAMMON_TURN_DURATION_MS = 30000;

export class BackgammonEngine
  implements GameEngine<BackgammonState, BackgammonAction, BackgammonResult>
{
  readonly definition: GameDefinition;

  constructor() {
    this.definition = GameRegistry.getGame('BACKGAMMON') || {
      id: 'BACKGAMMON',
      name: 'Backgammon',
      category: 'BOARD',
      minPlayers: 2,
      maxPlayers: 2,
      defaultPlayers: 2,
      supportsSpectators: true,
      turnTimeSeconds: 30,
      description: '24 points/triangles, dual dice rolls, bar captures, and bearing off.',
      iconName: 'dice',
    };
  }

  initialize(players: GamePlayerMeta[], settings?: any): BackgammonState {
    if (!players || players.length < 2) {
      throw new Error('Backgammon requires exactly 2 players');
    }

    const p1 = players[0];
    const p2 = players[1];

    const points = Array.from({ length: 24 }, () => ({ white: 0, black: 0 }));

    // Standard starting setup (15 checkers each)
    points[23].white = 2;
    points[12].white = 5;
    points[7].white = 3;
    points[5].white = 5;

    points[0].black = 2;
    points[11].black = 5;
    points[16].black = 3;
    points[18].black = 5;

    return {
      points,
      bar: { white: 0, black: 0 },
      borneOff: { white: 0, black: 0 },
      dice: [3, 5],
      diceRemaining: [3, 5],
      turnColor: 'WHITE',
      turnPlayerId: p1.userId,
      players: {
        WHITE: p1.userId,
        BLACK: p2.userId,
      },
      winnerId: null,
      turnExpiresAt: Date.now() + BACKGAMMON_TURN_DURATION_MS,
    };
  }

  validateAction(
    state: BackgammonState,
    playerId: string,
    action: BackgammonAction
  ): boolean {
    if (state.winnerId) {
      throw new Error('Match is already finished');
    }
    if (state.turnPlayerId !== playerId) {
      throw new Error('Not your turn to play');
    }

    if (action.type === 'ROLL_DICE') {
      if (state.diceRemaining.length > 0) {
        throw new Error('Current dice moves must be completed first');
      }
      return true;
    }

    if (action.type === 'MOVE_CHECKER') {
      if (!action.die || !state.diceRemaining.includes(action.die)) {
        throw new Error('Selected die is not available');
      }

      const color = state.turnColor;
      const isWhite = color === 'WHITE';

      const checkersOnBar = isWhite ? state.bar.white : state.bar.black;
      if (checkersOnBar > 0 && action.from !== 'BAR') {
        throw new Error('Must re-enter checker from the bar first');
      }

      if (action.from === 'BAR') {
        const targetPt = isWhite ? 24 - action.die : action.die - 1;
        const opponentCheckers = isWhite
          ? state.points[targetPt].black
          : state.points[targetPt].white;
        if (opponentCheckers >= 2) {
          throw new Error('Target point is blocked by opponent');
        }
        return true;
      }

      const fromPt = action.from;
      if (typeof fromPt !== 'number' || fromPt < 0 || fromPt > 23) {
        throw new Error('Invalid source point');
      }

      const hasChecker = isWhite
        ? state.points[fromPt].white > 0
        : state.points[fromPt].black > 0;
      if (!hasChecker) {
        throw new Error('No checkers on source point');
      }

      const targetPt = isWhite ? fromPt - action.die : fromPt + action.die;

      if (isWhite && targetPt < 0) {
        const outsideHome =
          state.points.slice(6).some((pt) => pt.white > 0) || state.bar.white > 0;
        if (outsideHome) {
          throw new Error('Cannot bear off until all checkers are in home');
        }
        return true;
      }

      if (!isWhite && targetPt > 23) {
        const outsideHome =
          state.points.slice(0, 18).some((pt) => pt.black > 0) || state.bar.black > 0;
        if (outsideHome) {
          throw new Error('Cannot bear off until all checkers are in home');
        }
        return true;
      }

      const opponentCheckers = isWhite
        ? state.points[targetPt].black
        : state.points[targetPt].white;
      if (opponentCheckers >= 2) {
        throw new Error('Target point is blocked by opponent');
      }

      return true;
    }

    throw new Error('Invalid action type');
  }

  applyAction(
    state: BackgammonState,
    playerId: string,
    action: BackgammonAction
  ): GameActionResult<BackgammonState> {
    this.validateAction(state, playerId, action);
    const isWhite = state.turnColor === 'WHITE';

    if (action.type === 'ROLL_DICE') {
      const d1 = crypto.randomInt(1, 7);
      const d2 = crypto.randomInt(1, 7);
      const isDoubles = d1 === d2;
      const dice = [d1, d2];
      const diceRemaining = isDoubles ? [d1, d1, d1, d1] : [d1, d2];

      const nextState: BackgammonState = {
        ...state,
        dice,
        diceRemaining,
        turnExpiresAt: Date.now() + BACKGAMMON_TURN_DURATION_MS,
      };

      return { success: true, state: nextState };
    }

    if (action.type === 'MOVE_CHECKER') {
      const points = state.points.map((p) => ({ ...p }));
      const bar = { ...state.bar };
      const borneOff = { ...state.borneOff };
      const die = action.die!;

      const diceRemaining = [...state.diceRemaining];
      const dieIdx = diceRemaining.indexOf(die);
      diceRemaining.splice(dieIdx, 1);

      if (action.from === 'BAR') {
        if (isWhite) {
          bar.white -= 1;
          const targetPt = 24 - die;
          if (points[targetPt].black === 1) {
            points[targetPt].black = 0;
            bar.black += 1;
          }
          points[targetPt].white += 1;
        } else {
          bar.black -= 1;
          const targetPt = die - 1;
          if (points[targetPt].white === 1) {
            points[targetPt].white = 0;
            bar.white += 1;
          }
          points[targetPt].black += 1;
        }
      } else {
        const fromPt = action.from as number;
        if (isWhite) {
          points[fromPt].white -= 1;
          const targetPt = fromPt - die;
          if (targetPt < 0) {
            borneOff.white += 1;
          } else {
            if (points[targetPt].black === 1) {
              points[targetPt].black = 0;
              bar.black += 1;
            }
            points[targetPt].white += 1;
          }
        } else {
          points[fromPt].black -= 1;
          const targetPt = fromPt + die;
          if (targetPt > 23) {
            borneOff.black += 1;
          } else {
            if (points[targetPt].white === 1) {
              points[targetPt].white = 0;
              bar.white += 1;
            }
            points[targetPt].black += 1;
          }
        }
      }

      let winnerId: string | null = null;
      if (borneOff.white >= 15) {
        winnerId = state.players.WHITE;
      } else if (borneOff.black >= 15) {
        winnerId = state.players.BLACK;
      }

      let nextTurnPlayerId = state.turnPlayerId;
      let nextTurnColor = state.turnColor;
      let nextDice = state.dice;
      let nextDiceRemaining = diceRemaining;

      if (diceRemaining.length === 0 && !winnerId) {
        nextTurnColor = isWhite ? 'BLACK' : 'WHITE';
        nextTurnPlayerId = isWhite ? state.players.BLACK : state.players.WHITE;
        const d1 = crypto.randomInt(1, 7);
        const d2 = crypto.randomInt(1, 7);
        nextDice = [d1, d2];
        nextDiceRemaining = d1 === d2 ? [d1, d1, d1, d1] : [d1, d2];
      }

      const nextState: BackgammonState = {
        ...state,
        points,
        bar,
        borneOff,
        dice: nextDice,
        diceRemaining: nextDiceRemaining,
        turnColor: nextTurnColor,
        turnPlayerId: nextTurnPlayerId,
        winnerId,
        turnExpiresAt: winnerId ? 0 : Date.now() + BACKGAMMON_TURN_DURATION_MS,
      };

      return {
        success: true,
        state: nextState,
        events: [
          {
            type: 'backgammon:checker_moved',
            data: {
              playerId,
              from: action.from,
              die,
              winnerId,
            },
          },
        ],
      };
    }

    return { success: true, state };
  }

  checkWinner(state: BackgammonState): BackgammonResult | null {
    if (state.winnerId) {
      const isGammon =
        (state.winnerId === state.players.WHITE && state.borneOff.black === 0) ||
        (state.winnerId === state.players.BLACK && state.borneOff.white === 0);
      return {
        winnerId: state.winnerId,
        isGammon,
        isBackgammon: false,
      };
    }
    return null;
  }

  handleTurnTimeout(state: BackgammonState): GameActionResult<BackgammonState> {
    const isWhite = state.turnColor === 'WHITE';
    const nextTurnColor = isWhite ? 'BLACK' : 'WHITE';
    const nextTurnPlayerId = isWhite ? state.players.BLACK : state.players.WHITE;
    const d1 = crypto.randomInt(1, 7);
    const d2 = crypto.randomInt(1, 7);

    const nextState: BackgammonState = {
      ...state,
      dice: [d1, d2],
      diceRemaining: d1 === d2 ? [d1, d1, d1, d1] : [d1, d2],
      turnColor: nextTurnColor,
      turnPlayerId: nextTurnPlayerId,
      turnExpiresAt: Date.now() + BACKGAMMON_TURN_DURATION_MS,
    };

    return { success: true, state: nextState };
  }
}
