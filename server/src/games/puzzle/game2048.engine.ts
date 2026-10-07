import { GameEngine, GamePlayerMeta } from '../game.definition';
import { GameRegistry } from '../game.registry';
import {
  Game2048Action,
  Game2048Result,
  Game2048State,
  GameActionResult,
  GameDefinition,
} from '../../../../shared/game-types';

export const GAME_2048_TIMEOUT_MS = 120000;

export class Game2048Engine implements GameEngine<Game2048State, Game2048Action, Game2048Result> {
  readonly definition: GameDefinition;

  constructor() {
    this.definition = GameRegistry.getGame('2048_MULTIPLAYER') || {
      id: '2048_MULTIPLAYER',
      name: '2048 Versus Race',
      category: 'PUZZLE',
      minPlayers: 2,
      maxPlayers: 4,
      defaultPlayers: 2,
      supportsSpectators: true,
      turnTimeSeconds: 120,
      description: 'Slide tiles and merge to 2048 while racing live opponent boards.',
      iconName: 'target',
    };
  }

  private spawnTile(board: number[][]): void {
    const emptySlots: [number, number][] = [];
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        if (board[r][c] === 0) emptySlots.push([r, c]);
      }
    }
    if (emptySlots.length > 0) {
      const [r, c] = emptySlots[Math.floor(Math.random() * emptySlots.length)];
      board[r][c] = Math.random() < 0.9 ? 2 : 4;
    }
  }

  private createBoard(): number[][] {
    const board = [
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ];
    this.spawnTile(board);
    this.spawnTile(board);
    return board;
  }

  initialize(players: GamePlayerMeta[]): Game2048State {
    if (!players || players.length < 2) {
      throw new Error('2048 requires at least 2 players');
    }

    const playerBoards: Record<string, number[][]> = {};
    const scores: Record<string, number> = {};
    const highestTiles: Record<string, number> = {};
    const gameOver: Record<string, boolean> = {};

    players.forEach((p) => {
      playerBoards[p.userId] = this.createBoard();
      scores[p.userId] = 0;
      highestTiles[p.userId] = 2;
      gameOver[p.userId] = false;
    });

    return {
      playerBoards,
      scores,
      highestTiles,
      gameOver,
      winnerId: null,
      turnExpiresAt: Date.now() + GAME_2048_TIMEOUT_MS,
    };
  }

  validateAction(state: Game2048State, playerId: string, action: Game2048Action): boolean {
    if (state.winnerId) {
      throw new Error('Game already finished');
    }

    if (!state.playerBoards[playerId]) {
      throw new Error('Player not in match');
    }

    if (state.gameOver[playerId]) {
      throw new Error('Player board is already locked');
    }

    if (action.type !== 'MOVE') {
      throw new Error(`Unsupported action type: ${action.type}`);
    }

    if (!['UP', 'DOWN', 'LEFT', 'RIGHT'].includes(action.direction)) {
      throw new Error('Invalid slide direction');
    }

    return true;
  }

  private slideAndMerge(board: number[][], direction: string): { moved: boolean; scoreDelta: number } {
    let moved = false;
    let scoreDelta = 0;

    // Helper: slide a single line of 4 elements to the left
    const slideLine = (line: number[]): number[] => {
      let filtered = line.filter((v) => v !== 0);
      for (let i = 0; i < filtered.length - 1; i++) {
        if (filtered[i] === filtered[i + 1]) {
          filtered[i] *= 2;
          scoreDelta += filtered[i];
          filtered[i + 1] = 0;
        }
      }
      filtered = filtered.filter((v) => v !== 0);
      while (filtered.length < 4) filtered.push(0);
      return filtered;
    };

    if (direction === 'LEFT') {
      for (let r = 0; r < 4; r++) {
        const orig = [...board[r]];
        board[r] = slideLine(board[r]);
        if (orig.some((v, idx) => v !== board[r][idx])) moved = true;
      }
    } else if (direction === 'RIGHT') {
      for (let r = 0; r < 4; r++) {
        const orig = [...board[r]];
        const reversed = [...board[r]].reverse();
        const slid = slideLine(reversed).reverse();
        board[r] = slid;
        if (orig.some((v, idx) => v !== board[r][idx])) moved = true;
      }
    } else if (direction === 'UP') {
      for (let c = 0; c < 4; c++) {
        const orig = [board[0][c], board[1][c], board[2][c], board[3][c]];
        const slid = slideLine(orig);
        for (let r = 0; r < 4; r++) {
          if (board[r][c] !== slid[r]) moved = true;
          board[r][c] = slid[r];
        }
      }
    } else if (direction === 'DOWN') {
      for (let c = 0; c < 4; c++) {
        const orig = [board[0][c], board[1][c], board[2][c], board[3][c]];
        const reversed = [...orig].reverse();
        const slid = slideLine(reversed).reverse();
        for (let r = 0; r < 4; r++) {
          if (board[r][c] !== slid[r]) moved = true;
          board[r][c] = slid[r];
        }
      }
    }

    return { moved, scoreDelta };
  }

  applyAction(state: Game2048State, playerId: string, action: Game2048Action): GameActionResult<Game2048State> {
    try {
      this.validateAction(state, playerId, action);
    } catch (err: any) {
      return { success: false, state, error: err.message };
    }

    const nextState: Game2048State = {
      ...state,
      playerBoards: {
        ...state.playerBoards,
        [playerId]: state.playerBoards[playerId].map((row) => [...row]),
      },
      scores: { ...state.scores },
      highestTiles: { ...state.highestTiles },
      gameOver: { ...state.gameOver },
    };

    const board = nextState.playerBoards[playerId];
    const { moved, scoreDelta } = this.slideAndMerge(board, action.direction);

    if (moved) {
      nextState.scores[playerId] = (nextState.scores[playerId] || 0) + scoreDelta;
      this.spawnTile(board);

      // Recalculate highest tile
      let maxTile = 0;
      for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 4; c++) {
          if (board[r][c] > maxTile) maxTile = board[r][c];
        }
      }
      nextState.highestTiles[playerId] = maxTile;

      // 2048 victory condition!
      if (maxTile >= 2048) {
        nextState.winnerId = playerId;
      }
    }

    return { success: true, state: nextState };
  }

  checkWinner(state: Game2048State): Game2048Result | null {
    if (!state.winnerId) return null;
    return {
      winnerId: state.winnerId,
      finalScores: state.scores,
      highestTiles: state.highestTiles,
    };
  }

  handleTurnTimeout(state: Game2048State): GameActionResult<Game2048State> {
    const playerIds = Object.keys(state.playerBoards);
    let topScore = -1;
    let winner = playerIds[0];

    playerIds.forEach((uid) => {
      const score = state.scores[uid] || 0;
      if (score > topScore) {
        topScore = score;
        winner = uid;
      }
    });

    return {
      success: true,
      state: { ...state, winnerId: winner },
    };
  }
}
