import { GameEngine, GamePlayerMeta } from '../game.definition';
import { GameRegistry } from '../game.registry';
import {
  GameActionResult,
  GameDefinition,
  MiniGolfAction,
  MiniGolfHole,
  MiniGolfPlayerState,
  MiniGolfResult,
  MiniGolfState,
} from '../../../../shared/game-types';

export const GOLF_TURN_DURATION_MS = 25000;
export const CUP_RADIUS = 35;

export const DEFAULT_HOLES: MiniGolfHole[] = [
  {
    holeNumber: 1,
    par: 3,
    tee: { x: 100, y: 250 },
    cup: { x: 850, y: 250 },
    obstacles: [
      { x: 450, y: 150, width: 40, height: 100, type: 'WALL' },
      { x: 450, y: 350, width: 40, height: 100, type: 'WALL' },
    ],
  },
  {
    holeNumber: 2,
    par: 4,
    tee: { x: 100, y: 120 },
    cup: { x: 850, y: 380 },
    obstacles: [
      { x: 400, y: 200, width: 150, height: 120, type: 'WATER' },
      { x: 650, y: 100, width: 30, height: 180, type: 'WALL' },
    ],
  },
  {
    holeNumber: 3,
    par: 3,
    tee: { x: 100, y: 250 },
    cup: { x: 880, y: 250 },
    obstacles: [
      { x: 350, y: 100, width: 80, height: 300, type: 'SAND' },
      { x: 600, y: 180, width: 40, height: 140, type: 'WALL' },
    ],
  },
];

