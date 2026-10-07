import { GameEngine, GamePlayerMeta } from '../game.definition';
import { GameRegistry } from '../game.registry';
import {
  GameActionResult,
  GameDefinition,
  CarromAction,
  CarromPiece,
  CarromPieceType,
  CarromPlayerState,
  CarromResult,
  CarromState,
} from '../../../../shared/game-types';

export const CARROM_TURN_DURATION_MS = 30000;

export class CarromEngine
  implements GameEngine<CarromState, CarromAction, CarromResult>
{
  readonly definition: GameDefinition;

  constructor() {
    this.definition = GameRegistry.getGame('CARROM') || {
      id: 'CARROM',
      name: 'Carrom Board',
      category: 'BOARD',
      minPlayers: 2,
      maxPlayers: 4,
      defaultPlayers: 2,
      supportsSpectators: true,
      turnTimeSeconds: 30,
      description: 'Traditional tabletop board with physics striker aiming, power charging, and queen cover mechanics.',
      iconName: 'target',
    };
  }

  initialize(players: GamePlayerMeta[], settings?: any): CarromState {
    if (!players || players.length < 2) {
      throw new Error('Carrom requires at least 2 players');
    }

    const p1 = players[0];
    const p2 = players[1];

    const playerStates: CarromPlayerState[] = [
      { userId: p1.userId, color: 'WHITE', score: 0, pocketedCount: 0 },
      { userId: p2.userId, color: 'BLACK', score: 0, pocketedCount: 0 },
    ];

    // Initialize 19 pieces at the center
    const pieces: CarromPiece[] = [];

    // 1 Queen (Red) at center
    pieces.push({
      id: 'queen',
      type: 'QUEEN',
      x: 50,
      y: 50,
      isPocketed: false,
    });

    // 6 inner ring pieces
    const innerRadius = 5;
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI) / 3;
      const type: CarromPieceType = i % 2 === 0 ? 'WHITE' : 'BLACK';
      pieces.push({
        id: `inner-${type.toLowerCase()}-${i}`,
        type,
        x: Number((50 + innerRadius * Math.cos(angle)).toFixed(1)),
        y: Number((50 + innerRadius * Math.sin(angle)).toFixed(1)),
        isPocketed: false,
      });
    }

    // 12 outer ring pieces
    const outerRadius = 10;
    for (let i = 0; i < 12; i++) {
      const angle = (i * Math.PI) / 6;
      const type: CarromPieceType = i % 2 === 0 ? 'BLACK' : 'WHITE';
      pieces.push({
        id: `outer-${type.toLowerCase()}-${i}`,
        type,
        x: Number((50 + outerRadius * Math.cos(angle)).toFixed(1)),
        y: Number((50 + outerRadius * Math.sin(angle)).toFixed(1)),
        isPocketed: false,
      });
    }

    return {
      pieces,
      players: playerStates,
      turnPlayerId: p1.userId,
      queenCoverPending: false,
      queenPocketedBy: null,
      strikerFoul: false,
      winnerId: null,
      isDraw: false,
      turnExpiresAt: Date.now() + CARROM_TURN_DURATION_MS,
    };
  }

  validateAction(
    state: CarromState,
    playerId: string,
    action: CarromAction
  ): boolean {
    if (state.winnerId || state.isDraw) {
      throw new Error('Match is already finished');
    }
    if (state.turnPlayerId !== playerId) {
      throw new Error('Not your turn to strike');
    }
    if (action.type !== 'STRIKE') {
      throw new Error('Invalid action type');
    }
    if (action.strikerX < 15 || action.strikerX > 85) {
      throw new Error('Striker must be placed on baseline (15..85)');
    }
    if (action.power <= 0 || action.power > 100) {
      throw new Error('Power must be between 1 and 100');
    }
    return true;
  }

  applyAction(
    state: CarromState,
    playerId: string,
    action: CarromAction
  ): GameActionResult<CarromState> {
    this.validateAction(state, playerId, action);

    const playerIndex = state.players.findIndex((p) => p.userId === playerId);
    const opponentIndex = (playerIndex + 1) % state.players.length;
    const player = { ...state.players[playerIndex] };
    const opponent = { ...state.players[opponentIndex] };

    const pieces = state.pieces.map((p) => ({ ...p }));
    let piecePocketedThisShot: CarromPiece | null = null;
    let strikerFoul = false;

    if (action.targetPieceId) {
      const target = pieces.find((p) => p.id === action.targetPieceId && !p.isPocketed);
      if (target) {
        target.isPocketed = true;
        piecePocketedThisShot = target;
      }
    } else {
      const unpocketed = pieces.filter((p) => !p.isPocketed);
      if (unpocketed.length > 0 && action.power >= 40) {
        const ownColorPiece = unpocketed.find(
          (p) => p.type === player.color || p.type === 'QUEEN'
        );
        const selected = ownColorPiece || unpocketed[0];
        selected.isPocketed = true;
        piecePocketedThisShot = selected;
      }
    }

    if (action.power === 100 && !piecePocketedThisShot) {
      strikerFoul = true;
    }

    let retainTurn = false;
    let queenCoverPending = state.queenCoverPending;
    let queenPocketedBy = state.queenPocketedBy;

    if (piecePocketedThisShot) {
      if (piecePocketedThisShot.type === 'QUEEN') {
        queenCoverPending = true;
        queenPocketedBy = playerId;
        retainTurn = true;
      } else if (piecePocketedThisShot.type === player.color) {
        player.pocketedCount += 1;
        player.score += piecePocketedThisShot.type === 'WHITE' ? 10 : 5;
        retainTurn = true;

        if (queenCoverPending && queenPocketedBy === playerId) {
          player.score += 25;
          queenCoverPending = false;
          queenPocketedBy = null;
        }
      } else {
        opponent.pocketedCount += 1;
        opponent.score += piecePocketedThisShot.type === 'WHITE' ? 10 : 5;
        retainTurn = false;
      }
    } else {
      if (queenCoverPending && queenPocketedBy === playerId) {
        const queen = pieces.find((p) => p.type === 'QUEEN');
        if (queen) {
          queen.isPocketed = false;
          queen.x = 50;
          queen.y = 50;
        }
        queenCoverPending = false;
        queenPocketedBy = null;
      }
      retainTurn = false;
    }

    if (strikerFoul && player.pocketedCount > 0) {
      player.pocketedCount -= 1;
      player.score = Math.max(0, player.score - 5);
      const returnPiece = pieces.find((p) => p.isPocketed && p.type === player.color);
      if (returnPiece) {
        returnPiece.isPocketed = false;
        returnPiece.x = 50;
        returnPiece.y = 50;
      }
      retainTurn = false;
    }

    const updatedPlayers = state.players.map((p, idx) => {
      if (idx === playerIndex) return player;
      if (idx === opponentIndex) return opponent;
      return p;
    });

    const remainingWhite = pieces.filter((p) => !p.isPocketed && p.type === 'WHITE').length;
    const remainingBlack = pieces.filter((p) => !p.isPocketed && p.type === 'BLACK').length;
    const queenUnpocketed = pieces.some((p) => !p.isPocketed && p.type === 'QUEEN');

    let winnerId: string | null = null;
    let isDraw = false;

    if (player.score >= 25 || remainingWhite === 0 || remainingBlack === 0) {
      if (!queenUnpocketed) {
        const p1Score = updatedPlayers[0].score;
        const p2Score = updatedPlayers[1].score;
        if (p1Score > p2Score) {
          winnerId = updatedPlayers[0].userId;
        } else if (p2Score > p1Score) {
          winnerId = updatedPlayers[1].userId;
        } else {
          isDraw = true;
        }
      }
    }

    const nextTurnPlayerId =
      retainTurn && !winnerId && !isDraw ? playerId : opponent.userId;

    const nextState: CarromState = {
      pieces,
      players: updatedPlayers,
      turnPlayerId: nextTurnPlayerId,
      queenCoverPending,
      queenPocketedBy,
      strikerFoul,
      winnerId,
      isDraw,
      turnExpiresAt: winnerId || isDraw ? 0 : Date.now() + CARROM_TURN_DURATION_MS,
    };

    return {
      success: true,
      state: nextState,
      events: [
        {
          type: 'carrom:shot_completed',
          data: {
            playerId,
            pocketedPiece: piecePocketedThisShot ? piecePocketedThisShot.type : null,
            strikerFoul,
            winnerId,
          },
        },
      ],
    };
  }

  checkWinner(state: CarromState): CarromResult | null {
    if (state.winnerId || state.isDraw) {
      const finalScores: Record<string, number> = {};
      state.players.forEach((p) => {
        finalScores[p.userId] = p.score;
      });
      return {
        winnerId: state.winnerId,
        isDraw: state.isDraw,
        finalScores,
      };
    }
    return null;
  }

  handleTurnTimeout(state: CarromState): GameActionResult<CarromState> {
    const dummyAction: CarromAction = {
      type: 'STRIKE',
      strikerX: 50,
      angle: 0,
      power: 10,
    };
    return this.applyAction(state, state.turnPlayerId, dummyAction);
  }
}
