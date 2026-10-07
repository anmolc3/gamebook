import { GameEngine, GamePlayerMeta } from '../game.definition';
import { GameRegistry } from '../game.registry';
import {
  GameActionResult,
  GameDefinition,
  GuessSongAction,
  GuessSongResult,
  GuessSongState,
  SongRiddle,
} from '../../../../shared/game-types';

export const GUESS_SONG_ROUND_DURATION_MS = 20000;

export class GuessSongEngine
  implements GameEngine<GuessSongState, GuessSongAction, GuessSongResult>
{
  readonly definition: GameDefinition;

  private static RIDDLES: SongRiddle[] = [
    {
      title: 'Bohemian Rhapsody',
      artist: 'Queen',
      snippetLyrics: 'Is this the real life? Is this just fantasy? Caught in a landslide...',
      options: ['Bohemian Rhapsody', 'Somebody to Love', 'We Are the Champions', 'Radio Ga Ga'],
    },
    {
      title: 'Billie Jean',
      artist: 'Michael Jackson',
      snippetLyrics: 'She told me her name was Billie Jean, as she caused a scene...',
      options: ['Thriller', 'Beat It', 'Billie Jean', 'Bad'],
    },
    {
      title: 'Hotel California',
      artist: 'Eagles',
      snippetLyrics: 'On a dark desert highway, cool wind in my hair, warm smell of colitas...',
      options: ['Desperado', 'Hotel California', 'Take It Easy', 'Life in the Fast Lane'],
    },
    {
      title: 'Shape of You',
      artist: 'Ed Sheeran',
      snippetLyrics: 'The club isn\'t the best place to find a lover so the bar is where I go...',
      options: ['Perfect', 'Thinking Out Loud', 'Shape of You', 'Bad Habits'],
    },
    {
      title: 'Rolling in the Deep',
      artist: 'Adele',
      snippetLyrics: 'There\'s a fire starting in my heart, reaching a fever pitch...',
      options: ['Hello', 'Someone Like You', 'Rolling in the Deep', 'Set Fire to the Rain'],
    },
    {
      title: 'Stayin\' Alive',
      artist: 'Bee Gees',
      snippetLyrics: 'Well, you can tell by the way I use my walk, I\'m a woman\'s man, no time to talk...',
      options: ['Night Fever', 'Stayin\' Alive', 'How Deep Is Your Love', 'Tragedy'],
    },
  ];

  constructor() {
    this.definition = GameRegistry.getGame('GUESS_SONG') || {
      id: 'GUESS_SONG',
      name: 'Name That Tune',
      category: 'PARTY',
      minPlayers: 2,
      maxPlayers: 6,
      defaultPlayers: 4,
      supportsSpectators: true,
      turnTimeSeconds: 15,
      description: 'Listen to short instrumental melodies and guess the song.',
      iconName: 'bell',
    };
  }

  initialize(players: GamePlayerMeta[], settings?: any): GuessSongState {
    if (!players || players.length < 2) {
      throw new Error('Guess Song requires at least 2 players');
    }

    const playerIds = players.map((p) => p.userId);
    const answers: Record<string, string | null> = {};
    const scores: Record<string, number> = {};

    for (const pid of playerIds) {
      answers[pid] = null;
      scores[pid] = 0;
    }

    const firstRiddle =
      settings?.riddle ||
      GuessSongEngine.RIDDLES[
        Math.floor(Math.random() * GuessSongEngine.RIDDLES.length)
      ];

    return {
      players: playerIds,
      currentRiddle: firstRiddle,
      answers,
      scores,
      round: 1,
      totalRounds: settings?.totalRounds || 4,
      winnerId: null,
      turnExpiresAt: Date.now() + GUESS_SONG_ROUND_DURATION_MS,
    };
  }

  validateAction(
    state: GuessSongState,
    playerId: string,
    action: GuessSongAction
  ): boolean {
    if (state.winnerId) {
      throw new Error('Game already concluded');
    }
    if (!state.players.includes(playerId)) {
      throw new Error('Player not in game');
    }
    if (action.type !== 'ANSWER_SONG') {
      throw new Error(`Invalid action type: ${action.type}`);
    }
    if (!action.selectedTitle) {
      throw new Error('Must specify selectedTitle');
    }
    return true;
  }

  applyAction(
    state: GuessSongState,
    playerId: string,
    action: GuessSongAction
  ): GameActionResult<GuessSongState> {
    try {
      this.validateAction(state, playerId, action);
    } catch (err: any) {
      return { success: false, state, error: err.message };
    }

    const nextAnswers = { ...state.answers, [playerId]: action.selectedTitle };
    const nextScores = { ...state.scores };

    const isCorrect =
      action.selectedTitle.toLowerCase() === state.currentRiddle.title.toLowerCase();

    if (isCorrect) {
      nextScores[playerId] = (nextScores[playerId] || 0) + 15;
    }

    // Check if all players answered
    const allAnswered = state.players.every((pid) => nextAnswers[pid] !== null);

    if (allAnswered) {
      if (state.round >= state.totalRounds) {
        let bestScore = -1;
        let winner: string | null = null;
        for (const pid of state.players) {
          if (nextScores[pid] > bestScore) {
            bestScore = nextScores[pid];
            winner = pid;
          }
        }

        const nextState: GuessSongState = {
          ...state,
          answers: nextAnswers,
          scores: nextScores,
          winnerId: winner,
          turnExpiresAt: 0,
        };

        return {
          success: true,
          state: nextState,
          events: [
            {
              type: 'GAME_OVER',
              data: { winnerId: winner, finalScores: nextScores },
            },
          ],
        };
      } else {
        const nextRound = state.round + 1;
        const available = GuessSongEngine.RIDDLES.filter(
          (r) => r.title !== state.currentRiddle.title
        );
        const nextRiddle =
          available[Math.floor(Math.random() * available.length)] ||
          GuessSongEngine.RIDDLES[nextRound % GuessSongEngine.RIDDLES.length];

        const resetAnswers: Record<string, string | null> = {};
        for (const pid of state.players) {
          resetAnswers[pid] = null;
        }

        const nextState: GuessSongState = {
          ...state,
          currentRiddle: nextRiddle,
          answers: resetAnswers,
          scores: nextScores,
          round: nextRound,
          turnExpiresAt: Date.now() + GUESS_SONG_ROUND_DURATION_MS,
        };

        return {
          success: true,
          state: nextState,
          events: [
            {
              type: 'ROUND_FINISHED',
              data: {
                correctTitle: state.currentRiddle.title,
                scores: nextScores,
                nextRound,
              },
            },
          ],
        };
      }
    }

    return {
      success: true,
      state: {
        ...state,
        answers: nextAnswers,
        scores: nextScores,
      },
      events: [
        {
          type: 'ANSWER_SUBMITTED',
          data: { playerId, isCorrect },
        },
      ],
    };
  }

  checkWinner(state: GuessSongState): GuessSongResult | null {
    if (!state.winnerId) return null;
    return {
      winnerId: state.winnerId,
      scores: state.scores,
    };
  }
}
