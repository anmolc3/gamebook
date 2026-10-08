import { AiDifficulty, AiBotProfile } from './ai.interface';
import { BOT_PROFILES, getBotProfile, getThinkingDelayMs } from './ai.config';
import { AiRegistry } from './ai.registry';
import { MatchManager, ActiveMatch } from '../games/match.manager';
import { GamePlayerMeta } from '../games/game.definition';
import { GameType } from '../../../shared/game-types';

function emitRoom(roomCode: string, event: string, payload: any): void {
  try {
    const { emitToRoom } = require('../sockets/socket.server');
    if (typeof emitToRoom === 'function') {
      emitToRoom(roomCode, event, payload);
    }
  } catch (err) {
    console.error(`[SoloManager] emitRoom error:`, err);
  }
}

export class SoloManager {
  // Mapping: userId -> roomCode
  private static userActiveSolo = new Map<string, string>();
  // Active AI thinking timers: roomCode -> Timeout
  private static pendingAiTimers = new Map<string, NodeJS.Timeout>();

  /**
   * Initializes an authoritative Solo Match (Human vs AI or Solo Puzzle)
   */
  static startSoloSession(
    userId: string,
    username: string,
    gameType: GameType,
    difficulty: AiDifficulty = 'MEDIUM',
    preferredBotId?: string
  ): {
    roomCode: string;
    match: ActiveMatch;
    botProfile: AiBotProfile;
  } {
    // Clear any previous solo session for this user
    this.clearUserSoloSession(userId);

    const botProfile = getBotProfile(preferredBotId || difficulty);
    const virtualCode = `SOLO_${userId.slice(0, 6).toUpperCase()}_${Date.now().toString(36).toUpperCase()}`;

    const humanPlayer: GamePlayerMeta = {
      userId,
      username,
      displayName: username,
      slotIndex: 0,
    };

    const aiPlayer: GamePlayerMeta = {
      userId: botProfile.id,
      username: `${botProfile.name} (AI)`,
      displayName: `${botProfile.name} (AI)`,
      slotIndex: 1,
    };

    // Determine players: For opponent games, human + AI. For single-player games, human only or with bot
    const isAiGame = AiRegistry.isAiSupported(gameType);
    const players = isAiGame ? [humanPlayer, aiPlayer] : [humanPlayer];

    const match = MatchManager.startMatch(virtualCode, gameType, players, {
      gameMode: 'SOLO',
      aiDifficulty: difficulty,
      aiPlayerId: botProfile.id,
      aiPlayerName: botProfile.name,
    });

    this.userActiveSolo.set(userId, virtualCode);

    // If AI is configured to move first (e.g. state.turnPlayerId === botProfile.id)
    if (isAiGame && match.state?.turnPlayerId === botProfile.id) {
      this.scheduleAiTurn(match);
    }

    return {
      roomCode: virtualCode,
      match,
      botProfile,
    };
  }

  /**
   * Called whenever a move concludes in an active match
   */
  static onPlayerActionCompleted(match: ActiveMatch): void {
    if (match.isConcluded || match.gameMode !== 'SOLO' || !match.aiPlayerId) {
      return;
    }

    // Check if it's the AI's turn
    const state = match.state;
    const isAiTurn =
      state?.turnPlayerId === match.aiPlayerId ||
      // Simultaneous games like RPS where AI hasn't made its choice yet
      (state?.choices && state?.choices[match.aiPlayerId] === null);

    if (isAiTurn) {
      this.scheduleAiTurn(match);
    }
  }

  /**
   * Schedules AI turn asynchronously with human-like thinking delay
   */
  private static scheduleAiTurn(match: ActiveMatch): void {
    const roomCode = match.roomCode;
    const aiPlayerId = match.aiPlayerId;
    if (!aiPlayerId) return;

    // Clear any existing timer for this room
    const existing = this.pendingAiTimers.get(roomCode);
    if (existing) {
      clearTimeout(existing);
      this.pendingAiTimers.delete(roomCode);
    }

    const difficulty = match.aiDifficulty || 'MEDIUM';
    const baseDelayMs = getThinkingDelayMs(difficulty);
    // Add extra pacing for Ludo so player can observe turn, dice roll, and token movement with human eyes
    let extraPacing = 0;
    if (match.gameType === 'LUDO') {
      if (match.state?.hasRolled) {
        extraPacing = 1400; // Visible pause after rolling so player clearly observes dice value before token moves
      } else {
        extraPacing = 600; // Pause before AI rolls dice
      }
    }
    const delayMs = baseDelayMs + extraPacing;

    // Broadcast that AI is thinking
    emitRoom(roomCode, 'solo:ai_thinking', {
      roomCode,
      aiPlayerId,
      aiPlayerName: match.aiPlayerName,
      thinkingMs: delayMs,
    });

    const timer = setTimeout(async () => {
      this.pendingAiTimers.delete(roomCode);

      try {
        if (match.isConcluded) return;

        // Calculate AI move
        const aiMove = await AiRegistry.getMove(
          match.gameType,
          match.state,
          aiPlayerId,
          difficulty
        );

        if (!aiMove) {
          console.warn(`[SoloManager] AI returned no move for ${match.gameType}`);
          return;
        }

        // Apply action through the exact same authoritative MatchManager
        await MatchManager.handleAction(roomCode, aiPlayerId, aiMove);
      } catch (err: any) {
        console.error(`[SoloManager] Error during AI turn in room ${roomCode}:`, err);
      }
    }, delayMs);

    this.pendingAiTimers.set(roomCode, timer);
  }

  /**
   * Reconnection: Retrieves active solo session for user
   */
  static getActiveSession(userId: string): ActiveMatch | null {
    const roomCode = this.userActiveSolo.get(userId);
    if (!roomCode) return null;
    const match = MatchManager.getMatch(roomCode);
    if (!match || match.isConcluded) {
      this.userActiveSolo.delete(userId);
      return null;
    }
    return match;
  }

  /**
   * Forfeit or leave solo session
   */
  static async forfeitSession(userId: string): Promise<void> {
    const roomCode = this.userActiveSolo.get(userId);
    if (roomCode) {
      this.clearUserSoloSession(userId);
      await MatchManager.handleForfeit(roomCode, userId).catch(() => null);
    }
  }

  /**
   * Clean up timer and session
   */
  static clearUserSoloSession(userId: string): void {
    const roomCode = this.userActiveSolo.get(userId);
    if (roomCode) {
      const timer = this.pendingAiTimers.get(roomCode);
      if (timer) {
        clearTimeout(timer);
        this.pendingAiTimers.delete(roomCode);
      }
      this.userActiveSolo.delete(userId);
    }
  }
}
