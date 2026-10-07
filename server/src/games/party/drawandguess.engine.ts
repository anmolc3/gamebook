import { GameEngine, GamePlayerMeta } from '../game.definition';
import { GameRegistry } from '../game.registry';
import {
  DrawAndGuessAction,
  DrawAndGuessResult,
  DrawAndGuessState,
  DrawStrokePoint,
  GameActionResult,
  GameDefinition,
} from '../../../../shared/game-types';

export const DRAW_AND_GUESS_ROUND_MS = 60000;

export class DrawAndGuessEngine
  implements GameEngine<DrawAndGuessState, DrawAndGuessAction, DrawAndGuessResult>
{
  readonly definition: GameDefinition;

  private static PROMPTS = [
    'Castle',
    'Spaceship',
    'Dolphin',
    'Campfire',
    'Rainbow',
    'Telescope',
    'Volcano',
    'Pirate Hat',
    'Treasure Chest',
    'Ferris Wheel',
  ];

  constructor() {
    this.definition = GameRegistry.getGame('DRAW_AND_GUESS') || {
      id: 'DRAW_AND_GUESS',
      name: 'Draw & Guess Live',
      category: 'PARTY',
      minPlayers: 2,
      maxPlayers: 8,
      defaultPlayers: 4,
      supportsSpectators: true,
      turnTimeSeconds: 60,
      description: 'Real-time collaborative canvas drawing and chat guessing.',
      iconName: 'palette',
    };
  }

  initialize(players: GamePlayerMeta[], settings?: any): DrawAndGuessState {
    if (!players || players.length < 2) {
      throw new Error('Draw & Guess requires at least 2 players');
    }

    const playerIds = players.map((p) => p.userId);
    const scores: Record<string, number> = {};
    for (const pid of playerIds) {
      scores[pid] = 0;
    }

    const prompt =
      settings?.prompt ||
      DrawAndGuessEngine.PROMPTS[
        Math.floor(Math.random() * DrawAndGuessEngine.PROMPTS.length)
      ];

    return {
      players: playerIds,
      drawerId: playerIds[0],
      secretPrompt: prompt,
      strokes: [],
      chatGuesses: [],
      solvedPlayerIds: [],
      scores,
      round: 1,
      totalRounds: settings?.totalRounds || 4,
      turnExpiresAt: Date.now() + DRAW_AND_GUESS_ROUND_MS,
      winnerId: null,
    };
  }

  validateAction(
    state: DrawAndGuessState,
    playerId: string,
    action: DrawAndGuessAction
  ): boolean {
    if (state.winnerId) {
      throw new Error('Game already finished');
    }
    if (!state.players.includes(playerId)) {
      throw new Error('Player not in game');
    }

    if (action.type === 'DRAW_STROKE') {
      if (playerId !== state.drawerId) {
        throw new Error('Only the current drawer can draw');
      }
      if (!action.point) {
        throw new Error('Point payload required for DRAW_STROKE');
      }
    } else if (action.type === 'CLEAR_CANVAS') {
      if (playerId !== state.drawerId) {
        throw new Error('Only the drawer can clear canvas');
      }
    } else if (action.type === 'SUBMIT_GUESS') {
      if (playerId === state.drawerId) {
        throw new Error('Drawer cannot guess their own prompt');
      }
      if (state.solvedPlayerIds.includes(playerId)) {
        throw new Error('Player has already solved this round');
      }
      if (!action.guess || action.guess.trim().length === 0) {
        throw new Error('Guess cannot be empty');
      }
    } else {
      throw new Error(`Invalid action type: ${(action as any).type}`);
    }

    return true;
  }

  applyAction(
    state: DrawAndGuessState,
    playerId: string,
    action: DrawAndGuessAction
  ): GameActionResult<DrawAndGuessState> {
    try {
      this.validateAction(state, playerId, action);
    } catch (err: any) {
      return { success: false, state, error: err.message };
    }

    if (action.type === 'DRAW_STROKE') {
      const nextStrokes = [...state.strokes, action.point!];
      return {
        success: true,
        state: {
          ...state,
          strokes: nextStrokes,
        },
        events: [
          {
            type: 'STROKE_ADDED',
            data: { point: action.point },
          },
        ],
      };
    }

    if (action.type === 'CLEAR_CANVAS') {
      return {
        success: true,
        state: {
          ...state,
          strokes: [],
        },
        events: [{ type: 'CANVAS_CLEARED', data: {} }],
      };
    }

    if (action.type === 'SUBMIT_GUESS') {
      const cleanGuess = action.guess!.trim();
      const isCorrect = cleanGuess.toLowerCase() === state.secretPrompt.toLowerCase();

      const guessEntry = {
        userId: playerId,
        guess: cleanGuess,
        isCorrect,
        timestamp: Date.now(),
      };

      const nextChat = [...state.chatGuesses, guessEntry];

      if (isCorrect) {
        const nextSolved = [...state.solvedPlayerIds, playerId];
        const nextScores = { ...state.scores };
        nextScores[playerId] = (nextScores[playerId] || 0) + 20;
        nextScores[state.drawerId] = (nextScores[state.drawerId] || 0) + 10;

        // Check if all non-drawers solved
        const nonDrawers = state.players.filter((p) => p !== state.drawerId);
        const allSolved = nonDrawers.every((p) => nextSolved.includes(p));

        if (allSolved || state.players.length === 2) {
          return this.advanceRound(state, nextScores, nextChat);
        }

        return {
          success: true,
          state: {
            ...state,
            chatGuesses: nextChat,
            solvedPlayerIds: nextSolved,
            scores: nextScores,
          },
          events: [
            {
              type: 'CORRECT_GUESS',
              data: { playerId, guess: cleanGuess, scores: nextScores },
            },
          ],
        };
      }

      return {
        success: true,
        state: {
          ...state,
          chatGuesses: nextChat,
        },
        events: [
          {
            type: 'GUESS_ATTEMPT',
            data: { playerId, guess: cleanGuess, isCorrect: false },
          },
        ],
      };
    }

    return { success: true, state };
  }

  private advanceRound(
    state: DrawAndGuessState,
    scores: Record<string, number>,
    chat: { userId: string; guess: string; isCorrect: boolean; timestamp: number }[]
  ): GameActionResult<DrawAndGuessState> {
    const nextRound = state.round + 1;
    const currentDrawerIdx = state.players.indexOf(state.drawerId);
    const nextDrawerIdx = (currentDrawerIdx + 1) % state.players.length;
    const nextDrawerId = state.players[nextDrawerIdx];

    if (nextRound > state.totalRounds) {
      let bestScore = -1;
      let winner: string | null = null;
      for (const pid of state.players) {
        if (scores[pid] > bestScore) {
          bestScore = scores[pid];
          winner = pid;
        }
      }

      const nextState: DrawAndGuessState = {
        ...state,
        scores,
        chatGuesses: chat,
        winnerId: winner,
        turnExpiresAt: 0,
      };

      return {
        success: true,
        state: nextState,
        events: [
          {
            type: 'GAME_OVER',
            data: { winnerId: winner, scores },
          },
        ],
      };
    }

    const available = DrawAndGuessEngine.PROMPTS.filter((p) => p !== state.secretPrompt);
    const nextPrompt =
      available[Math.floor(Math.random() * available.length)] ||
      DrawAndGuessEngine.PROMPTS[nextRound % DrawAndGuessEngine.PROMPTS.length];

    const nextState: DrawAndGuessState = {
      ...state,
      drawerId: nextDrawerId,
      secretPrompt: nextPrompt,
      strokes: [],
      chatGuesses: [],
      solvedPlayerIds: [],
      scores,
      round: nextRound,
      turnExpiresAt: Date.now() + DRAW_AND_GUESS_ROUND_MS,
    };

    return {
      success: true,
      state: nextState,
      events: [
        {
          type: 'ROUND_STARTED',
          data: { round: nextRound, drawerId: nextDrawerId },
        },
      ],
    };
  }

  checkWinner(state: DrawAndGuessState): DrawAndGuessResult | null {
    if (!state.winnerId) return null;
    return {
      winnerId: state.winnerId,
      scores: state.scores,
    };
  }
}
