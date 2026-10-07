import { GameAI, AiDifficulty } from '../ai.interface';
import { BattleshipAction, BattleshipState } from '../../../../shared/game-types';

export class BattleshipAI implements GameAI<BattleshipState, BattleshipAction> {
  getMove(state: BattleshipState, aiPlayerId: string, difficulty: AiDifficulty): BattleshipAction {
    const oppGrid = Object.values(state.players).find((p) => p.userId !== aiPlayerId);

    const firedCoords = new Set<string>();
    const hits: [number, number][] = [];

    if (oppGrid && oppGrid.shotsReceived) {
      for (const shot of oppGrid.shotsReceived) {
        firedCoords.add(`${shot.row},${shot.col}`);
        if (shot.status === 'HIT') {
          hits.push([shot.row, shot.col]);
        }
      }
    }

    // Target mode: if we have hit coordinates, search adjacent neighbors
    if (difficulty !== 'EASY' && hits.length > 0) {
      const candidates: [number, number][] = [];
      const deltas: [number, number][] = [[-1, 0], [1, 0], [0, -1], [0, 1]];

      for (const [hr, hc] of hits) {
        for (const [dr, dc] of deltas) {
          const nr = hr + dr;
          const nc = hc + dc;
          if (nr >= 0 && nr < 10 && nc >= 0 && nc < 10) {
            if (!firedCoords.has(`${nr},${nc}`)) {
              candidates.push([nr, nc]);
            }
          }
        }
      }

      if (candidates.length > 0) {
        const choice = candidates[Math.floor(Math.random() * candidates.length)];
        return { type: 'FIRE', row: choice[0], col: choice[1] };
      }
    }

    // Hunt mode: parity search (checkerboard)
    const huntCandidates: [number, number][] = [];
    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 10; c++) {
        if (!firedCoords.has(`${r},${c}`)) {
          if ((r + c) % 2 === 0 || difficulty === 'EASY') {
            huntCandidates.push([r, c]);
          }
        }
      }
    }

    if (huntCandidates.length > 0) {
      const pick = huntCandidates[Math.floor(Math.random() * huntCandidates.length)];
      return { type: 'FIRE', row: pick[0], col: pick[1] };
    }

    // Fallback: any unfired cell
    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 10; c++) {
        if (!firedCoords.has(`${r},${c}`)) {
          return { type: 'FIRE', row: r, col: c };
        }
      }
    }

    return { type: 'FIRE', row: 0, col: 0 };
  }
}
