import { getSocket } from './socket.service';
import { apiPost, apiGet } from './api';
import { AiDifficulty } from '../constants/soloGames';

export interface SoloSessionStartResponse {
  success: boolean;
  roomCode: string;
  matchId: string;
  gameType: string;
  players: any[];
  aiProfile?: {
    id: string;
    name: string;
    title: string;
    personality: string;
  };
  state: any;
  round: number;
  scores: Record<string, number>;
  sequenceNumber: number;
}

export class SoloService {
  /**
   * Starts an authoritative Solo Session (vs AI or Solo Puzzle)
   */
  static startSoloMatch(
    gameType: string,
    difficulty: AiDifficulty = 'MEDIUM',
    botId?: string
  ): Promise<SoloSessionStartResponse> {
    const socket = getSocket();

    // Primary: Socket.IO real-time emission
    if (socket && socket.connected) {
      return new Promise((resolve, reject) => {
        socket.emit(
          'solo:start',
          { gameType: gameType.toUpperCase(), difficulty, botId },
          (res: any) => {
            if (res && res.success) {
              resolve(res);
            } else {
              reject(new Error(res?.error || 'Failed to start solo match'));
            }
          }
        );
      });
    }

    // Fallback: REST API
    return apiPost<SoloSessionStartResponse>('/games/solo/start', {
      gameType: gameType.toUpperCase(),
      difficulty,
      botId,
    });
  }

  /**
   * Restores active solo session if user reconnected
   */
  static getActiveSoloState(): Promise<any> {
    const socket = getSocket();
    if (!socket || !socket.connected) {
      return Promise.reject(new Error('Socket disconnected'));
    }

    return new Promise((resolve, reject) => {
      socket.emit('solo:get_state', (res: any) => {
        if (res && res.success) {
          resolve(res);
        } else {
          reject(new Error(res?.error || 'No active solo match'));
        }
      });
    });
  }

  /**
   * Forfeits active solo game
   */
  static forfeitSoloMatch(): Promise<void> {
    const socket = getSocket();
    if (!socket || !socket.connected) return Promise.resolve();

    return new Promise((resolve) => {
      socket.emit('solo:forfeit', () => {
        resolve();
      });
    });
  }

  /**
   * Subscribes to AI thinking indicator
   */
  static onAiThinking(
    callback: (data: { roomCode: string; aiPlayerId: string; aiPlayerName?: string; thinkingMs: number }) => void
  ): () => void {
    const socket = getSocket();
    if (!socket) return () => {};

    socket.on('solo:ai_thinking', callback);
    return () => {
      socket?.off('solo:ai_thinking', callback);
    };
  }

  /**
   * Fetches Solo Match history
   */
  static getSoloHistory(): Promise<any> {
    return apiGet('/games/solo/history');
  }
}
