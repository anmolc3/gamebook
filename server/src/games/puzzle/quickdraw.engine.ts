import { GameEngine, GamePlayerMeta } from '../game.definition';
import { GameRegistry } from '../game.registry';
import {
  GameActionResult,
  GameDefinition,
  QuickDrawAction,
  QuickDrawResult,
  QuickDrawState,
} from '../../../../shared/game-types';

export const QUICK_DRAW_TIMEOUT_MS = 6000;

export class QuickDrawEngine
  implements GameEngine<QuickDrawState, QuickDrawAction, QuickDrawResult>
{
  readonly definition: GameDefinition;

  constructor() {
    this.definition = GameRegistry.getGame('QUICK_DRAW') || {
      id: 'QUICK_DRAW',
      name: 'Quick Draw Western',
      category: 'COMPETITIVE',
      minPlayers: 2,
      maxPlayers: 2,
      defaultPlayers: 2,
      supportsSpectators: true,
      turnTimeSeconds: 5,
      description: 'Wait for the bell and draw in sub-millisecond reflexes.',
      iconName: 'target',
    };
  }

  initialize(players: GamePlayerMeta[], settings?: any): QuickDrawState {
    if (!players || players.length < 2) {
      throw new Error('Quick Draw requires 2 players');
    }

    const p1 = players[0].userId;
    const p2 = players[1].userId;

    const delay = Math.floor(Math.random() * 2500) + 2000; // 2s..4.5s
    const bellTime = Date.now() + delay;

    return {
      players: [p1, p2],
      stage: 'STANDBY',
      bellTime,
      drawTimes: { [p1]: null, [p2]: null },
      earlyDrawFouls: { [p1]: false, [p2]: false },
      winnerId: null,
      turnExpiresAt: bellTime + QUICK_DRAW_TIMEOUT_MS,
    };
  }

  validateAction(state: QuickDrawState, playerId: string, action: QuickDrawAction): boolean {
    if (state.winnerId || state.stage === 'RESOLVED') {
      throw new Error('Duel already concluded');
    }

    if (!state.players.includes(playerId)) {
      throw new Error('Player not in duel');
    }

    if (action.type !== 'DRAW') {
      throw new Error(`Unsupported action type: ${action.type}`);
    }

    return true;
  }

  applyAction(state: QuickDrawState, playerId: string, action: QuickDrawAction): GameActionResult<QuickDrawState> {
    try {
      this.validateAction(state, playerId, action);
    } catch (err: any) {
      return { success: false, state, error: err.message };
    }

    const nextState: QuickDrawState = {
      ...state,
      drawTimes: { ...state.drawTimes },
      earlyDrawFouls: { ...state.earlyDrawFouls },
    };

    const now = Date.now();
    const bell = nextState.bellTime || now;
    const opponentId = state.players.find((uid) => uid !== playerId)!;

    if (now < bell) {
      // Early draw foul! Opponent wins immediately
      nextState.earlyDrawFouls[playerId] = true;
      nextState.stage = 'RESOLVED';
      nextState.winnerId = opponentId;
      return { success: true, state: nextState };
    }

    // Valid draw
    const elapsed = now - bell;
    nextState.drawTimes[playerId] = elapsed;
    nextState.stage = 'RESOLVED';
    nextState.winnerId = playerId; // First valid draw wins!

    return { success: true, state: nextState };
  }

  checkWinner(state: QuickDrawState): QuickDrawResult | null {
    if (!state.winnerId) return null;
    const dTimes: Record<string, number> = {};
    state.players.forEach((uid) => {
      dTimes[uid] = state.drawTimes[uid] || 9999;
    });

    return {
      winnerId: state.winnerId,
      drawTimes: dTimes,
    };
  }

  handleTurnTimeout(state: QuickDrawState): GameActionResult<QuickDrawState> {
    const unpicked = state.players.find((uid) => state.drawTimes[uid] === null);
    if (!unpicked) return { success: true, state };
    return this.applyAction(state, unpicked, { type: 'DRAW' });
  }
}
