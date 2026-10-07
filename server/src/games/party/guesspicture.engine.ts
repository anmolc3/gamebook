import { GameEngine, GamePlayerMeta } from '../game.definition';
import { GameRegistry } from '../game.registry';
import {
  GameActionResult,
  GameDefinition,
  GuessPictureAction,
  GuessPictureResult,
  GuessPictureState,
} from '../../../../shared/game-types';

export const GUESS_PICTURE_DURATION_MS = 30000;

interface PictureItem {
  targetWord: string;
  category: string;
  clueHint: string;
}

export class GuessPictureEngine
  implements GameEngine<GuessPictureState, GuessPictureAction, GuessPictureResult>
{
  readonly definition: GameDefinition;

  private static ITEMS: PictureItem[] = [
    { targetWord: 'Eiffel Tower', category: 'Landmark', clueHint: 'Iron lattice monument in Paris, France' },
    { targetWord: 'Pyramids', category: 'Landmark', clueHint: 'Ancient monumental stone tombs in Giza, Egypt' },
    { targetWord: 'Guitar', category: 'Instrument', clueHint: 'Six-string acoustic or electric musical instrument' },
    { targetWord: 'Astronaut', category: 'Profession', clueHint: 'Person trained to travel in a spacecraft' },
    { targetWord: 'Volcano', category: 'Nature', clueHint: 'Mountain opening downward to a pool of molten rock' },
    { targetWord: 'Helicopter', category: 'Vehicle', clueHint: 'Rotorcraft with horizontal spinning blades' },
    { targetWord: 'Kangaroo', category: 'Animals', clueHint: 'Marsupial from Australia known for powerful hopping' },
    { targetWord: 'Colosseum', category: 'Landmark', clueHint: 'Ancient oval amphitheatre in the centre of Rome' },
  ];

  constructor() {
    this.definition = GameRegistry.getGame('GUESS_PICTURE') || {
      id: 'GUESS_PICTURE',
      name: 'Pixel Reveal Guess',
      category: 'PARTY',
      minPlayers: 2,
      maxPlayers: 6,
      defaultPlayers: 4,
      supportsSpectators: true,
      turnTimeSeconds: 20,
      description: 'Identify the image as tiles slowly disappear.',
      iconName: 'eye',
    };
  }

  initialize(players: GamePlayerMeta[], settings?: any): GuessPictureState {
    if (!players || players.length < 2) {
      throw new Error('Guess Picture requires at least 2 players');
    }

    const playerIds = players.map((p) => p.userId);
    const scores: Record<string, number> = {};
    for (const pid of playerIds) {
      scores[pid] = 0;
    }

    const item =
      settings?.item ||
      GuessPictureEngine.ITEMS[
        Math.floor(Math.random() * GuessPictureEngine.ITEMS.length)
      ];

    return {
      players: playerIds,
      targetWord: item.targetWord,
      category: item.category,
      clueHint: item.clueHint,
      pixelationLevel: 10,
      scores,
      solvedPlayerId: null,
      winnerId: null,
      turnExpiresAt: Date.now() + GUESS_PICTURE_DURATION_MS,
    };
  }

  validateAction(
    state: GuessPictureState,
    playerId: string,
    action: GuessPictureAction
  ): boolean {
    if (state.winnerId || state.solvedPlayerId) {
      throw new Error('Round already completed');
    }
    if (!state.players.includes(playerId)) {
      throw new Error('Player not in game');
    }
    if (action.type !== 'SUBMIT_GUESS') {
      throw new Error(`Invalid action type: ${action.type}`);
    }
    if (!action.guess || action.guess.trim().length === 0) {
      throw new Error('Guess cannot be empty');
    }
    return true;
  }

  applyAction(
    state: GuessPictureState,
    playerId: string,
    action: GuessPictureAction
  ): GameActionResult<GuessPictureState> {
    try {
      this.validateAction(state, playerId, action);
    } catch (err: any) {
      return { success: false, state, error: err.message };
    }

    const cleanGuess = action.guess.trim().toLowerCase();
    const isCorrect = cleanGuess === state.targetWord.toLowerCase();

    if (isCorrect) {
      const award = state.pixelationLevel * 10;
      const nextScores = { ...state.scores, [playerId]: (state.scores[playerId] || 0) + award };

      const nextState: GuessPictureState = {
        ...state,
        pixelationLevel: 1, // fully revealed
        solvedPlayerId: playerId,
        winnerId: playerId,
        scores: nextScores,
        turnExpiresAt: 0,
      };

      return {
        success: true,
        state: nextState,
        events: [
          {
            type: 'PICTURE_SOLVED',
            data: {
              solverId: playerId,
              word: state.targetWord,
              pointsAwarded: award,
              finalScores: nextScores,
            },
          },
        ],
      };
    }

    // On wrong guess, reveal more detail (reduce pixelation)
    const nextLevel = Math.max(1, state.pixelationLevel - 1);

    const nextState: GuessPictureState = {
      ...state,
      pixelationLevel: nextLevel,
    };

    return {
      success: true,
      state: nextState,
      events: [
        {
          type: 'INCORRECT_GUESS',
          data: {
            playerId,
            guess: action.guess,
            pixelationLevel: nextLevel,
          },
        },
      ],
    };
  }

  checkWinner(state: GuessPictureState): GuessPictureResult | null {
    if (!state.winnerId) return null;
    return {
      winnerId: state.winnerId,
      scores: state.scores,
    };
  }
}
