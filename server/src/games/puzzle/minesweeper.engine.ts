import { GameEngine, GamePlayerMeta } from '../game.definition';
import { GameRegistry } from '../game.registry';
import {
  GameActionResult,
  GameDefinition,
  MinesweeperAction,
  MinesweeperCell,
  MinesweeperResult,
  MinesweeperState,
} from '../../../../shared/game-types';

export const MINESWEEPER_TURN_DURATION_MS = 25000;

export class MinesweeperEngine
  implements GameEngine<MinesweeperState, MinesweeperAction, MinesweeperResult>
{
  readonly definition: GameDefinition;

  constructor() {
    this.definition = GameRegistry.getGame('MINESWEEPER_DUEL') || {
      id: 'MINESWEEPER_DUEL',
      name: 'Minesweeper Battle',
      category: 'PUZZLE',
      minPlayers: 2,
      maxPlayers: 2,
      defaultPlayers: 2,
      supportsSpectators: true,
      turnTimeSeconds: 30,
      description: 'Flag mines and clear safe cells with turn steals.',
      iconName: 'shield',
    };
  }

  private generateGrid(rows = 8, cols = 8, mineCount = 10): MinesweeperCell[][] {
    const grid: MinesweeperCell[][] = [];
    for (let r = 0; r < rows; r++) {
      grid[r] = [];
      for (let c = 0; c < cols; c++) {
        grid[r][c] = {
          row: r,
          col: c,
          isMine: false,
          adjacentMines: 0,
          isRevealed: false,
          isFlagged: false,
        };
      }
    }

    // Place mines
    let placed = 0;
    while (placed < mineCount) {
      const r = Math.floor(Math.random() * rows);
      const c = Math.floor(Math.random() * cols);
      if (!grid[r][c].isMine) {
        grid[r][c].isMine = true;
        placed++;
      }
    }

    // Calculate adjacent counts
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (!grid[r][c].isMine) {
          let count = 0;
          for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
              const nr = r + dr;
              const nc = c + dc;
              if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && grid[nr][nc].isMine) {
                count++;
              }
            }
          }
          grid[r][c].adjacentMines = count;
        }
      }
    }

    return grid;
  }

  initialize(players: GamePlayerMeta[]): MinesweeperState {
    if (!players || players.length < 2) {
      throw new Error('Minesweeper requires 2 players');
    }

    const p1 = players[0].userId;
    const p2 = players[1].userId;
    const grid = this.generateGrid();

    return {
      grid,
      players: [p1, p2],
      turnPlayerId: p1,
      scores: { [p1]: 0, [p2]: 0 },
      mineCount: 10,
      remainingMines: 10,
      winnerId: null,
      turnExpiresAt: Date.now() + MINESWEEPER_TURN_DURATION_MS,
    };
  }

  validateAction(state: MinesweeperState, playerId: string, action: MinesweeperAction): boolean {
    if (state.winnerId) {
      throw new Error('Game already finished');
    }

    if (state.turnPlayerId !== playerId) {
      throw new Error(`Not your turn. Turn belongs to ${state.turnPlayerId}`);
    }

    const { row, col } = action;
    if (row < 0 || row >= state.grid.length || col < 0 || col >= state.grid[0].length) {
      throw new Error('Coordinates out of bounds');
    }

    const cell = state.grid[row][col];
    if (cell.isRevealed) {
      throw new Error('Cell is already revealed');
    }

    return true;
  }

  private floodFill(grid: MinesweeperCell[][], startR: number, startC: number): number {
    const queue: [number, number][] = [[startR, startC]];
    let revealedCount = 0;
    const visited = new Set<string>();
    visited.add(`${startR},${startC}`);

    while (queue.length > 0) {
      const [r, c] = queue.shift()!;
      const cell = grid[r][c];
      cell.isRevealed = true;
      revealedCount++;

      if (cell.adjacentMines === 0 && !cell.isMine) {
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            const nr = r + dr;
            const nc = c + dc;
            const key = `${nr},${nc}`;
            if (
              nr >= 0 &&
              nr < grid.length &&
              nc >= 0 &&
              nc < grid[0].length &&
              !visited.has(key) &&
              !grid[nr][nc].isRevealed &&
              !grid[nr][nc].isMine
            ) {
              visited.add(key);
              queue.push([nr, nc]);
            }
          }
        }
      }
    }
    return revealedCount;
  }

  applyAction(state: MinesweeperState, playerId: string, action: MinesweeperAction): GameActionResult<MinesweeperState> {
    try {
      this.validateAction(state, playerId, action);
    } catch (err: any) {
      return { success: false, state, error: err.message };
    }

    const nextState: MinesweeperState = {
      ...state,
      grid: state.grid.map((row) => row.map((cell) => ({ ...cell }))),
      scores: { ...state.scores },
    };

    const cell = nextState.grid[action.row][action.col];
    const opponentId = state.players.find((uid) => uid !== playerId)!;
    let retainTurn = false;

    if (action.type === 'FLAG') {
      if (cell.isFlagged) {
        cell.isFlagged = false;
        cell.flaggedBy = undefined;
      } else {
        cell.isFlagged = true;
        cell.flaggedBy = playerId;
        if (cell.isMine) {
          // Successfully found mine: +10 pts and retain turn
          nextState.scores[playerId] += 10;
          nextState.remainingMines = Math.max(0, nextState.remainingMines - 1);
          retainTurn = true;
        } else {
          // False flag: -5 penalty
          nextState.scores[playerId] = Math.max(0, nextState.scores[playerId] - 5);
        }
      }
    } else if (action.type === 'REVEAL') {
      if (cell.isMine) {
        // Hit a mine! -20 penalty, mine revealed
        cell.isRevealed = true;
        cell.revealedBy = playerId;
        nextState.scores[playerId] = Math.max(0, nextState.scores[playerId] - 20);
        nextState.remainingMines = Math.max(0, nextState.remainingMines - 1);
      } else {
        // Safe cell reveal
        const count = this.floodFill(nextState.grid, action.row, action.col);
        nextState.scores[playerId] += count * 2;
      }
    }

    // Check game end: all mines revealed or flagged, or remainingMines === 0
    if (nextState.remainingMines === 0) {
      const [p1, p2] = nextState.players;
      nextState.winnerId = nextState.scores[p1] >= nextState.scores[p2] ? p1 : p2;
    } else if (!retainTurn) {
      nextState.turnPlayerId = opponentId;
    }

    nextState.turnExpiresAt = Date.now() + MINESWEEPER_TURN_DURATION_MS;
    return { success: true, state: nextState };
  }

  checkWinner(state: MinesweeperState): MinesweeperResult | null {
    if (!state.winnerId) return null;
    return {
      winnerId: state.winnerId,
      scores: state.scores,
    };
  }

  handleTurnTimeout(state: MinesweeperState): GameActionResult<MinesweeperState> {
    const unrevealed: [number, number][] = [];
    for (let r = 0; r < state.grid.length; r++) {
      for (let c = 0; c < state.grid[0].length; c++) {
        if (!state.grid[r][c].isRevealed && !state.grid[r][c].isFlagged) {
          unrevealed.push([r, c]);
        }
      }
    }
    if (unrevealed.length === 0) return { success: true, state };
    const [row, col] = unrevealed[0];
    return this.applyAction(state, state.turnPlayerId, { type: 'REVEAL', row, col });
  }
}
