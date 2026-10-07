import { GameAI, AiDifficulty } from '../ai.interface';
import { WarAction, WarState } from '../../../../shared/game-types';

export class WarAI implements GameAI<WarState, WarAction> {
  getMove(_state: WarState, _aiPlayerId: string, _difficulty: AiDifficulty): WarAction {
    return { type: 'FLIP_CARD' };
  }
}
