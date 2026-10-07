import crypto from 'crypto';
import { GameEngine, GamePlayerMeta } from '../game.definition';
import { GameRegistry } from '../game.registry';
import {
  GameActionResult,
  GameDefinition,
  LudoAction,
  LudoColor,
  LudoPlayerState,
  LudoResult,
  LudoState,
  LudoToken,
} from '../../../../shared/game-types';

export const TRACK_LENGTH = 52;
export const HOME_STRETCH_START = 51; // steps 51..55
export const HOME_FINISH_STEP = 56;
export const TOKENS_PER_PLAYER = 4;
export const TURN_DURATION_MS = 20000; // 20-second authoritative turn clock

export const COLOR_OFFSETS: Record<LudoColor, number> = {
  RED: 0,
  GREEN: 13,
  YELLOW: 26,
  BLUE: 39,
};

// 8 Safe Cells on the 52-cell outer circuit (4 start cells + 4 star cells)
export const SAFE_CELLS = new Set<number>([0, 8, 13, 21, 26, 34, 39, 47]);

export const COLOR_PALETTE_ORDER: LudoColor[] = ['RED', 'GREEN', 'YELLOW', 'BLUE'];

export class LudoEngine
  implements GameEngine<LudoState, LudoAction, LudoResult>
{
  readonly definition: GameDefinition;

  constructor() {
    this.definition = GameRegistry.getGame('LUDO') || {
      id: 'LUDO',
      name: 'Ludo World Arena',
      category: 'BOARD',
      minPlayers: 2,
      maxPlayers: 4,
      defaultPlayers: 4,
      supportsSpectators: true,
      turnTimeSeconds: 20,
      description: '2-4 player board game with server dice rolls, safe zones, and home run tokens.',
      iconName: 'dice',
    };
  }

  /**
   * Initializes state when match starts in a room.
   * For 2 players: RED and YELLOW (opposite quadrants).
   * For 3 players: RED, GREEN, YELLOW.
   * For 4 players: RED, GREEN, YELLOW, BLUE.
   */
  initialize(players: GamePlayerMeta[], settings?: Record<string, any>): LudoState {
    if (!players || players.length < 2 || players.length > 4) {
      throw new Error('Ludo requires between 2 and 4 players');
    }

    const assignedColors: LudoColor[] =
      players.length === 2
        ? ['RED', 'YELLOW']
        : players.length === 3
        ? ['RED', 'GREEN', 'YELLOW']
        : ['RED', 'GREEN', 'YELLOW', 'BLUE'];

    const playerStates: LudoPlayerState[] = players.map((p, idx) => {
      const color = assignedColors[idx];
      const tokens: LudoToken[] = [];
      for (let i = 0; i < TOKENS_PER_PLAYER; i++) {
        tokens.push({
          id: i,
          color,
          step: -1, // in yard
        });
      }

      return {
        userId: p.userId,
        username: p.username,
        color,
        tokens,
      };
    });

    const firstPlayer = playerStates[0];

    return {
      players: playerStates,
      turnColor: firstPlayer.color,
      turnPlayerId: firstPlayer.userId,
      currentDiceRoll: null,
      hasRolled: false,
      consecutiveSixes: 0,
      validMoves: [],
      winnerIds: [],
      turnExpiresAt: Date.now() + TURN_DURATION_MS,
    };
  }

  /**
   * Pure validation: returns true or throws Error explaining why action is illegal.
   */
  validateAction(state: LudoState, playerId: string, action: LudoAction): boolean {
    if (!action || !action.type) {
      throw new Error('Invalid action payload: missing type');
    }

    if (state.turnPlayerId !== playerId) {
      throw new Error('Not your turn');
    }

    const activePlayer = state.players.find((p) => p.userId === playerId);
    if (!activePlayer) {
      throw new Error('Player is not in this match');
    }

    if (activePlayer.rank !== undefined) {
      throw new Error('Player has already completed all tokens');
    }

    if (action.type === 'ROLL_DICE') {
      if (state.hasRolled) {
        throw new Error('Dice already rolled for this turn');
      }
      return true;
    }

    if (action.type === 'MOVE_TOKEN') {
      if (!state.hasRolled || state.currentDiceRoll === null) {
        throw new Error('Must roll dice before moving a token');
      }

      if (action.tokenId === undefined || action.tokenId < 0 || action.tokenId >= TOKENS_PER_PLAYER) {
        throw new Error('Invalid tokenId: must be between 0 and 3');
      }

      if (!state.validMoves.includes(action.tokenId)) {
        throw new Error(
          `Token ${action.tokenId} cannot be legally moved with dice roll of ${state.currentDiceRoll}`
        );
      }

      return true;
    }

    throw new Error(`Unsupported action type: ${(action as any).type}`);
  }

  /**
   * State transformation: applies action and returns next state.
   */
  applyAction(state: LudoState, playerId: string, action: LudoAction): GameActionResult<LudoState> {
    this.validateAction(state, playerId, action);

    let nextState: LudoState = JSON.parse(JSON.stringify(state));
    const playerIndex = nextState.players.findIndex((p) => p.userId === playerId);
    const player = nextState.players[playerIndex];

    if (action.type === 'ROLL_DICE') {
      // 1. Generate cryptographically secure roll (1..6)
      const roll = crypto.randomInt(1, 7);
      nextState.currentDiceRoll = roll;
      nextState.hasRolled = true;

      if (roll === 6) {
        nextState.consecutiveSixes += 1;
      } else {
        nextState.consecutiveSixes = 0;
      }

      // 2. Check 3-consecutive-sixes penalty rule
      if (nextState.consecutiveSixes >= 3) {
        // Penalty: Turn voided and passed to next player
        nextState.lastMove = {
          playerId,
          color: player.color,
          tokenId: -1,
          fromStep: -1,
          toStep: -1,
        };
        this.advanceTurn(nextState);
        return {
          success: true,
          state: nextState,
          events: [
            {
              type: 'ludo:three_sixes_penalty',
              data: { playerId, message: 'Three consecutive 6s rolled! Turn skipped.' },
            },
          ],
        };
      }

      // 3. Compute legal moves
      const validMoves = this.calculateValidMoves(player, roll);
      nextState.validMoves = validMoves;

      // 4. If no moves are legal: pass turn to next player
      if (validMoves.length === 0) {
        // If rolled a 6 without legal moves, pass turn
        this.advanceTurn(nextState);
        return {
          success: true,
          state: nextState,
          events: [
            {
              type: 'ludo:no_moves_available',
              data: { playerId, roll },
            },
          ],
        };
      }

      // Player must now pick a token or auto-move will trigger on timeout
      nextState.turnExpiresAt = Date.now() + TURN_DURATION_MS;

      return {
        success: true,
        state: nextState,
        events: [
          {
            type: 'ludo:dice_rolled',
            data: { playerId, roll, validMoves },
          },
        ],
      };
    }

    if (action.type === 'MOVE_TOKEN') {
      const tokenId = action.tokenId!;
      const roll = nextState.currentDiceRoll!;
      const token = player.tokens.find((t) => t.id === tokenId)!;

      const fromStep = token.step;
      let toStep: number;

      if (fromStep === -1) {
        // Leaving yard onto start cell
        toStep = 0;
      } else {
        toStep = fromStep + roll;
      }

      token.step = toStep;

      let capturedInfo: { playerId: string; color: LudoColor; tokenId: number } | undefined;
      let earnedBonusRoll = false;

      // 1. Check token reached home (step 56)
      if (toStep === HOME_FINISH_STEP) {
        earnedBonusRoll = true;
      }

      // 2. Check token capture (only on track cells 0..50)
      if (toStep >= 0 && toStep < HOME_STRETCH_START) {
        const landingAbsoluteCell = this.getAbsoluteCell(player.color, toStep);

        if (!SAFE_CELLS.has(landingAbsoluteCell)) {
          // Check opponents
          for (const opp of nextState.players) {
            if (opp.userId === playerId) continue;

            for (const oppToken of opp.tokens) {
              if (oppToken.step >= 0 && oppToken.step < HOME_STRETCH_START) {
                const oppCell = this.getAbsoluteCell(opp.color, oppToken.step);
                if (oppCell === landingAbsoluteCell) {
                  // Capture! Send back to yard
                  oppToken.step = -1;
                  capturedInfo = {
                    playerId: opp.userId,
                    color: opp.color,
                    tokenId: oppToken.id,
                  };
                  earnedBonusRoll = true;
                  break;
                }
              }
            }
            if (capturedInfo) break;
          }
        }
      }

      // 3. Roll of 6 awards bonus roll (if < 3 consecutive sixes)
      if (roll === 6 && nextState.consecutiveSixes < 3) {
        earnedBonusRoll = true;
      }

      // 4. Check if player finished all 4 tokens
      const allFinished = player.tokens.every((t) => t.step === HOME_FINISH_STEP);
      if (allFinished && player.rank === undefined) {
        const nextRank = nextState.winnerIds.length + 1;
        player.rank = nextRank;
        nextState.winnerIds.push(playerId);
      }

      nextState.lastMove = {
        playerId,
        color: player.color,
        tokenId,
        fromStep,
        toStep,
        capturedToken: capturedInfo,
        reachedHome: toStep === HOME_FINISH_STEP,
      };

      // 5. Determine next turn
      const gameFinished = this.isGameComplete(nextState);

      if (!gameFinished) {
        if (earnedBonusRoll && !allFinished) {
          // Player retains turn for bonus roll
          nextState.currentDiceRoll = null;
          nextState.hasRolled = false;
          nextState.validMoves = [];
          nextState.turnExpiresAt = Date.now() + TURN_DURATION_MS;
        } else {
          // Advance turn to next active player
          this.advanceTurn(nextState);
        }
      }

      return {
        success: true,
        state: nextState,
        events: [
          {
            type: 'ludo:token_moved',
            data: {
              playerId,
              color: player.color,
              tokenId,
              fromStep,
              toStep,
              captured: capturedInfo,
              bonusRoll: earnedBonusRoll,
            },
          },
        ],
      };
    }

    return { success: false, error: 'Unknown action' };
  }

  /**
   * Calculates which tokens can legally move for the given roll.
   */
  calculateValidMoves(player: LudoPlayerState, roll: number): number[] {
    const valid: number[] = [];

    for (const token of player.tokens) {
      if (token.step === HOME_FINISH_STEP) {
        // Already home
        continue;
      }

      if (token.step === -1) {
        // In yard: requires 6 to enter
        if (roll === 6) {
          valid.push(token.id);
        }
      } else {
        // On board: must not overshoot 56
        if (token.step + roll <= HOME_FINISH_STEP) {
          valid.push(token.id);
        }
      }
    }

    return valid;
  }

  /**
   * Translates a relative track step (0..50) into an absolute circuit cell index (0..51).
   */
  getAbsoluteCell(color: LudoColor, step: number): number {
    return (COLOR_OFFSETS[color] + step) % TRACK_LENGTH;
  }

  /**
   * Advances turn to the next player who has not finished all tokens.
   */
  advanceTurn(state: LudoState): void {
    const currentIdx = state.players.findIndex((p) => p.userId === state.turnPlayerId);
    const numPlayers = state.players.length;

    let nextIdx = (currentIdx + 1) % numPlayers;
    let attempts = 0;

    while (state.players[nextIdx].rank !== undefined && attempts < numPlayers) {
      nextIdx = (nextIdx + 1) % numPlayers;
      attempts++;
    }

    const nextPlayer = state.players[nextIdx];
    state.turnPlayerId = nextPlayer.userId;
    state.turnColor = nextPlayer.color;
    state.currentDiceRoll = null;
    state.hasRolled = false;
    state.consecutiveSixes = 0;
    state.validMoves = [];
    state.turnExpiresAt = Date.now() + TURN_DURATION_MS;
  }

  /**
   * Checks if game has ended.
   * Game ends when only 1 active player remains (in 2, 3, or 4 player match).
   */
  isGameComplete(state: LudoState): boolean {
    const remainingActive = state.players.filter((p) => p.rank === undefined);
    return remainingActive.length <= 1;
  }

  /**
   * Inspects state to determine winner/rankings.
   */
  checkWinner(state: LudoState): LudoResult | null {
    if (!this.isGameComplete(state)) {
      return null;
    }

    // Assign final rank to any remaining unfinished player
    const rankings: { userId: string; color: LudoColor; rank: number }[] = [];

    // First add finished players in order
    state.winnerIds.forEach((uid, index) => {
      const p = state.players.find((pl) => pl.userId === uid);
      if (p) {
        rankings.push({
          userId: p.userId,
          color: p.color,
          rank: index + 1,
        });
      }
    });

    // Then add any remaining player
    state.players.forEach((p) => {
      if (!state.winnerIds.includes(p.userId)) {
        const lastRank = rankings.length + 1;
        p.rank = lastRank;
        rankings.push({
          userId: p.userId,
          color: p.color,
          rank: lastRank,
        });
      }
    });

    const firstPlace = rankings.length > 0 ? rankings[0].userId : null;

    return {
      winnerId: firstPlace,
      winnerIds: state.winnerIds,
      rankings,
      isComplete: true,
    };
  }

  /**
   * Handles player disconnection.
   */
  handlePlayerDisconnect(state: LudoState, playerId: string): LudoState {
    return state;
  }

  /**
   * Handles player reconnection.
   */
  handlePlayerReconnect(state: LudoState, playerId: string): LudoState {
    return state;
  }

  /**
   * Handles turn timeout:
   * - If player has not rolled: auto-rolls dice.
   * - If player has rolled: auto-moves the most advanced valid token.
   */
  handleTurnTimeout(state: LudoState): GameActionResult<LudoState> {
    const playerId = state.turnPlayerId;

    if (!state.hasRolled) {
      // 1. Auto-roll dice
      const rollRes = this.applyAction(state, playerId, { type: 'ROLL_DICE' });
      if (!rollRes.success || !rollRes.state) {
        return rollRes;
      }

      // If roll automatically advanced turn (e.g. no moves or 3-sixes penalty), return
      if (!rollRes.state.hasRolled || rollRes.state.turnPlayerId !== playerId) {
        return rollRes;
      }

      // 2. If valid moves exist after auto-roll, pick best token to move
      state = rollRes.state;
    }

    if (state.validMoves.length > 0) {
      const player = state.players.find((p) => p.userId === playerId)!;
      // Pick the token with the highest step to advance closest to finish
      let bestTokenId = state.validMoves[0];
      let maxStep = -2;

      for (const tId of state.validMoves) {
        const t = player.tokens.find((tok) => tok.id === tId)!;
        if (t.step > maxStep) {
          maxStep = t.step;
          bestTokenId = tId;
        }
      }

      return this.applyAction(state, playerId, {
        type: 'MOVE_TOKEN',
        tokenId: bestTokenId,
      });
    }

    // No valid moves left: advance turn
    this.advanceTurn(state);
    return {
      success: true,
      state,
      events: [
        {
          type: 'ludo:timeout_advance',
          data: { playerId },
        },
      ],
    };
  }
}
