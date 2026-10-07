import { GameEngine, GamePlayerMeta } from '../game.definition';
import { GameRegistry } from '../game.registry';
import {
  BowlingAction,
  BowlingFrame,
  BowlingPlayerState,
  BowlingResult,
  BowlingState,
  GameActionResult,
  GameDefinition,
} from '../../../../shared/game-types';

export const BOWLING_TURN_DURATION_MS = 20000;

export class BowlingEngine
  implements GameEngine<BowlingState, BowlingAction, BowlingResult>
{
  readonly definition: GameDefinition;

  constructor() {
    this.definition = GameRegistry.getGame('BOWLING') || {
      id: 'BOWLING',
      name: 'Bowling Strike',
      category: 'CASUAL',
      minPlayers: 2,
      maxPlayers: 4,
      defaultPlayers: 2,
      supportsSpectators: true,
      turnTimeSeconds: 20,
      description: 'Knock down ten pins in 10 frames of competitive bowling.',
      iconName: 'trophy',
    };
  }

  initialize(players: GamePlayerMeta[], settings?: any): BowlingState {
    if (!players || players.length < 2) {
      throw new Error('Bowling requires at least 2 players');
    }

    const playerStates: BowlingPlayerState[] = players.map((p) => ({
      userId: p.userId,
      frames: Array(10)
        .fill(null)
        .map(() => ({
          rolls: [],
          pinsStanding: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
          score: null,
          isStrike: false,
          isSpare: false,
        })),
      totalScore: 0,
      isCompleted: false,
    }));

    return {
      players: playerStates,
      turnPlayerId: playerStates[0].userId,
      currentFrameIndex: 0,
      currentRollIndex: 0,
      standingPins: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
      winnerId: null,
      isGameOver: false,
      turnExpiresAt: Date.now() + BOWLING_TURN_DURATION_MS,
    };
  }

  simulatePinfall(
    standingPins: number[],
    lanePosition: number,
    angle: number,
    speed: number,
    spin: number
  ): number[] {
    // Check gutter
    const impactX = lanePosition + angle * 2.2 + spin * 1.5;
    if (Math.abs(impactX) >= 45) {
      // Gutter ball! No pins knocked down
      return [];
    }

    // Perfect pocket hit (centered between 1-3 or 1-2 pocket)
    if (Math.abs(impactX) <= 6 && speed >= 40) {
      // Strike / knock down all currently standing pins
      return [...standingPins];
    }

    // Proportional knockdown based on offset from center
    const hitAccuracy = Math.max(0, 1 - Math.abs(impactX) / 45);
    const pinsToKnockCount = Math.min(
      standingPins.length,
      Math.max(1, Math.round(standingPins.length * hitAccuracy))
    );

    // Pick frontmost / adjacent pins
    return standingPins.slice(0, pinsToKnockCount);
  }

  recalculatePlayerScore(player: BowlingPlayerState): void {
    let runningTotal = 0;
    const rollsList: number[] = [];

    // Flatten rolls for lookahead bonus calculation
    for (let f = 0; f < 10; f++) {
      rollsList.push(...player.frames[f].rolls);
    }

    let rollPointer = 0;

    for (let f = 0; f < 10; f++) {
      const frame = player.frames[f];
      if (frame.rolls.length === 0) break;

      if (f < 9) {
        // Frames 1..9
        if (frame.isStrike) {
          // Strike bonus = 10 + next 2 rolls
          if (rollsList.length > rollPointer + 2) {
            const next1 = rollsList[rollPointer + 1];
            const next2 = rollsList[rollPointer + 2];
            runningTotal += 10 + next1 + next2;
            frame.score = runningTotal;
          }
          rollPointer += 1;
        } else if (frame.isSpare) {
          // Spare bonus = 10 + next 1 roll
          if (rollsList.length > rollPointer + 2) {
            const next1 = rollsList[rollPointer + 2];
            runningTotal += 10 + next1;
            frame.score = runningTotal;
          }
          rollPointer += 2;
        } else {
          // Open frame
          const sum = frame.rolls.reduce((a, b) => a + b, 0);
          runningTotal += sum;
          frame.score = runningTotal;
          rollPointer += frame.rolls.length;
        }
      } else {
        // Frame 10: Sum of all rolls in frame 10
        const sum = frame.rolls.reduce((a, b) => a + b, 0);
        runningTotal += sum;
        frame.score = runningTotal;
      }
    }

    player.totalScore = runningTotal;
  }

  validateAction(
    state: BowlingState,
    playerId: string,
    action: BowlingAction
  ): boolean {
    if (state.isGameOver || state.winnerId) return false;
    if (state.turnPlayerId !== playerId) return false;
    if (action.type !== 'ROLL_BALL') return false;

    return (
      action.lanePosition >= -50 &&
      action.lanePosition <= 50 &&
      action.angle >= -25 &&
      action.angle <= 25 &&
      action.speed >= 1 &&
      action.speed <= 100
    );
  }

  applyAction(
    state: BowlingState,
    playerId: string,
    action: BowlingAction
  ): GameActionResult<BowlingState> {
    if (!this.validateAction(state, playerId, action)) {
      return { state, success: false, error: 'Invalid bowling roll' };
    }

    const nextState: BowlingState = JSON.parse(JSON.stringify(state));
    const playerIndex = nextState.players.findIndex((p) => p.userId === playerId);
    const player = nextState.players[playerIndex];
    const frame = player.frames[nextState.currentFrameIndex];

    // Determine pins knocked down
    const knockedPins = this.simulatePinfall(
      nextState.standingPins,
      action.lanePosition,
      action.angle,
      action.speed,
      action.spin || 0
    );

    const pinCount = knockedPins.length;
    frame.rolls.push(pinCount);

    // Update standing pins
    nextState.standingPins = nextState.standingPins.filter(
      (p) => !knockedPins.includes(p)
    );
    frame.pinsStanding = [...nextState.standingPins];

    const isFrame10 = nextState.currentFrameIndex === 9;
    let advanceToNextPlayer = false;

    if (!isFrame10) {
      // Frames 1..9
      if (frame.rolls.length === 1 && pinCount === 10) {
        // Strike! Frame complete
        frame.isStrike = true;
        advanceToNextPlayer = true;
      } else if (frame.rolls.length === 2) {
        // Second roll: Check spare
        if (frame.rolls[0] + frame.rolls[1] === 10) {
          frame.isSpare = true;
        }
        advanceToNextPlayer = true;
      }
    } else {
      // 10th Frame
      if (frame.rolls.length === 1) {
        if (pinCount === 10) {
          frame.isStrike = true;
          // Reset pins for bonus roll
          nextState.standingPins = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
        }
      } else if (frame.rolls.length === 2) {
        if (frame.rolls[0] === 10 && pinCount === 10) {
          // Second strike in 10th
          nextState.standingPins = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
        } else if (frame.rolls[0] + frame.rolls[1] === 10) {
          // Spare in 10th
          frame.isSpare = true;
          nextState.standingPins = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
        } else if (frame.rolls[0] < 10) {
          // Open 10th frame: No 3rd roll
          advanceToNextPlayer = true;
        }
      } else if (frame.rolls.length === 3) {
        // 3rd roll in 10th frame finished
        advanceToNextPlayer = true;
      }
    }

    // Recalculate score
    this.recalculatePlayerScore(player);

    if (advanceToNextPlayer) {
      // Reset standing pins for next turn
      nextState.standingPins = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

      // Next player in current frame, or next frame
      const nextPlayerIdx = (playerIndex + 1) % nextState.players.length;

      if (nextPlayerIdx === 0) {
        // Completed this round across all players
        if (nextState.currentFrameIndex === 9) {
          // Match finished!
          nextState.isGameOver = true;
          nextState.players.forEach((p) => (p.isCompleted = true));

          const sorted = [...nextState.players].sort(
            (a, b) => b.totalScore - a.totalScore
          );
          nextState.winnerId = sorted[0].userId;
        } else {
          // Advance frame
          nextState.currentFrameIndex += 1;
          nextState.turnPlayerId = nextState.players[0].userId;
        }
      } else {
        nextState.turnPlayerId = nextState.players[nextPlayerIdx].userId;
      }
    }

    nextState.turnExpiresAt = Date.now() + BOWLING_TURN_DURATION_MS;
    return { state: nextState, success: true };
  }

  checkWinner(state: BowlingState): BowlingResult | null {
    if (!state.isGameOver && !state.winnerId) return null;

    const sorted = [...state.players].sort((a, b) => b.totalScore - a.totalScore);
    return {
      winnerId: sorted[0]?.userId || null,
      rankings: sorted.map((p, idx) => ({
        userId: p.userId,
        score: p.totalScore,
        rank: idx + 1,
      })),
    };
  }

  handleTurnTimeout(state: BowlingState): GameActionResult<BowlingState> {
    // Auto-roll down the center
    return this.applyAction(state, state.turnPlayerId, {
      type: 'ROLL_BALL',
      lanePosition: 0,
      angle: 0,
      speed: 60,
      spin: 0,
    });
  }
}
