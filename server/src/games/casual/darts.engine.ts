import { GameEngine, GamePlayerMeta } from '../game.definition';
import { GameRegistry } from '../game.registry';
import {
  DartMultiplier,
  DartsAction,
  DartsPlayerState,
  DartsResult,
  DartsState,
  DartThrow,
  GameActionResult,
  GameDefinition,
} from '../../../../shared/game-types';

export const DARTS_TURN_DURATION_MS = 25000;

// Standard London Clock 20-sector order starting at top (12 o'clock = 20) and going clockwise
export const DARTBOARD_SECTORS = [
  20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5,
];

export class DartsEngine
  implements GameEngine<DartsState, DartsAction, DartsResult>
{
  readonly definition: GameDefinition;

  constructor() {
    this.definition = GameRegistry.getGame('DARTS') || {
      id: 'DARTS',
      name: 'Darts 501',
      category: 'CASUAL',
      minPlayers: 2,
      maxPlayers: 2,
      defaultPlayers: 2,
      supportsSpectators: true,
      turnTimeSeconds: 25,
      description: 'Aim with precision to reduce your score from 501 to zero.',
      iconName: 'target',
    };
  }

  initialize(players: GamePlayerMeta[], settings?: any): DartsState {
    if (!players || players.length < 2) {
      throw new Error('Darts requires 2 players');
    }

    const startingScore = settings?.startingScore || 501;

    const playerStates: [DartsPlayerState, DartsPlayerState] = [
      {
        userId: players[0].userId,
        scoreRemaining: startingScore,
        dartsThrown: 0,
        roundThrows: [],
      },
      {
        userId: players[1].userId,
        scoreRemaining: startingScore,
        dartsThrown: 0,
        roundThrows: [],
      },
    ];

    return {
      startingScore,
      players: playerStates,
      turnPlayerId: playerStates[0].userId,
      dartsRemainingInTurn: 3,
      currentTurnScore: 0,
      isBust: false,
      winnerId: null,
      turnExpiresAt: Date.now() + DARTS_TURN_DURATION_MS,
    };
  }

  calculateThrow(
    x: number,
    y: number,
    targetSector?: number,
    targetMultiplier?: DartMultiplier
  ): DartThrow {
    // If targetSector is explicitly specified (e.g. from UI shortcut or test)
    if (targetSector !== undefined && targetMultiplier !== undefined) {
      const points =
        targetSector === 50
          ? 50
          : targetSector === 25
          ? 25
          : targetSector * targetMultiplier;
      return {
        dartIndex: 0,
        sector: targetSector,
        multiplier: targetMultiplier,
        points,
      };
    }

    // Geometry based throw calculation from coordinates (scale radius 0..100)
    const radius = Math.hypot(x, y);

    // Radii in standardized 0..100 scale:
    // Inner Bull (Double): 0..6
    // Outer Bull (Single): 6..15
    // Inner Single: 15..55
    // Triple Ring: 55..65
    // Outer Single: 65..90
    // Double Ring: 90..100
    // Miss: > 100

    if (radius <= 6) {
      return { dartIndex: 0, sector: 50, multiplier: 2, points: 50 };
    }
    if (radius <= 15) {
      return { dartIndex: 0, sector: 25, multiplier: 1, points: 25 };
    }
    if (radius > 100) {
      return { dartIndex: 0, sector: 0, multiplier: 0, points: 0 };
    }

    // Calculate angle in degrees (0 at 12 o'clock, clockwise)
    let angle = (Math.atan2(x, -y) * 180) / Math.PI;
    if (angle < 0) angle += 360;

    // 20 sectors = 18 degrees each. Sector 20 is centered at 0 deg (-9 to +9)
    const sectorOffset = (angle + 9) % 360;
    const sectorIndex = Math.floor(sectorOffset / 18);
    const sector = DARTBOARD_SECTORS[sectorIndex] || 20;

    let multiplier: DartMultiplier = 1;
    if (radius >= 55 && radius <= 65) {
      multiplier = 3; // Triple
    } else if (radius >= 90 && radius <= 100) {
      multiplier = 2; // Double
    }

    const points = sector * multiplier;
    return {
      dartIndex: 0,
      sector,
      multiplier,
      points,
    };
  }

  validateAction(
    state: DartsState,
    playerId: string,
    action: DartsAction
  ): boolean {
    if (state.winnerId) return false;
    if (state.turnPlayerId !== playerId) return false;
    if (action.type !== 'THROW_DART') return false;

    return (
      (action.x >= -120 && action.x <= 120 && action.y >= -120 && action.y <= 120) ||
      action.targetSector !== undefined
    );
  }

  applyAction(
    state: DartsState,
    playerId: string,
    action: DartsAction
  ): GameActionResult<DartsState> {
    if (!this.validateAction(state, playerId, action)) {
      return { state, success: false, error: 'Invalid darts throw' };
    }

    const nextState: DartsState = JSON.parse(JSON.stringify(state));
    const activePlayer = nextState.players.find((p) => p.userId === playerId)!;
    const opponent = nextState.players.find((p) => p.userId !== playerId)!;

    const throwResult = this.calculateThrow(
      action.x,
      action.y,
      action.targetSector,
      action.targetMultiplier
    );

    throwResult.dartIndex = 3 - nextState.dartsRemainingInTurn;
    activePlayer.dartsThrown += 1;
    activePlayer.roundThrows.push(throwResult);

    const projectedScore = activePlayer.scoreRemaining - throwResult.points;
    let turnFinished = false;

    // Double-out validation
    if (projectedScore === 0 && throwResult.multiplier === 2) {
      // 🎯 Checkout Win!
      activePlayer.scoreRemaining = 0;
      nextState.winnerId = playerId;
      return { state: nextState, success: true };
    } else if (projectedScore < 0 || projectedScore === 1 || (projectedScore === 0 && throwResult.multiplier !== 2)) {
      // ⚠️ Bust! Revert turn score
      nextState.isBust = true;
      // Undo all points scored during this turn
      activePlayer.scoreRemaining += nextState.currentTurnScore;
      nextState.currentTurnScore = 0;
      turnFinished = true;
    } else {
      // Legal throw
      activePlayer.scoreRemaining = projectedScore;
      nextState.currentTurnScore += throwResult.points;
      nextState.dartsRemainingInTurn -= 1;

      if (nextState.dartsRemainingInTurn === 0) {
        turnFinished = true;
      }
    }

    if (turnFinished) {
      // Switch to opponent
      nextState.turnPlayerId = opponent.userId;
      nextState.dartsRemainingInTurn = 3;
      nextState.currentTurnScore = 0;
      nextState.isBust = false;
      activePlayer.roundThrows = [];
    }

    nextState.turnExpiresAt = Date.now() + DARTS_TURN_DURATION_MS;
    return { state: nextState, success: true };
  }

  checkWinner(state: DartsState): DartsResult | null {
    if (!state.winnerId) return null;
    const winner = state.players.find((p) => p.userId === state.winnerId);
    return {
      winnerId: state.winnerId,
      checkoutDart: winner?.roundThrows[winner.roundThrows.length - 1] || null,
      totalTurns: Math.ceil((winner?.dartsThrown || 0) / 3),
    };
  }

  handleTurnTimeout(state: DartsState): GameActionResult<DartsState> {
    // Auto-throw a safe single 20
    return this.applyAction(state, state.turnPlayerId, {
      type: 'THROW_DART',
      x: 0,
      y: -30,
    });
  }
}
