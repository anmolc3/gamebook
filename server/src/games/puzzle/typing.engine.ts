import { GameEngine, GamePlayerMeta } from '../game.definition';
import { GameRegistry } from '../game.registry';
import {
  GameActionResult,
  GameDefinition,
  TypingRaceAction,
  TypingRaceResult,
  TypingRaceState,
} from '../../../../shared/game-types';

export const TYPING_RACE_TIMEOUT_MS = 45000;

export class TypingRaceEngine
  implements GameEngine<TypingRaceState, TypingRaceAction, TypingRaceResult>
{
  readonly definition: GameDefinition;

  private static PROMPTS = [
    'The quick brown fox jumps over the lazy dog in the sunny park.',
    'Technology connects players across the world in real time challenges.',
    'Fast fingers and keen focus lead to victory in every competitive race.',
  ];

  constructor() {
    this.definition = GameRegistry.getGame('TYPING_RACE') || {
      id: 'TYPING_RACE',
      name: 'Mobile Typing Race',
      category: 'COMPETITIVE',
      minPlayers: 2,
      maxPlayers: 4,
      defaultPlayers: 2,
      supportsSpectators: true,
      turnTimeSeconds: 45,
      description: 'Type the phrase accurately on mobile keyboard with live WPM tracker.',
      iconName: 'gamepad',
    };
  }

  initialize(players: GamePlayerMeta[], settings?: any): TypingRaceState {
    if (!players || players.length < 2) {
      throw new Error('Typing Race requires at least 2 players');
    }

    const playerIds = players.map((p) => p.userId);
    const promptText =
      settings?.promptText ||
      TypingRaceEngine.PROMPTS[Math.floor(Math.random() * TypingRaceEngine.PROMPTS.length)];

    const progress: Record<string, number> = {};
    const wpm: Record<string, number> = {};

    playerIds.forEach((uid) => {
      progress[uid] = 0;
      wpm[uid] = 0;
    });

    return {
      promptText,
      players: playerIds,
      progress,
      wpm,
      finishedOrder: [],
      winnerId: null,
      turnExpiresAt: Date.now() + TYPING_RACE_TIMEOUT_MS,
    };
  }

  validateAction(state: TypingRaceState, playerId: string, action: TypingRaceAction): boolean {
    if (state.winnerId) {
      throw new Error('Race already finished');
    }

    if (!state.players.includes(playerId)) {
      throw new Error('Player not in match');
    }

    if (action.type !== 'TYPE_UPDATE') {
      throw new Error(`Unsupported action type: ${action.type}`);
    }

    if (typeof action.typedText !== 'string') {
      throw new Error('typedText must be a string');
    }

    return true;
  }

  applyAction(state: TypingRaceState, playerId: string, action: TypingRaceAction): GameActionResult<TypingRaceState> {
    try {
      this.validateAction(state, playerId, action);
    } catch (err: any) {
      return { success: false, state, error: err.message };
    }

    const nextState: TypingRaceState = {
      ...state,
      progress: { ...state.progress },
      wpm: { ...state.wpm },
      finishedOrder: [...state.finishedOrder],
    };

    const typed = action.typedText;
    const prompt = nextState.promptText;

    // Calculate common prefix length
    let matchLen = 0;
    while (matchLen < typed.length && matchLen < prompt.length && typed[matchLen] === prompt[matchLen]) {
      matchLen++;
    }

    nextState.progress[playerId] = matchLen;

    // Calculate rough WPM (words = characters / 5)
    const words = matchLen / 5;
    const minutesElapsed = Math.max(0.1, (Date.now() - (nextState.turnExpiresAt - TYPING_RACE_TIMEOUT_MS)) / 60000);
    nextState.wpm[playerId] = Math.round(words / minutesElapsed);

    if (matchLen >= prompt.length && !nextState.finishedOrder.includes(playerId)) {
      nextState.finishedOrder.push(playerId);
      if (!nextState.winnerId) {
        nextState.winnerId = playerId;
      }
    }

    return { success: true, state: nextState };
  }

  checkWinner(state: TypingRaceState): TypingRaceResult | null {
    if (!state.winnerId) return null;
    return {
      winnerId: state.winnerId,
      wpmScores: state.wpm,
    };
  }

  handleTurnTimeout(state: TypingRaceState): GameActionResult<TypingRaceState> {
    let topProgress = -1;
    let winner = state.players[0];

    state.players.forEach((uid) => {
      const prog = state.progress[uid] || 0;
      if (prog > topProgress) {
        topProgress = prog;
        winner = uid;
      }
    });

    return {
      success: true,
      state: { ...state, winnerId: winner },
    };
  }
}
