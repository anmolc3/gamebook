import { GameEngine, GamePlayerMeta } from '../game.definition';
import { GameRegistry } from '../game.registry';
import {
  AirHockeyAction,
  AirHockeyResult,
  AirHockeyState,
  GameActionResult,
  GameDefinition,
} from '../../../../shared/game-types';

export const AIR_HOCKEY_TURN_DURATION_MS = 15000;
export const TABLE_WIDTH = 800;
export const TABLE_HEIGHT = 1200;
export const GOAL_LEFT = 240;
export const GOAL_RIGHT = 560;

export class AirHockeyEngine
  implements GameEngine<AirHockeyState, AirHockeyAction, AirHockeyResult>
{
  readonly definition: GameDefinition;

  constructor() {
    this.definition = GameRegistry.getGame('AIR_HOCKEY') || {
      id: 'AIR_HOCKEY',
      name: 'Air Hockey',
      category: 'CASUAL',
      minPlayers: 2,
      maxPlayers: 2,
      defaultPlayers: 2,
      supportsSpectators: true,
      turnTimeSeconds: 15,
      description: 'High-speed mallet striking and puck defense table duel.',
      iconName: 'target',
    };
  }

  initialize(players: GamePlayerMeta[], settings?: any): AirHockeyState {
    if (!players || players.length < 2) {
      throw new Error('Air Hockey requires 2 players');
    }

    const player1 = players[0].userId;
    const player2 = players[1].userId;
    const targetScore = settings?.targetScore || 7;

    return {
      puck: {
        x: 400,
        y: 600,
        vx: 0,
        vy: 0,
      },
      mallets: {
        player1: { x: 400, y: 1050 }, // bottom half
        player2: { x: 400, y: 150 },  // top half
      },
      scores: {
        player1: 0,
        player2: 0,
      },
      targetScore,
      players: [player1, player2],
      turnPlayerId: player1,
      lastScorerId: null,
      winnerId: null,
      turnExpiresAt: Date.now() + AIR_HOCKEY_TURN_DURATION_MS,
    };
  }

  validateAction(
    state: AirHockeyState,
    playerId: string,
    action: AirHockeyAction
  ): boolean {
    if (state.winnerId) return false;
    if (!state.players.includes(playerId)) return false;

    const isP1 = state.players[0] === playerId;

    // Bounds checking for mallet position
    if (action.x < 50 || action.x > TABLE_WIDTH - 50) return false;

    if (isP1) {
      // Bottom player (half is 600..1150)
      if (action.y < 600 || action.y > TABLE_HEIGHT - 50) return false;
    } else {
      // Top player (half is 50..600)
      if (action.y < 50 || action.y > 600) return false;
    }

    return true;
  }

  applyAction(
    state: AirHockeyState,
    playerId: string,
    action: AirHockeyAction
  ): GameActionResult<AirHockeyState> {
    if (!this.validateAction(state, playerId, action)) {
      return { state, success: false, error: 'Invalid air hockey action' };
    }

    const nextState: AirHockeyState = JSON.parse(JSON.stringify(state));
    const isP1 = nextState.players[0] === playerId;
    const opponentId = isP1 ? nextState.players[1] : nextState.players[0];

    // Update mallet coordinates
    if (isP1) {
      nextState.mallets.player1 = { x: action.x, y: action.y };
    } else {
      nextState.mallets.player2 = { x: action.x, y: action.y };
    }

    if (action.type === 'STRIKE_PUCK') {
      const power = action.strikePower ?? 60;
      const angle = action.strikeAngle ?? (isP1 ? -90 : 90);
      const rad = (angle * Math.PI) / 180;

      // Impart velocity to puck
      const speed = (power / 100) * 800;
      let newVx = Math.cos(rad) * speed;
      let newVy = Math.sin(rad) * speed;

      let currX = nextState.puck.x;
      let currY = nextState.puck.y;
      let goalScoredBy: string | null = null;

      // Simulate trajectory over physics sub-steps
      const steps = 15;
      const dt = 0.1;
      for (let s = 0; s < steps; s++) {
        currX += newVx * dt;
        currY += newVy * dt;

        // Table side cushion bounces
        if (currX < 40) {
          currX = 40;
          newVx = -newVx;
        } else if (currX > TABLE_WIDTH - 40) {
          currX = TABLE_WIDTH - 40;
          newVx = -newVx;
        }

        // Check for goal
        if (currY <= 40 && currX >= GOAL_LEFT && currX <= GOAL_RIGHT) {
          // Player 1 scored into Top Goal!
          goalScoredBy = nextState.players[0];
          break;
        } else if (currY >= TABLE_HEIGHT - 40 && currX >= GOAL_LEFT && currX <= GOAL_RIGHT) {
          // Player 2 scored into Bottom Goal!
          goalScoredBy = nextState.players[1];
          break;
        }

        // Cushion bounce on back walls outside goal
        if (currY < 40) {
          currY = 40;
          newVy = -newVy;
        } else if (currY > TABLE_HEIGHT - 40) {
          currY = TABLE_HEIGHT - 40;
          newVy = -newVy;
        }
      }

      if (goalScoredBy) {
        nextState.lastScorerId = goalScoredBy;
        if (goalScoredBy === nextState.players[0]) {
          nextState.scores.player1 += 1;
        } else {
          nextState.scores.player2 += 1;
        }

        // Check victory
        if (nextState.scores.player1 >= nextState.targetScore) {
          nextState.winnerId = nextState.players[0];
        } else if (nextState.scores.player2 >= nextState.targetScore) {
          nextState.winnerId = nextState.players[1];
        }

        // Reset puck to center
        nextState.puck = { x: 400, y: 600, vx: 0, vy: 0 };
        // Conceding player serves next
        nextState.turnPlayerId = goalScoredBy === nextState.players[0] ? nextState.players[1] : nextState.players[0];
      } else {
        nextState.puck = {
          x: Math.round(currX),
          y: Math.round(currY),
          vx: Math.round(newVx),
          vy: Math.round(newVy),
        };

        // Turn moves to opponent
        nextState.turnPlayerId = opponentId;
      }
    }

    nextState.turnExpiresAt = Date.now() + AIR_HOCKEY_TURN_DURATION_MS;
    return { state: nextState, success: true };
  }

  checkWinner(state: AirHockeyState): AirHockeyResult | null {
    if (!state.winnerId) return null;
    return {
      winnerId: state.winnerId,
      finalScores: { ...state.scores },
    };
  }

  handleTurnTimeout(state: AirHockeyState): GameActionResult<AirHockeyState> {
    const isP1 = state.players[0] === state.turnPlayerId;
    return this.applyAction(state, state.turnPlayerId, {
      type: 'STRIKE_PUCK',
      x: isP1 ? 400 : 400,
      y: isP1 ? 1000 : 200,
      strikeAngle: isP1 ? -90 : 90,
      strikePower: 50,
    });
  }
}
