import { GameEngine, GamePlayerMeta } from '../game.definition';
import { GameRegistry } from '../game.registry';
import {
  GameActionResult,
  GameDefinition,
  ImposterAction,
  ImposterResult,
  ImposterState,
} from '../../../../shared/game-types';

export const IMPOSTER_PHASE_DURATION_MS = 60000;

export class ImposterEngine
  implements GameEngine<ImposterState, ImposterAction, ImposterResult>
{
  readonly definition: GameDefinition;

  private static LOCATIONS = [
    'International Space Station',
    'Nuclear Submarine',
    'Grand Casino',
    'Emergency Hospital',
    'Pirate Ship',
    'Film Studio',
    'Arctic Research Base',
    'Bank Vault',
    'Luxury Cruise Ship',
    'Amusement Park',
  ];

  constructor() {
    this.definition = GameRegistry.getGame('IMPOSTER') || {
      id: 'IMPOSTER',
      name: 'The Imposter',
      category: 'PARTY',
      minPlayers: 4,
      maxPlayers: 8,
      defaultPlayers: 6,
      supportsSpectators: true,
      turnTimeSeconds: 60,
      description: 'Everyone receives a secret word except one player. Find the imposter.',
      iconName: 'eye',
    };
  }

  initialize(players: GamePlayerMeta[], settings?: any): ImposterState {
    if (!players || players.length < 2) {
      throw new Error('Imposter requires at least 2 players');
    }

    const playerIds = players.map((p) => p.userId);
    const imposterIndex = Math.floor(Math.random() * playerIds.length);
    const imposterId = settings?.imposterId || playerIds[imposterIndex];

    const location =
      settings?.location ||
      ImposterEngine.LOCATIONS[
        Math.floor(Math.random() * ImposterEngine.LOCATIONS.length)
      ];

    const votes: Record<string, string | null> = {};
    for (const pid of playerIds) {
      votes[pid] = null;
    }

    return {
      players: playerIds,
      secretLocation: location,
      imposterId,
      phase: 'DISCUSSION',
      clues: [],
      votes,
      accusedId: null,
      winnerId: null,
      turnExpiresAt: Date.now() + IMPOSTER_PHASE_DURATION_MS,
    };
  }

  validateAction(
    state: ImposterState,
    playerId: string,
    action: ImposterAction
  ): boolean {
    if (state.winnerId || state.phase === 'REVEAL') {
      throw new Error('Game already concluded');
    }
    if (!state.players.includes(playerId)) {
      throw new Error('Player not in game');
    }

    if (action.type === 'SUBMIT_CLUE') {
      if (state.phase !== 'DISCUSSION') {
        throw new Error('Clues can only be submitted during DISCUSSION phase');
      }
      if (!action.clue || action.clue.trim().length === 0) {
        throw new Error('Clue text cannot be empty');
      }
    } else if (action.type === 'VOTE_IMPOSTER') {
      if (state.phase !== 'VOTING') {
        throw new Error('Voting can only occur during VOTING phase');
      }
      if (!action.targetUserId || !state.players.includes(action.targetUserId)) {
        throw new Error('Target user must be a valid player');
      }
    } else if (action.type === 'GUESS_LOCATION') {
      if (playerId !== state.imposterId) {
        throw new Error('Only the Imposter can attempt a location guess');
      }
      if (!action.location || action.location.trim().length === 0) {
        throw new Error('Location guess cannot be empty');
      }
    } else {
      throw new Error(`Invalid action type: ${(action as any).type}`);
    }

    return true;
  }

  applyAction(
    state: ImposterState,
    playerId: string,
    action: ImposterAction
  ): GameActionResult<ImposterState> {
    try {
      this.validateAction(state, playerId, action);
    } catch (err: any) {
      return { success: false, state, error: err.message };
    }

    if (action.type === 'SUBMIT_CLUE') {
      const nextClues = [
        ...state.clues,
        { userId: playerId, clueText: action.clue!.trim() },
      ];

      // Auto-transition to voting if all players submitted clues
      const submittedPlayers = new Set(nextClues.map((c) => c.userId));
      const shouldTransition = state.players.every((pid) => submittedPlayers.has(pid));

      const nextPhase = shouldTransition ? 'VOTING' : state.phase;

      const nextState: ImposterState = {
        ...state,
        clues: nextClues,
        phase: nextPhase,
        turnExpiresAt: shouldTransition
          ? Date.now() + IMPOSTER_PHASE_DURATION_MS
          : state.turnExpiresAt,
      };

      return {
        success: true,
        state: nextState,
        events: [
          {
            type: 'CLUE_SUBMITTED',
            data: { playerId, clue: action.clue },
          },
          ...(shouldTransition
            ? [{ type: 'PHASE_CHANGED', data: { newPhase: 'VOTING' } }]
            : []),
        ],
      };
    }

    if (action.type === 'VOTE_IMPOSTER') {
      const nextVotes = { ...state.votes, [playerId]: action.targetUserId! };
      const allVoted = state.players.every((pid) => nextVotes[pid] !== null);

      if (allVoted) {
        // Tally votes
        const tallies: Record<string, number> = {};
        for (const pid of state.players) {
          const target = nextVotes[pid]!;
          tallies[target] = (tallies[target] || 0) + 1;
        }

        let maxVotes = -1;
        let accused: string | null = null;
        for (const [target, count] of Object.entries(tallies)) {
          if (count > maxVotes) {
            maxVotes = count;
            accused = target;
          }
        }

        const imposterCaught = accused === state.imposterId;
        const winner = imposterCaught
          ? state.players.find((p) => p !== state.imposterId) || 'INNOCENTS'
          : state.imposterId;

        const nextState: ImposterState = {
          ...state,
          phase: 'REVEAL',
          votes: nextVotes,
          accusedId: accused,
          winnerId: winner,
          turnExpiresAt: 0,
        };

        return {
          success: true,
          state: nextState,
          events: [
            {
              type: 'IMPOSTER_REVEALED',
              data: {
                accusedId: accused,
                actualImposterId: state.imposterId,
                imposterCaught,
                winnerId: winner,
              },
            },
          ],
        };
      }

      return {
        success: true,
        state: {
          ...state,
          votes: nextVotes,
        },
        events: [
          {
            type: 'VOTE_CAST',
            data: { voterId: playerId, targetUserId: action.targetUserId },
          },
        ],
      };
    }

    if (action.type === 'GUESS_LOCATION') {
      const cleanGuess = action.location!.trim().toLowerCase();
      const actualLocation = state.secretLocation.toLowerCase();
      const isCorrect = cleanGuess === actualLocation;

      const winner = isCorrect
        ? state.imposterId
        : state.players.find((p) => p !== state.imposterId) || 'INNOCENTS';

      const nextState: ImposterState = {
        ...state,
        phase: 'REVEAL',
        winnerId: winner,
        turnExpiresAt: 0,
      };

      return {
        success: true,
        state: nextState,
        events: [
          {
            type: 'IMPOSTER_LOCATION_GUESS',
            data: {
              imposterId: state.imposterId,
              guess: action.location,
              isCorrect,
              winnerId: winner,
            },
          },
        ],
      };
    }

    return { success: true, state };
  }

  checkWinner(state: ImposterState): ImposterResult | null {
    if (!state.winnerId) return null;
    return {
      winnerId: state.winnerId,
      imposterWon: state.winnerId === state.imposterId,
    };
  }
}
