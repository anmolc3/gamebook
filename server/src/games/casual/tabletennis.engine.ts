import { GameEngine, GamePlayerMeta } from '../game.definition';
import { GameRegistry } from '../game.registry';
import {
  GameActionResult,
  GameDefinition,
  TableTennisAction,
  TableTennisResult,
  TableTennisState,
} from '../../../../shared/game-types';

export const TT_TURN_DURATION_MS = 15000;

export class TableTennisEngine
  implements GameEngine<TableTennisState, TableTennisAction, TableTennisResult>
{
  readonly definition: GameDefinition;

  constructor() {
    this.definition = GameRegistry.getGame('TABLE_TENNIS') || {
      id: 'TABLE_TENNIS',
      name: 'Table Tennis Duel',
      category: 'CASUAL',
      minPlayers: 2,
      maxPlayers: 2,
      defaultPlayers: 2,
      supportsSpectators: true,
      turnTimeSeconds: 15,
      description: 'Fast-paced paddle rally with spin and speed controls.',
      iconName: 'target',
    };
  }

  initialize(players: GamePlayerMeta[], settings?: any): TableTennisState {
    if (!players || players.length < 2) {
      throw new Error('Table Tennis requires 2 players');
    }

    const player1 = players[0].userId;
    const player2 = players[1].userId;
    const targetScore = settings?.targetScore || 11;

    return {
      scores: { player1: 0, player2: 0 },
      targetScore,
      players: [player1, player2],
      serverPlayerId: player1,
      turnPlayerId: player1,
      rallyCount: 0,
      ball: {
        x: 0,
        y: 20,
        z: 25,
        vx: 0,
        vy: 10,
        tableSide: 'PLAYER1',
      },
      serviceCount: 0,
      isDeuce: false,
      winnerId: null,
      turnExpiresAt: Date.now() + TT_TURN_DURATION_MS,
    };
  }

  validateAction(
    state: TableTennisState,
    playerId: string,
    action: TableTennisAction
  ): boolean {
    if (state.winnerId) return false;
    if (state.turnPlayerId !== playerId) return false;

    if (action.type === 'SERVE' && state.rallyCount > 0) return false;
    if (action.type === 'RETURN' && state.rallyCount === 0) return false;

    return (
      action.targetX >= -100 &&
      action.targetX <= 100 &&
      action.targetY >= 0 &&
      action.targetY <= 100 &&
      action.power >= 10 &&
      action.power <= 100
    );
  }

  applyAction(
    state: TableTennisState,
    playerId: string,
    action: TableTennisAction
  ): GameActionResult<TableTennisState> {
    if (!this.validateAction(state, playerId, action)) {
      return { state, success: false, error: 'Invalid table tennis action' };
    }

    const nextState: TableTennisState = JSON.parse(JSON.stringify(state));
    const isP1 = nextState.players[0] === playerId;
    const opponentId = isP1 ? nextState.players[1] : nextState.players[0];

    // Determine shot outcome
    // Shot lands in court if targetX is within -75..75 and targetY is within 10..90
    const inBounds =
      Math.abs(action.targetX) <= 80 &&
      action.targetY >= 10 &&
      action.targetY <= 90;

    if (!inBounds) {
      // Out of bounds! Opponent wins point
      return this.awardPointToPlayer(nextState, opponentId);
    }

    // Shot succeeded! Increment rally count
    nextState.rallyCount += 1;
    nextState.ball = {
      x: action.targetX,
      y: action.targetY,
      z: 15,
      vx: action.targetX * 0.1,
      vy: isP1 ? 25 : -25,
      tableSide: isP1 ? 'PLAYER2' : 'PLAYER1',
    };

    // Pass turn to opponent to return
    nextState.turnPlayerId = opponentId;
    nextState.turnExpiresAt = Date.now() + TT_TURN_DURATION_MS;

    return { state: nextState, success: true };
  }

  private awardPointToPlayer(
    state: TableTennisState,
    scoringPlayerId: string
  ): GameActionResult<TableTennisState> {
    const isP1 = state.players[0] === scoringPlayerId;
    if (isP1) {
      state.scores.player1 += 1;
    } else {
      state.scores.player2 += 1;
    }

    const p1 = state.scores.player1;
    const p2 = state.scores.player2;

    // Check deuce (10-10 or higher with equal scores)
    if (p1 >= 10 && p2 >= 10) {
      state.isDeuce = true;
    }

    // Check match victory (>= 11 points and 2-point lead)
    if (p1 >= state.targetScore && p1 - p2 >= 2) {
      state.winnerId = state.players[0];
      return { state, success: true };
    } else if (p2 >= state.targetScore && p2 - p1 >= 2) {
      state.winnerId = state.players[1];
      return { state, success: true };
    }

    // Reset rally for next serve
    state.rallyCount = 0;
    state.serviceCount += 1;

    // Service rotation:
    // Under regular play: switch server every 2 points
    // Under deuce: switch server every 1 point
    const pointsTotal = p1 + p2;
    const switchInterval = state.isDeuce ? 1 : 2;
    const serverCycle = Math.floor(pointsTotal / switchInterval);
    const nextServer =
      serverCycle % 2 === 0 ? state.players[0] : state.players[1];

    state.serverPlayerId = nextServer;
    state.turnPlayerId = nextServer;
    state.ball = {
      x: 0,
      y: nextServer === state.players[0] ? 20 : 180,
      z: 25,
      vx: 0,
      vy: nextServer === state.players[0] ? 10 : -10,
      tableSide: nextServer === state.players[0] ? 'PLAYER1' : 'PLAYER2',
    };

    state.turnExpiresAt = Date.now() + TT_TURN_DURATION_MS;
    return { state, success: true };
  }

  checkWinner(state: TableTennisState): TableTennisResult | null {
    if (!state.winnerId) return null;
    return {
      winnerId: state.winnerId,
      finalScore: { ...state.scores },
      longestRally: state.rallyCount,
    };
  }

  handleTurnTimeout(state: TableTennisState): GameActionResult<TableTennisState> {
    // If player times out, point is awarded to the opponent
    const opponent = state.players.find((p) => p !== state.turnPlayerId)!;
    const nextState: TableTennisState = JSON.parse(JSON.stringify(state));
    return this.awardPointToPlayer(nextState, opponent);
  }
}
