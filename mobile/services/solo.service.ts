import { getSocket } from './socket.service';
import { apiPost, apiGet } from './api';
import { AiDifficulty, BOT_AVATARS } from '../constants/soloGames';

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
   * Generates a fully playable local authoritative fallback session
   */
  static createLocalFallbackSession(
    gameType: string,
    difficulty: AiDifficulty = 'MEDIUM',
    botId?: string
  ): SoloSessionStartResponse {
    const selectedBotId =
      botId ||
      (difficulty === 'EASY'
        ? 'BOT_PIXEL'
        : difficulty === 'HARD'
        ? 'BOT_ACE'
        : difficulty === 'EXPERT'
        ? 'BOT_ATLAS'
        : 'BOT_NOVA');
    const botMeta = BOT_AVATARS[selectedBotId] || {
      name: 'Nova',
      title: 'Tactical Strategist',
      personality: 'Balanced and methodical.',
    };
    const roomCode = `SOLO_LOCAL_${Date.now().toString(36).toUpperCase()}`;
    const matchId = `SOLO_M_${Date.now().toString(36).toUpperCase()}`;

    const humanPlayer = {
      userId: 'local_player',
      username: 'You',
      displayName: 'You',
      slotIndex: 0,
    };
    const aiPlayer = {
      userId: selectedBotId,
      username: `${botMeta.name} (AI)`,
      displayName: `${botMeta.name} (AI)`,
      slotIndex: 1,
    };

    let initialState: any = null;
    if (gameType.toUpperCase() === 'SNAKES_AND_LADDERS') {
      initialState = {
        players: [
          { userId: humanPlayer.userId, position: 1 },
          { userId: aiPlayer.userId, position: 1 },
        ],
        turnPlayerId: humanPlayer.userId,
        currentDiceRoll: null,
        lastMoveType: null,
        winnerId: null,
        winnerIds: [],
        isComplete: false,
        turnExpiresAt: Date.now() + 20000,
      };
    } else {
      initialState = {
        board: Array(9).fill(null),
        turnPlayerId: humanPlayer.userId,
        winnerId: null,
        isDraw: false,
      };
    }

    return {
      success: true,
      roomCode,
      matchId,
      gameType: gameType.toUpperCase(),
      players: [humanPlayer, aiPlayer],
      aiProfile: {
        id: selectedBotId,
        name: botMeta.name,
        title: botMeta.title,
        personality: botMeta.personality,
      },
      state: initialState,
      round: 1,
      scores: { [humanPlayer.userId]: 0, [aiPlayer.userId]: 0 },
      sequenceNumber: 1,
    };
  }

  /**
   * Starts an authoritative Solo Session (vs AI or Solo Puzzle)
   * Tries Socket -> HTTP API -> Local Fallback
   */
  static async startSoloMatch(
    gameType: string,
    difficulty: AiDifficulty = 'MEDIUM',
    botId?: string
  ): Promise<SoloSessionStartResponse> {
    const socket = getSocket();

    // 1. Primary: Socket.IO real-time emission with 2500ms timeout
    if (socket && socket.connected) {
      try {
        const socketRes = await new Promise<SoloSessionStartResponse>((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Socket solo:start timed out'));
          }, 2500);

          socket.emit(
            'solo:start',
            { gameType: gameType.toUpperCase(), difficulty, botId },
            (res: any) => {
              clearTimeout(timeout);
              if (res && res.success) {
                resolve(res);
              } else {
                reject(new Error(res?.error || 'Failed to start solo match'));
              }
            }
          );
        });
        return socketRes;
      } catch (socketErr) {
        console.log('[SoloService] Socket solo:start failed, falling back to HTTP:', socketErr);
      }
    }

    // 2. Secondary: REST API
    try {
      const restRes = await apiPost<SoloSessionStartResponse>('/games/solo/start', {
        gameType: gameType.toUpperCase(),
        difficulty,
        botId,
      });
      if (restRes && restRes.success) {
        return restRes;
      }
    } catch (restErr) {
      console.log('[SoloService] REST solo:start failed, falling back to local session:', restErr);
    }

    // 3. Guaranteed Local Fallback: Always starts smoothly offline or with disconnected server
    return this.createLocalFallbackSession(gameType, difficulty, botId);
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
