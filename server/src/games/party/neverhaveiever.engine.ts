import { GameEngine, GamePlayerMeta } from '../game.definition';
import { GameRegistry } from '../game.registry';
import {
  GameActionResult,
  GameDefinition,
  NeverHaveIEverAction,
  NeverHaveIEverResult,
  NeverHaveIEverState,
} from '../../../../shared/game-types';

export const NHIE_ROUND_DURATION_MS = 25000;

export class NeverHaveIEverEngine
  implements GameEngine<NeverHaveIEverState, NeverHaveIEverAction, NeverHaveIEverResult>
{
  readonly definition: GameDefinition;

  private static PROMPTS = [
    'Never have I ever dropped my phone on my face while lying in bed.',
    'Never have I ever eaten food off the floor after the 5-second rule.',
    'Never have I ever pretended to be texting or calling to avoid someone.',
    'Never have I ever stayed up for over 24 hours straight playing games or binge-watching.',
    'Never have I ever sung at the top of my lungs while alone in the car or shower.',
    'Never have I ever blamed a weird sound on the dog.',
    'Never have I ever bought something online and immediately regretted it.',
    'Never have I ever locked myself out of my own house or apartment.',
    'Never have I ever laughed so hard that a drink came out of my nose.',
    'Never have I ever googled my own symptoms and convinced myself I had hours to live.',
  ];

  constructor() {
    this.definition = GameRegistry.getGame('NEVER_HAVE_I_EVER') || {
      id: 'NEVER_HAVE_I_EVER',
      name: 'Never Have I Ever',
      category: 'PARTY',
      minPlayers: 2,
      maxPlayers: 8,
      defaultPlayers: 4,
      supportsSpectators: true,
      turnTimeSeconds: 20,
      description: 'Put a finger down if you have done it; friendly social icebreaker.',
      iconName: 'users',
    };
  }

  initialize(players: GamePlayerMeta[], settings?: any): NeverHaveIEverState {
    if (!players || players.length < 2) {
      throw new Error('Never Have I Ever requires at least 2 players');
    }

    const playerIds = players.map((p) => p.userId);
    const lives: Record<string, number> = {};
    const confessions: Record<string, boolean | null> = {};

    for (const pid of playerIds) {
      lives[pid] = 10;
      confessions[pid] = null;
    }

    const prompt =
      settings?.prompt ||
      NeverHaveIEverEngine.PROMPTS[
        Math.floor(Math.random() * NeverHaveIEverEngine.PROMPTS.length)
      ];

    return {
      players: playerIds,
      currentPrompt: prompt,
      lives,
      confessions,
      round: 1,
      winnerId: null,
      turnExpiresAt: Date.now() + NHIE_ROUND_DURATION_MS,
    };
  }

  validateAction(
    state: NeverHaveIEverState,
    playerId: string,
    action: NeverHaveIEverAction
  ): boolean {
    if (state.winnerId) {
      throw new Error('Game already finished');
    }
    if (!state.players.includes(playerId)) {
      throw new Error('Player not in game');
    }
    if (action.type !== 'CONFESS') {
      throw new Error(`Invalid action type: ${action.type}`);
    }
    if (typeof action.iHaveDoneThis !== 'boolean') {
      throw new Error('iHaveDoneThis must be boolean');
    }
    return true;
  }

  applyAction(
    state: NeverHaveIEverState,
    playerId: string,
    action: NeverHaveIEverAction
  ): GameActionResult<NeverHaveIEverState> {
    try {
      this.validateAction(state, playerId, action);
    } catch (err: any) {
      return { success: false, state, error: err.message };
    }

    const nextConfessions = { ...state.confessions, [playerId]: action.iHaveDoneThis };
    const nextLives = { ...state.lives };

    if (action.iHaveDoneThis) {
      nextLives[playerId] = Math.max(0, (nextLives[playerId] || 10) - 1);
    }

    // Check if all players have answered for this round
    const allAnswered = state.players.every((pid) => nextConfessions[pid] !== null);

    if (allAnswered) {
      // Check if any player eliminated or max rounds reached
      const anyZero = state.players.some((pid) => nextLives[pid] <= 0);
      const maxRounds = 5;

      if (anyZero || state.round >= maxRounds) {
        let maxLife = -1;
        let winner: string | null = null;
        for (const pid of state.players) {
          if (nextLives[pid] > maxLife) {
            maxLife = nextLives[pid];
            winner = pid;
          }
        }

        const nextState: NeverHaveIEverState = {
          ...state,
          confessions: nextConfessions,
          lives: nextLives,
          winnerId: winner,
          turnExpiresAt: 0,
        };

        return {
          success: true,
          state: nextState,
          events: [
            {
              type: 'GAME_OVER',
              data: { winnerId: winner, finalLives: nextLives },
            },
          ],
        };
      }

      // Next round
      const nextRound = state.round + 1;
      const available = NeverHaveIEverEngine.PROMPTS.filter((p) => p !== state.currentPrompt);
      const nextPrompt =
        available[Math.floor(Math.random() * available.length)] ||
        NeverHaveIEverEngine.PROMPTS[nextRound % NeverHaveIEverEngine.PROMPTS.length];

      const resetConfessions: Record<string, boolean | null> = {};
      for (const pid of state.players) {
        resetConfessions[pid] = null;
      }

      const nextState: NeverHaveIEverState = {
        ...state,
        currentPrompt: nextPrompt,
        lives: nextLives,
        confessions: resetConfessions,
        round: nextRound,
        turnExpiresAt: Date.now() + NHIE_ROUND_DURATION_MS,
      };

      return {
        success: true,
        state: nextState,
        events: [
          {
            type: 'ROUND_COMPLETED',
            data: { round: state.round, lives: nextLives, nextRound },
          },
        ],
      };
    }

    return {
      success: true,
      state: {
        ...state,
        confessions: nextConfessions,
        lives: nextLives,
      },
      events: [
        {
          type: 'CONFESSION_RECORDED',
          data: { playerId, didIt: action.iHaveDoneThis, remainingLives: nextLives[playerId] },
        },
      ],
    };
  }

  checkWinner(state: NeverHaveIEverState): NeverHaveIEverResult | null {
    if (!state.winnerId) return null;
    return {
      winnerId: state.winnerId,
      finalLives: state.lives,
    };
  }
}
