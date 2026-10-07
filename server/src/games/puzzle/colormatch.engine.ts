import { GameEngine, GamePlayerMeta } from '../game.definition';
import { GameRegistry } from '../game.registry';
import {
  ColorMatchAction,
  ColorMatchItem,
  ColorMatchResult,
  ColorMatchState,
  GameActionResult,
  GameDefinition,
} from '../../../../shared/game-types';

export const COLOR_MATCH_ROUND_DURATION_MS = 6000;

export class ColorMatchEngine
  implements GameEngine<ColorMatchState, ColorMatchAction, ColorMatchResult>
{
  readonly definition: GameDefinition;

  private static COLOR_PAIRS: { word: string; hex: string }[] = [
    { word: 'RED', hex: '#EF4444' },
    { word: 'BLUE', hex: '#3B82F6' },
    { word: 'GREEN', hex: '#10B981' },
    { word: 'YELLOW', hex: '#F59E0B' },
  ];

  constructor() {
    this.definition = GameRegistry.getGame('COLOR_MATCH') || {
      id: 'COLOR_MATCH',
      name: 'Color Match Reflex',
      category: 'COMPETITIVE',
      minPlayers: 2,
      maxPlayers: 4,
      defaultPlayers: 2,
      supportsSpectators: true,
      turnTimeSeconds: 5,
      description: 'Stroop effect reflex test: match word color vs text meaning.',
      iconName: 'palette',
    };
  }

  private generateItem(): ColorMatchItem {
    const isMatching = Math.random() < 0.5;
    const pair1 = ColorMatchEngine.COLOR_PAIRS[Math.floor(Math.random() * ColorMatchEngine.COLOR_PAIRS.length)];
    if (isMatching) {
      return { word: pair1.word, displayColor: pair1.hex, isMatching: true };
    }
    const otherPairs = ColorMatchEngine.COLOR_PAIRS.filter((p) => p.word !== pair1.word);
    const pair2 = otherPairs[Math.floor(Math.random() * otherPairs.length)];
    return { word: pair1.word, displayColor: pair2.hex, isMatching: false };
  }

  initialize(players: GamePlayerMeta[], settings?: any): ColorMatchState {
    if (!players || players.length < 2) {
      throw new Error('Color Match requires at least 2 players');
    }

    const playerIds = players.map((p) => p.userId);
    const scores: Record<string, number> = {};
    const playerAnswers: Record<string, boolean | null> = {};

    playerIds.forEach((uid) => {
      scores[uid] = 0;
      playerAnswers[uid] = null;
    });

    return {
      players: playerIds,
      currentRound: 1,
      totalRounds: settings?.totalRounds || 5,
      currentItem: this.generateItem(),
      scores,
      playerAnswers,
      winnerId: null,
      turnExpiresAt: Date.now() + COLOR_MATCH_ROUND_DURATION_MS,
    };
  }

  validateAction(state: ColorMatchState, playerId: string, action: ColorMatchAction): boolean {
    if (state.winnerId) {
      throw new Error('Game already finished');
    }

    if (!state.players.includes(playerId)) {
      throw new Error('Player not in match');
    }

    if (action.type !== 'ANSWER') {
      throw new Error(`Unsupported action type: ${action.type}`);
    }

    if (typeof action.matches !== 'boolean') {
      throw new Error('Action matches must be a boolean');
    }

    return true;
  }

  applyAction(state: ColorMatchState, playerId: string, action: ColorMatchAction): GameActionResult<ColorMatchState> {
    try {
      this.validateAction(state, playerId, action);
    } catch (err: any) {
      return { success: false, state, error: err.message };
    }

    const nextState: ColorMatchState = {
      ...state,
      scores: { ...state.scores },
      playerAnswers: { ...state.playerAnswers, [playerId]: action.matches },
    };

    // Calculate score
    const isCorrect = action.matches === nextState.currentItem.isMatching;
    if (isCorrect) {
      nextState.scores[playerId] = (nextState.scores[playerId] || 0) + 10;
    }

    // Check if all players answered this round
    const allAnswered = nextState.players.every((uid) => nextState.playerAnswers[uid] !== null);

    if (allAnswered) {
      if (nextState.currentRound >= nextState.totalRounds) {
        // Match over
        let topScore = -1;
        let winner = nextState.players[0];
        nextState.players.forEach((uid) => {
          if (nextState.scores[uid] > topScore) {
            topScore = nextState.scores[uid];
            winner = uid;
          }
        });
        nextState.winnerId = winner;
      } else {
        // Next round
        nextState.currentRound += 1;
        nextState.currentItem = this.generateItem();
        nextState.players.forEach((uid) => {
          nextState.playerAnswers[uid] = null;
        });
        nextState.turnExpiresAt = Date.now() + COLOR_MATCH_ROUND_DURATION_MS;
      }
    }

    return { success: true, state: nextState };
  }

  checkWinner(state: ColorMatchState): ColorMatchResult | null {
    if (!state.winnerId) return null;
    return {
      winnerId: state.winnerId,
      scores: state.scores,
    };
  }

  handleTurnTimeout(state: ColorMatchState): GameActionResult<ColorMatchState> {
    const unrec = state.players.find((uid) => state.playerAnswers[uid] === null);
    if (!unrec) return { success: true, state };

    return this.applyAction(state, unrec, { type: 'ANSWER', matches: false });
  }
}
