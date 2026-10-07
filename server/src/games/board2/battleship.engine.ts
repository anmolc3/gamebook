import { GameEngine, GamePlayerMeta } from '../game.definition';
import { GameRegistry } from '../game.registry';
import {
  GameActionResult,
  GameDefinition,
  BattleshipAction,
  BattleshipPlayerGrid,
  BattleshipResult,
  BattleshipState,
  ShipPlacement,
  ShipType,
} from '../../../../shared/game-types';

export const BATTLESHIP_TURN_DURATION_MS = 30000;

export class BattleshipEngine
  implements GameEngine<BattleshipState, BattleshipAction, BattleshipResult>
{
  readonly definition: GameDefinition;

  constructor() {
    this.definition = GameRegistry.getGame('BATTLESHIP') || {
      id: 'BATTLESHIP',
      name: 'Battleship Fleet Command',
      category: 'BOARD',
      minPlayers: 2,
      maxPlayers: 2,
      defaultPlayers: 2,
      supportsSpectators: true,
      turnTimeSeconds: 30,
      description: 'Dual 10x10 hidden grids with Carrier, Battleship, Cruiser, Submarine, and Destroyer naval combat.',
      iconName: 'shield',
    };
  }

  static generateDefaultFleet(): ShipPlacement[] {
    return [
      { type: 'CARRIER', size: 5, row: 1, col: 1, orientation: 'H', hits: 0, isSunk: false },
      { type: 'BATTLESHIP', size: 4, row: 3, col: 2, orientation: 'H', hits: 0, isSunk: false },
      { type: 'CRUISER', size: 3, row: 5, col: 1, orientation: 'V', hits: 0, isSunk: false },
      { type: 'SUBMARINE', size: 3, row: 5, col: 5, orientation: 'H', hits: 0, isSunk: false },
      { type: 'DESTROYER', size: 2, row: 8, col: 7, orientation: 'H', hits: 0, isSunk: false },
    ];
  }

  initialize(players: GamePlayerMeta[], settings?: any): BattleshipState {
    if (!players || players.length < 2) {
      throw new Error('Battleship requires exactly 2 players');
    }

    const p1 = players[0];
    const p2 = players[1];

    const playerGrids: Record<string, BattleshipPlayerGrid> = {
      [p1.userId]: {
        userId: p1.userId,
        ships: BattleshipEngine.generateDefaultFleet(),
        shotsReceived: [],
        isReady: true,
      },
      [p2.userId]: {
        userId: p2.userId,
        ships: BattleshipEngine.generateDefaultFleet(),
        shotsReceived: [],
        isReady: true,
      },
    };

    return {
      stage: 'BATTLE',
      players: playerGrids,
      turnPlayerId: p1.userId,
      winnerId: null,
      turnExpiresAt: Date.now() + BATTLESHIP_TURN_DURATION_MS,
    };
  }

  validateAction(
    state: BattleshipState,
    playerId: string,
    action: BattleshipAction
  ): boolean {
    if (state.winnerId || state.stage === 'FINISHED') {
      throw new Error('Match is already finished');
    }

    if (action.type === 'PLACE_SHIPS') {
      if (!action.ships || action.ships.length !== 5) {
        throw new Error('Must place all 5 ships in fleet');
      }
      return true;
    }

    if (action.type === 'FIRE') {
      if (state.stage !== 'BATTLE') {
        throw new Error('Fleet placement still in progress');
      }
      if (state.turnPlayerId !== playerId) {
        throw new Error('Not your turn to fire');
      }
      if (
        action.row === undefined ||
        action.row < 0 ||
        action.row > 9 ||
        action.col === undefined ||
        action.col < 0 ||
        action.col > 9
      ) {
        throw new Error('Target coordinates must be within 0..9 grid');
      }

      const opponentId = Object.keys(state.players).find((id) => id !== playerId);
      if (opponentId) {
        const opponentGrid = state.players[opponentId];
        const alreadyFired = opponentGrid.shotsReceived.some(
          (s) => s.row === action.row && s.col === action.col
        );
        if (alreadyFired) {
          throw new Error('Coordinates already targeted previously');
        }
      }
      return true;
    }

    throw new Error('Unknown action type');
  }

  applyAction(
    state: BattleshipState,
    playerId: string,
    action: BattleshipAction
  ): GameActionResult<BattleshipState> {
    this.validateAction(state, playerId, action);

    if (action.type === 'PLACE_SHIPS' && action.ships) {
      const updatedPlayers = {
        ...state.players,
        [playerId]: {
          ...state.players[playerId],
          ships: action.ships,
          isReady: true,
        },
      };

      const allReady = Object.values(updatedPlayers).every((p) => p.isReady);
      const nextState: BattleshipState = {
        ...state,
        players: updatedPlayers,
        stage: allReady ? 'BATTLE' : 'PLACEMENT',
      };
      return { success: true, state: nextState };
    }

    if (action.type === 'FIRE') {
      const row = action.row!;
      const col = action.col!;
      const opponentId = Object.keys(state.players).find((id) => id !== playerId)!;
      const opponentGrid = state.players[opponentId];

      const ships = opponentGrid.ships.map((s) => ({ ...s }));
      let hitShip: ShipPlacement | null = null;

      for (const ship of ships) {
        const isHit =
          ship.orientation === 'H'
            ? ship.row === row && col >= ship.col && col < ship.col + ship.size
            : ship.col === col && row >= ship.row && row < ship.row + ship.size;

        if (isHit) {
          hitShip = ship;
          ship.hits += 1;
          if (ship.hits >= ship.size) {
            ship.isSunk = true;
          }
          break;
        }
      }

      const shotStatus: 'HIT' | 'MISS' = hitShip ? 'HIT' : 'MISS';
      const shotsReceived = [
        ...opponentGrid.shotsReceived,
        { row, col, status: shotStatus },
      ];

      const allSunk = ships.every((s) => s.isSunk);
      const winnerId = allSunk ? playerId : null;
      const nextStage = allSunk ? 'FINISHED' : 'BATTLE';

      const updatedPlayers: Record<string, BattleshipPlayerGrid> = {
        ...state.players,
        [opponentId]: {
          ...opponentGrid,
          ships,
          shotsReceived,
        },
      };

      const nextState: BattleshipState = {
        ...state,
        players: updatedPlayers,
        stage: nextStage,
        turnPlayerId: allSunk ? playerId : opponentId,
        winnerId,
        lastShot: {
          firedBy: playerId,
          row,
          col,
          result: hitShip ? (hitShip.isSunk ? 'SUNK' : 'HIT') : 'MISS',
          sunkShipType: hitShip && hitShip.isSunk ? hitShip.type : undefined,
        },
        turnExpiresAt: allSunk ? 0 : Date.now() + BATTLESHIP_TURN_DURATION_MS,
      };

      return {
        success: true,
        state: nextState,
        events: [
          {
            type: 'battleship:fired',
            data: {
              firedBy: playerId,
              row,
              col,
              result: hitShip ? (hitShip.isSunk ? 'SUNK' : 'HIT') : 'MISS',
              winnerId,
            },
          },
        ],
      };
    }

    return { success: true, state };
  }

  checkWinner(state: BattleshipState): BattleshipResult | null {
    if (state.winnerId) {
      const shotsCount: Record<string, number> = {};
      Object.keys(state.players).forEach((id) => {
        shotsCount[id] = state.players[id].shotsReceived.length;
      });
      return {
        winnerId: state.winnerId,
        shotsCount,
      };
    }
    return null;
  }

  handleTurnTimeout(
    state: BattleshipState
  ): GameActionResult<BattleshipState> {
    const opponentId = Object.keys(state.players).find(
      (id) => id !== state.turnPlayerId
    )!;
    const opponentGrid = state.players[opponentId];

    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 10; c++) {
        const alreadyFired = opponentGrid.shotsReceived.some(
          (s) => s.row === r && s.col === c
        );
        if (!alreadyFired) {
          return this.applyAction(
            state,
            state.turnPlayerId,
            { type: 'FIRE', row: r, col: c }
          );
        }
      }
    }
    return { success: true, state };
  }
}