export class MiniGolfEngine
  implements GameEngine<MiniGolfState, MiniGolfAction, MiniGolfResult>
{
  readonly definition: GameDefinition;

  constructor() {
    this.definition = GameRegistry.getGame('MINI_GOLF') || {
      id: 'MINI_GOLF',
      name: 'Mini Golf Battle',
      category: 'CASUAL',
      minPlayers: 2,
      maxPlayers: 4,
      defaultPlayers: 2,
      supportsSpectators: true,
      turnTimeSeconds: 25,
      description: 'Putt through obstacles and sink the ball in the fewest strokes.',
      iconName: 'flag',
    };
  }

  initialize(players: GamePlayerMeta[], settings?: any): MiniGolfState {
    if (!players || players.length < 2) {
      throw new Error('Mini Golf requires at least 2 players');
    }

    const holes = settings?.holes || DEFAULT_HOLES;
    const firstHole = holes[0];

    const playerStates: MiniGolfPlayerState[] = players.map((p) => ({
      userId: p.userId,
      ballPosition: { ...firstHole.tee },
      currentHoleStrokes: 0,
      totalStrokes: 0,
      holeScores: [],
      isHoleCompleted: false,
    }));

    return {
      currentHoleIndex: 0,
      holes,
      players: playerStates,
      turnPlayerId: playerStates[0].userId,
      isRoundOver: false,
      winnerId: null,
      turnExpiresAt: Date.now() + GOLF_TURN_DURATION_MS,
    };
  }

  validateAction(
    state: MiniGolfState,
    playerId: string,
    action: MiniGolfAction
  ): boolean {
    if (state.winnerId || state.isRoundOver) return false;
    if (state.turnPlayerId !== playerId) return false;

    if (action.type === 'PUTT') {
      const power = action.power ?? 50;
      return power >= 1 && power <= 100 && action.angle >= 0 && action.angle <= 360;
    }

    return false;
  }

  applyAction(
    state: MiniGolfState,
    playerId: string,
    action: MiniGolfAction
  ): GameActionResult<MiniGolfState> {
    if (!this.validateAction(state, playerId, action)) {
      return { state, success: false, error: 'Invalid mini golf putt' };
    }

    const nextState: MiniGolfState = JSON.parse(JSON.stringify(state));
    const currentHole = nextState.holes[nextState.currentHoleIndex];
    const player = nextState.players.find((p) => p.userId === playerId);

    if (!player) {
      return { state, success: false, error: 'Player not found' };
    }

    player.currentHoleStrokes += 1;
    player.totalStrokes += 1;

    // Simulate ball movement
    const rad = (action.angle * Math.PI) / 180;
    const speed = (action.power / 100) * 450; // max travel distance
    let targetX = player.ballPosition.x + Math.cos(rad) * speed;
    let targetY = player.ballPosition.y + Math.sin(rad) * speed;

    // Boundary clamping (0..1000 x 0..500)
    if (targetX < 30) targetX = 30;
    if (targetX > 970) targetX = 970;
    if (targetY < 30) targetY = 30;
    if (targetY > 470) targetY = 470;

    // Check obstacle interactions
    let hitWater = false;
    for (const obs of currentHole.obstacles) {
      if (
        targetX >= obs.x &&
        targetX <= obs.x + obs.width &&
        targetY >= obs.y &&
        targetY <= obs.y + obs.height
      ) {
        if (obs.type === 'WATER') {
          hitWater = true;
          break;
        } else if (obs.type === 'SAND') {
          // Sand bunker dampens travel
          targetX = obs.x + obs.width / 2;
          targetY = obs.y + obs.height / 2;
        } else if (obs.type === 'WALL') {
          // Bounces back
          targetX = player.ballPosition.x;
          targetY = player.ballPosition.y;
        }
      }
    }

    if (hitWater) {
      // Water penalty: stroke count penalized, ball stays at previous position
      player.currentHoleStrokes += 1;
      player.totalStrokes += 1;
    } else {
      player.ballPosition = { x: Math.round(targetX), y: Math.round(targetY) };
    }

    // Check if ball sunk into cup
    const distToCup = Math.hypot(
      player.ballPosition.x - currentHole.cup.x,
      player.ballPosition.y - currentHole.cup.y
    );

    if (distToCup <= CUP_RADIUS) {
      player.ballPosition = { ...currentHole.cup };
      player.isHoleCompleted = true;
      player.holeScores.push(player.currentHoleStrokes);
    }

    // Check if all players completed the current hole
    const allCompletedHole = nextState.players.every((p) => p.isHoleCompleted);

    if (allCompletedHole) {
      if (nextState.currentHoleIndex + 1 < nextState.holes.length) {
        // Advance to next hole
        nextState.currentHoleIndex += 1;
        const nextHole = nextState.holes[nextState.currentHoleIndex];
        nextState.players.forEach((p) => {
          p.ballPosition = { ...nextHole.tee };
          p.currentHoleStrokes = 0;
          p.isHoleCompleted = false;
        });
        nextState.turnPlayerId = nextState.players[0].userId;
      } else {
        // Tournament completed!
        nextState.isRoundOver = true;
        // Lowest score wins
        const sorted = [...nextState.players].sort(
          (a, b) => a.totalStrokes - b.totalStrokes
        );
        nextState.winnerId = sorted[0].userId;
      }
    } else {
      // Advance to next player who hasn't completed the hole
      const currentIdx = nextState.players.findIndex((p) => p.userId === playerId);
      let nextIdx = (currentIdx + 1) % nextState.players.length;
      while (nextState.players[nextIdx].isHoleCompleted) {
        nextIdx = (nextIdx + 1) % nextState.players.length;
      }
      nextState.turnPlayerId = nextState.players[nextIdx].userId;
    }

    nextState.turnExpiresAt = Date.now() + GOLF_TURN_DURATION_MS;
    return { state: nextState, success: true };
  }

  checkWinner(state: MiniGolfState): MiniGolfResult | null {
    if (!state.isRoundOver && !state.winnerId) return null;

    const sorted = [...state.players].sort((a, b) => a.totalStrokes - b.totalStrokes);
    const rankings = sorted.map((p, idx) => ({
      userId: p.userId,
      totalStrokes: p.totalStrokes,
      rank: idx + 1,
    }));

    return {
      winnerId: sorted[0]?.userId || null,
      rankings,
    };
  }

  handleTurnTimeout(state: MiniGolfState): GameActionResult<MiniGolfState> {
    // Timeout auto-putts gently toward the cup
    const currentHole = state.holes[state.currentHoleIndex];
    const player = state.players.find((p) => p.userId === state.turnPlayerId);
    let angle = 0;
    if (player) {
      const dx = currentHole.cup.x - player.ballPosition.x;
      const dy = currentHole.cup.y - player.ballPosition.y;
      angle = (Math.atan2(dy, dx) * 180) / Math.PI;
      if (angle < 0) angle += 360;
    }
    return this.applyAction(state, state.turnPlayerId, {
      type: 'PUTT',
      angle: Math.round(angle),
      power: 25,
    });
  }
}
