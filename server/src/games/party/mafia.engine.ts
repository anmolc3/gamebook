import { GameEngine, GamePlayerMeta } from '../game.definition';
import { GameRegistry } from '../game.registry';
import {
  GameActionResult,
  GameDefinition,
  MafiaAction,
  MafiaResult,
  MafiaRole,
  MafiaState,
} from '../../../../shared/game-types';

export const MAFIA_PHASE_DURATION_MS = 60000;

export class MafiaEngine
  implements GameEngine<MafiaState, MafiaAction, MafiaResult>
{
  readonly definition: GameDefinition;

  constructor() {
    this.definition = GameRegistry.getGame('MAFIA') || {
      id: 'MAFIA',
      name: 'Mafia / Werewolf',
      category: 'PARTY',
      minPlayers: 5,
      maxPlayers: 10,
      defaultPlayers: 6,
      supportsSpectators: true,
      turnTimeSeconds: 90,
      description: 'Day discussion and night eliminations social deduction game.',
      iconName: 'shield',
    };
  }

  initialize(players: GamePlayerMeta[], settings?: any): MafiaState {
    if (!players || players.length < 2) {
      throw new Error('Mafia requires at least 2 players');
    }

    const playerIds = players.map((p) => p.userId);
    const roles: Record<string, MafiaRole> = {};

    // Assign roles
    if (playerIds.length === 2) {
      roles[playerIds[0]] = 'MAFIA';
      roles[playerIds[1]] = 'DETECTIVE';
    } else if (playerIds.length === 3) {
      roles[playerIds[0]] = 'MAFIA';
      roles[playerIds[1]] = 'DETECTIVE';
      roles[playerIds[2]] = 'DOCTOR';
    } else {
      roles[playerIds[0]] = 'MAFIA';
      roles[playerIds[1]] = 'DETECTIVE';
      roles[playerIds[2]] = 'DOCTOR';
      for (let i = 3; i < playerIds.length; i++) {
        roles[playerIds[i]] = 'VILLAGER';
      }
    }

    // Allow setting override for deterministic tests
    if (settings?.roles) {
      for (const [pid, role] of Object.entries(settings.roles)) {
        roles[pid] = role as MafiaRole;
      }
    }

    const dayVotes: Record<string, string | null> = {};
    for (const pid of playerIds) {
      dayVotes[pid] = null;
    }

    return {
      players: playerIds,
      phase: 'NIGHT',
      dayNumber: 1,
      playerRoles: roles,
      alivePlayers: [...playerIds],
      nightTargetMafia: null,
      nightTargetDoctor: null,
      nightCheckedDetective: null,
      dayVotes,
      eliminatedLastNight: null,
      eliminatedLastDay: null,
      winnerSide: null,
      winnerId: null,
      turnExpiresAt: Date.now() + MAFIA_PHASE_DURATION_MS,
    };
  }

  validateAction(
    state: MafiaState,
    playerId: string,
    action: MafiaAction
  ): boolean {
    if (state.winnerSide) {
      throw new Error('Game already concluded');
    }
    if (!state.alivePlayers.includes(playerId)) {
      throw new Error('Player is eliminated');
    }
    if (!action.targetUserId || !state.alivePlayers.includes(action.targetUserId)) {
      throw new Error('Target must be an alive player');
    }

    const role = state.playerRoles[playerId];

    if (action.type === 'MAFIA_KILL') {
      if (state.phase !== 'NIGHT') throw new Error('Can only kill during NIGHT phase');
      if (role !== 'MAFIA') throw new Error('Only Mafia can perform MAFIA_KILL');
    } else if (action.type === 'DOCTOR_SAVE') {
      if (state.phase !== 'NIGHT') throw new Error('Can only save during NIGHT phase');
      if (role !== 'DOCTOR') throw new Error('Only Doctor can perform DOCTOR_SAVE');
    } else if (action.type === 'DETECTIVE_INVESTIGATE') {
      if (state.phase !== 'NIGHT') throw new Error('Can only investigate during NIGHT phase');
      if (role !== 'DETECTIVE') throw new Error('Only Detective can perform DETECTIVE_INVESTIGATE');
    } else if (action.type === 'DAY_VOTE') {
      if (state.phase !== 'DAY_VOTING') throw new Error('Voting only permitted during DAY_VOTING');
    } else {
      throw new Error(`Invalid action type: ${(action as any).type}`);
    }

    return true;
  }

  applyAction(
    state: MafiaState,
    playerId: string,
    action: MafiaAction
  ): GameActionResult<MafiaState> {
    try {
      this.validateAction(state, playerId, action);
    } catch (err: any) {
      return { success: false, state, error: err.message };
    }

    if (action.type === 'MAFIA_KILL') {
      const nextMafiaTarget = action.targetUserId;
      let nextAlive = [...state.alivePlayers];
      let eliminated: string | null = null;

      // Check if night resolves (if no doctor alive or doctor already chose)
      const hasAliveDoctor = state.alivePlayers.some(
        (p) => state.playerRoles[p] === 'DOCTOR'
      );

      const doctorSavedTarget = state.nightTargetDoctor;
      const canResolveNight = !hasAliveDoctor || doctorSavedTarget !== null;

      if (canResolveNight) {
        if (nextMafiaTarget !== doctorSavedTarget) {
          eliminated = nextMafiaTarget;
          nextAlive = nextAlive.filter((p) => p !== eliminated);
        }

        const winResult = this.evaluateWin(nextAlive, state.playerRoles);

        const resetDayVotes: Record<string, string | null> = {};
        for (const p of nextAlive) {
          resetDayVotes[p] = null;
        }

        const nextState: MafiaState = {
          ...state,
          phase: winResult ? state.phase : 'DAY_VOTING',
          alivePlayers: nextAlive,
          nightTargetMafia: nextMafiaTarget,
          eliminatedLastNight: eliminated,
          winnerSide: winResult?.winnerSide || null,
          winnerId: winResult?.winnerId || null,
          dayVotes: resetDayVotes,
          turnExpiresAt: winResult ? 0 : Date.now() + MAFIA_PHASE_DURATION_MS,
        };

        return {
          success: true,
          state: nextState,
          events: [
            {
              type: 'NIGHT_CONCLUDED',
              data: { eliminated, winnerSide: winResult?.winnerSide },
            },
          ],
        };
      }

      return {
        success: true,
        state: {
          ...state,
          nightTargetMafia: nextMafiaTarget,
        },
        events: [{ type: 'MAFIA_TARGET_CHOSEN', data: { targetId: action.targetUserId } }],
      };
    }

    if (action.type === 'DOCTOR_SAVE') {
      return {
        success: true,
        state: {
          ...state,
          nightTargetDoctor: action.targetUserId,
        },
        events: [{ type: 'DOCTOR_SAVED', data: { targetId: action.targetUserId } }],
      };
    }

    if (action.type === 'DETECTIVE_INVESTIGATE') {
      const isMafia = state.playerRoles[action.targetUserId] === 'MAFIA';
      return {
        success: true,
        state: {
          ...state,
          nightCheckedDetective: { targetId: action.targetUserId, isMafia },
        },
        events: [
          {
            type: 'DETECTIVE_CHECKED',
            data: { targetId: action.targetUserId, isMafia },
          },
        ],
      };
    }

    if (action.type === 'DAY_VOTE') {
      const nextVotes = { ...state.dayVotes, [playerId]: action.targetUserId };
      const allAliveVoted = state.alivePlayers.every((p) => nextVotes[p] !== null);

      if (allAliveVoted) {
        // Tally votes
        const tallies: Record<string, number> = {};
        for (const p of state.alivePlayers) {
          const target = nextVotes[p]!;
          tallies[target] = (tallies[target] || 0) + 1;
        }

        let maxCount = -1;
        let lynchTarget: string | null = null;
        for (const [target, count] of Object.entries(tallies)) {
          if (count > maxCount) {
            maxCount = count;
            lynchTarget = target;
          }
        }

        let nextAlive = [...state.alivePlayers];
        if (lynchTarget) {
          nextAlive = nextAlive.filter((p) => p !== lynchTarget);
        }

        const winResult = this.evaluateWin(nextAlive, state.playerRoles);

        const nextState: MafiaState = {
          ...state,
          phase: winResult ? state.phase : 'NIGHT',
          dayNumber: state.dayNumber + 1,
          alivePlayers: nextAlive,
          eliminatedLastDay: lynchTarget,
          nightTargetMafia: null,
          nightTargetDoctor: null,
          nightCheckedDetective: null,
          winnerSide: winResult?.winnerSide || null,
          winnerId: winResult?.winnerId || null,
          turnExpiresAt: winResult ? 0 : Date.now() + MAFIA_PHASE_DURATION_MS,
        };

        return {
          success: true,
          state: nextState,
          events: [
            {
              type: 'DAY_VOTE_CONCLUDED',
              data: { eliminated: lynchTarget, winnerSide: winResult?.winnerSide },
            },
          ],
        };
      }

      return {
        success: true,
        state: {
          ...state,
          dayVotes: nextVotes,
        },
        events: [{ type: 'DAY_VOTE_CAST', data: { voterId: playerId, target: action.targetUserId } }],
      };
    }

    return { success: true, state };
  }

  private evaluateWin(
    alive: string[],
    roles: Record<string, MafiaRole>
  ): { winnerSide: 'MAFIA' | 'VILLAGERS'; winnerId: string } | null {
    const mafiaAlive = alive.filter((p) => roles[p] === 'MAFIA');
    const villagersAlive = alive.filter((p) => roles[p] !== 'MAFIA');

    if (mafiaAlive.length === 0) {
      return { winnerSide: 'VILLAGERS', winnerId: villagersAlive[0] || 'VILLAGERS' };
    }
    if (mafiaAlive.length >= villagersAlive.length) {
      return { winnerSide: 'MAFIA', winnerId: mafiaAlive[0] };
    }
    return null;
  }

  checkWinner(state: MafiaState): MafiaResult | null {
    if (!state.winnerSide) return null;
    return {
      winnerId: state.winnerId,
      winnerSide: state.winnerSide,
    };
  }
}
