import { GameAI, AiDifficulty } from './ai.interface';
import { TicTacToeAI } from './games/tictactoe.ai';
import { ConnectFourAI } from './games/connectfour.ai';
import { CheckersAI } from './games/checkers.ai';
import { ChessAI } from './games/chess.ai';
import { ReversiAI } from './games/reversi.ai';
import { GomokuAI } from './games/gomoku.ai';
import { MancalaAI } from './games/mancala.ai';
import { BattleshipAI } from './games/battleship.ai';
import { LudoAI } from './games/ludo.ai';
import { DominoesAI } from './games/dominoes.ai';
import { BackgammonAI } from './games/backgammon.ai';
import { RpsAI } from './games/rps.ai';
import { BlackjackAI } from './games/blackjack.ai';
import { UnoAI } from './games/uno.ai';
import { WarAI } from './games/war.ai';

export class AiRegistry {
  private static aiInstances = new Map<string, GameAI>();

  static {
    // Priority 1 Board games
    this.register('TICTACTOE', new TicTacToeAI());
    this.register('CONNECT_FOUR', new ConnectFourAI());
    this.register('CHECKERS', new CheckersAI());
    this.register('CHESS', new ChessAI());
    this.register('REVERSI', new ReversiAI());
    this.register('GOMOKU', new GomokuAI());
    this.register('MANCALA', new MancalaAI());
    this.register('BATTLESHIP', new BattleshipAI());
    this.register('LUDO', new LudoAI());
    this.register('DOMINOES', new DominoesAI());
    this.register('BACKGAMMON', new BackgammonAI());
    this.register('ROCK_PAPER_SCISSORS', new RpsAI());

    // Priority 2 Card games
    this.register('BLACKJACK', new BlackjackAI());
    this.register('UNO_STYLE', new UnoAI());
    this.register('WAR', new WarAI());
  }

  static register(gameType: string, ai: GameAI): void {
    this.aiInstances.set(gameType.toUpperCase(), ai);
  }

  static isAiSupported(gameType: string): boolean {
    return this.aiInstances.has(gameType.toUpperCase());
  }

  static getAi(gameType: string): GameAI | undefined {
    return this.aiInstances.get(gameType.toUpperCase());
  }

  static async getMove(
    gameType: string,
    state: any,
    aiPlayerId: string,
    difficulty: AiDifficulty
  ): Promise<any> {
    const ai = this.getAi(gameType);
    if (!ai) {
      throw new Error(`AI opponent not supported for game "${gameType}"`);
    }
    return Promise.resolve(ai.getMove(state, aiPlayerId, difficulty));
  }
}
