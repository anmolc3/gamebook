import { GameEngine, GamePlayerMeta } from '../game.definition';
import { GameRegistry } from '../game.registry';
import {
  GameActionResult,
  GameDefinition,
  Pool8BallAction,
  Pool8BallResult,
  Pool8BallState,
  PoolBall,
  PoolBallType,
  PoolPlayerState,
  PoolSuit,
} from '../../../../shared/game-types';

export const POOL_TURN_DURATION_MS = 30000;

export class Pool8BallEngine
  implements GameEngine<Pool8BallState, Pool8BallAction, Pool8BallResult>
{
  readonly definition: GameDefinition;

  constructor() {
    this.definition = GameRegistry.getGame('POOL_8_BALL') || {
      id: 'POOL_8_BALL',
      name: '8 Ball Pool Arena',
      category: 'CASUAL',
      minPlayers: 2,
      maxPlayers: 2,
      defaultPlayers: 2,
      supportsSpectators: true,
      turnTimeSeconds: 30,
      description: 'Pot your solids or stripes and sink the 8 ball to win.',
      iconName: 'target',
    };
  }

  initialize(players: GamePlayerMeta[], settings?: any): Pool8BallState {
    if (!players || players.length < 2) {
      throw new Error('8 Ball Pool requires 2 players');
    }

    const player1 = players[0].userId;
    const player2 = players[1].userId;
    const firstPlayerId = settings?.firstPlayerId || player1;

    // Standard 16 balls
    const balls: PoolBall[] = [];

    // Ball 0: Cue ball (white) in the kitchen
    balls.push({
      id: 0,
      type: 'CUE',
      x: 250,
      y: 250,
      isPocketed: false,
    });

    // Rack centered at (750, 250)
    // 1..7: Solids, 8: Eight-ball (center of row 3), 9..15: Stripes
    const rackSetup: { id: number; type: PoolBallType; x: number; y: number }[] = [
      // Row 1 (Apex)
      { id: 1, type: 'SOLID', x: 700, y: 250 },
      // Row 2
      { id: 9, type: 'STRIPE', x: 730, y: 235 },
      { id: 2, type: 'SOLID', x: 730, y: 265 },
      // Row 3
      { id: 10, type: 'STRIPE', x: 760, y: 220 },
      { id: 8, type: 'EIGHT', x: 760, y: 250 }, // 8-ball in center
      { id: 3, type: 'SOLID', x: 760, y: 280 },
      // Row 4
      { id: 4, type: 'SOLID', x: 790, y: 205 },
      { id: 11, type: 'STRIPE', x: 790, y: 235 },
      { id: 5, type: 'SOLID', x: 790, y: 265 },
      { id: 12, type: 'STRIPE', x: 790, y: 295 },
      // Row 5
      { id: 13, type: 'STRIPE', x: 820, y: 190 },
      { id: 6, type: 'SOLID', x: 820, y: 220 },
      { id: 14, type: 'STRIPE', x: 820, y: 250 },
      { id: 7, type: 'SOLID', x: 820, y: 280 },
      { id: 15, type: 'STRIPE', x: 820, y: 310 },
    ];

    rackSetup.forEach((b) => {
      balls.push({
        id: b.id,
        type: b.type,
        x: b.x,
        y: b.y,
        isPocketed: false,
      });
    });

    const playerStates: [PoolPlayerState, PoolPlayerState] = [
      { userId: player1, suit: null, pocketedCount: 0 },
      { userId: player2, suit: null, pocketedCount: 0 },
    ];

    return {
      balls,
      players: playerStates,
      turnPlayerId: firstPlayerId,
      isBreakShot: true,
      ballInHand: false,
      lastShotFoul: null,
      winnerId: null,
      turnExpiresAt: Date.now() + POOL_TURN_DURATION_MS,
    };
  }

  validateAction(
    state: Pool8BallState,
    playerId: string,
    action: Pool8BallAction
  ): boolean {
    if (state.winnerId) return false;
    if (state.turnPlayerId !== playerId) return false;

    if (action.type === 'PLACE_CUE') {
      if (!state.ballInHand) return false;
      if (!action.cuePosition) return false;
      const { x, y } = action.cuePosition;
      return x >= 50 && x <= 950 && y >= 50 && y <= 450;
    }

    if (action.type === 'STRIKE') {
      const power = action.power ?? 50;
      return power >= 1 && power <= 100;
    }

    return false;
  }

  applyAction(
    state: Pool8BallState,
    playerId: string,
    action: Pool8BallAction
  ): GameActionResult<Pool8BallState> {
    if (!this.validateAction(state, playerId, action)) {
      return { state, success: false, error: 'Invalid pool action' };
    }

    const nextState: Pool8BallState = JSON.parse(JSON.stringify(state));
    const activePlayerIndex = nextState.players[0].userId === playerId ? 0 : 1;
    const opponentPlayerIndex = activePlayerIndex === 0 ? 1 : 0;
    const opponentId = nextState.players[opponentPlayerIndex].userId;

    if (action.type === 'PLACE_CUE' && action.cuePosition) {
      const cueBall = nextState.balls.find((b) => b.id === 0);
      if (cueBall) {
        cueBall.x = action.cuePosition.x;
        cueBall.y = action.cuePosition.y;
        cueBall.isPocketed = false;
      }
      nextState.ballInHand = false;
      return { state: nextState, success: true };
    }

    // Handle STRIKE
    nextState.isBreakShot = false;
    nextState.lastShotFoul = null;

    const pocketedIds = action.simulatedPocketed || [];
    const cuePocketed = pocketedIds.includes(0);
    const eightPocketed = pocketedIds.includes(8);

    // Update pocketed status of balls
    pocketedIds.forEach((id) => {
      const ball = nextState.balls.find((b) => b.id === id);
      if (ball) ball.isPocketed = true;
    });

    // 1. Check Scratch on 8-ball
    if (eightPocketed && cuePocketed) {
      nextState.winnerId = opponentId;
      return { state: nextState, success: true };
    }

    // 2. Check 8-ball pocketed
    if (eightPocketed) {
      const activePlayerSuit = nextState.players[activePlayerIndex].suit;
      // How many balls of player's suit remain unpocketed?
      const suitBallsRemaining = activePlayerSuit
        ? nextState.balls.filter(
            (b) =>
              !b.isPocketed &&
              b.id !== 8 &&
              ((activePlayerSuit === 'SOLIDS' && b.id >= 1 && b.id <= 7) ||
                (activePlayerSuit === 'STRIPES' && b.id >= 9 && b.id <= 15))
          ).length
        : 7;

      if (suitBallsRemaining === 0) {
        // Legal 8-ball win!
        nextState.winnerId = playerId;
      } else {
        // Foul! Pocketed 8-ball before clearing suit -> Opponent wins!
        nextState.winnerId = opponentId;
      }
      return { state: nextState, success: true };
    }

    // 3. Check Cue Ball Scratch
    if (cuePocketed) {
      const cueBall = nextState.balls.find((b) => b.id === 0);
      if (cueBall) {
        cueBall.x = 250;
        cueBall.y = 250;
        cueBall.isPocketed = false;
      }
      nextState.lastShotFoul = 'SCRATCH';
      nextState.ballInHand = true;
      nextState.turnPlayerId = opponentId;
      nextState.turnExpiresAt = Date.now() + POOL_TURN_DURATION_MS;
      return { state: nextState, success: true };
    }

    // 4. Object balls pocketed
    const objectPocketed = pocketedIds.filter((id) => id >= 1 && id <= 15 && id !== 8);

    // Assign suits if not yet assigned and an object ball was pocketed
    if (!nextState.players[activePlayerIndex].suit && objectPocketed.length > 0) {
      const firstBall = objectPocketed[0];
      if (firstBall >= 1 && firstBall <= 7) {
        nextState.players[activePlayerIndex].suit = 'SOLIDS';
        nextState.players[opponentPlayerIndex].suit = 'STRIPES';
      } else if (firstBall >= 9 && firstBall <= 15) {
        nextState.players[activePlayerIndex].suit = 'STRIPES';
        nextState.players[opponentPlayerIndex].suit = 'SOLIDS';
      }
    }

    // Recalculate pocketed counts for both players
    ['SOLIDS', 'STRIPES'].forEach((suit) => {
      const count = nextState.balls.filter(
        (b) =>
          b.isPocketed &&
          ((suit === 'SOLIDS' && b.id >= 1 && b.id <= 7) ||
            (suit === 'STRIPES' && b.id >= 9 && b.id <= 15))
      ).length;

      const p = nextState.players.find((player) => player.suit === suit);
      if (p) {
        p.pocketedCount = count;
      }
    });

    // Check if active player pocketed at least one of their own balls
    const activeSuit = nextState.players[activePlayerIndex].suit;
    let pocketedOwn = false;
    if (activeSuit === 'SOLIDS') {
      pocketedOwn = objectPocketed.some((id) => id >= 1 && id <= 7);
    } else if (activeSuit === 'STRIPES') {
      pocketedOwn = objectPocketed.some((id) => id >= 9 && id <= 15);
    } else if (objectPocketed.length > 0) {
      // Just pocketed first ball to assign suit
      pocketedOwn = true;
    }

    if (pocketedOwn) {
      // Retain turn!
      nextState.turnPlayerId = playerId;
    } else {
      // Switch turn
      nextState.turnPlayerId = opponentId;
    }

    nextState.ballInHand = false;
    nextState.turnExpiresAt = Date.now() + POOL_TURN_DURATION_MS;

    return { state: nextState, success: true };
  }

  checkWinner(state: Pool8BallState): Pool8BallResult | null {
    if (!state.winnerId) return null;
    return {
      winnerId: state.winnerId,
      reason: state.lastShotFoul ? 'EARLY_EIGHT_BALL_FOUL' : 'EIGHT_BALL_POCKETED',
    };
  }

  handleTurnTimeout(state: Pool8BallState): GameActionResult<Pool8BallState> {
    const nextState: Pool8BallState = JSON.parse(JSON.stringify(state));
    const opponent = nextState.players.find((p) => p.userId !== state.turnPlayerId);
    if (opponent) {
      nextState.turnPlayerId = opponent.userId;
      nextState.ballInHand = true;
      nextState.lastShotFoul = 'TIMEOUT';
    }
    nextState.turnExpiresAt = Date.now() + POOL_TURN_DURATION_MS;
    return { state: nextState, success: true };
  }
}
