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
   * Supports single or multiple AI bot opponents with the selected difficulty.
   */
  static startSoloSession(
    userId: string,
    username: string,
    gameType: GameType,
    difficulty: AiDifficulty = 'MEDIUM',
    preferredBotId?: string,
    botCount: number = 1
  ): {
    roomCode: string;
    match: ActiveMatch;
    botProfile: AiBotProfile;
  } {
    // Clear any previous solo session for this user
    this.clearUserSoloSession(userId);

    const safeBotCount = Math.max(1, botCount || 1);
    const primaryBot = getBotProfile(preferredBotId);
    const virtualCode = `SOLO_${userId.slice(0, 6).toUpperCase()}_${Date.now().toString(36).toUpperCase()}`;

    const humanPlayer: GamePlayerMeta = {
      userId,
      username,
      displayName: username,
      slotIndex: 0,
    };

    // Build distinct AI bot opponents list from BOT_PROFILES (Otter, Ollie, Otto, River, Pebble)
    const selectedProfiles: AiBotProfile[] = [primaryBot];
    for (const p of BOT_PROFILES) {
      if (selectedProfiles.length >= safeBotCount) break;
      if (!selectedProfiles.some((sp) => sp.id === p.id || sp.name.toLowerCase() === p.name.toLowerCase())) {
        selectedProfiles.push(p);
      }
    }

    const aiPlayers: GamePlayerMeta[] = selectedProfiles.map((prof, idx) => ({
      userId: prof.id,
      username: prof.name,
      displayName: prof.name,
      avatarUrl: 'otter_mascot',
      slotIndex: idx + 1,
    }));

    // Determine players: For opponent games, human + AI(s). For single-player games, human only or with bot
    const isAiGame = AiRegistry.isAiSupported(gameType);
    const players = isAiGame ? [humanPlayer, ...aiPlayers] : [humanPlayer];
    const aiPlayerIds = aiPlayers.map((p) => p.userId);

    const match = MatchManager.startMatch(virtualCode, gameType, players, {
      gameMode: 'SOLO',
      aiDifficulty: difficulty,
      aiPlayerId: aiPlayers[0]?.userId,
      aiPlayerName: aiPlayers[0]?.displayName,
      aiPlayerIds,
    });

    this.userActiveSolo.set(userId, virtualCode);

    // If AI is configured to move first (or simultaneous race games like WORDLE_DUEL)
    const isFirstTurnAi = isAiGame && (aiPlayerIds.includes(match.state?.turnPlayerId) || gameType === 'WORDLE_DUEL');
    if (isFirstTurnAi) {
      this.scheduleAiTurn(match);
    }

    return {
      roomCode: virtualCode,
      match,
      botProfile: primaryBot,
    };
  }

  /**
   * Called whenever a move concludes in an active match
   */
  static onPlayerActionCompleted(match: ActiveMatch): void {
    if (match.isConcluded || match.gameMode !== 'SOLO') {
      return;
    }

    const aiIds = match.aiPlayerIds || (match.aiPlayerId ? [match.aiPlayerId] : []);
    if (aiIds.length === 0) return;

    // Check if it's ANY AI player's turn
    const state = match.state;
    const isAiTurn =
      aiIds.includes(state?.turnPlayerId) ||
      // Simultaneous games like RPS where any AI hasn't made its choice yet
      (state?.choices && aiIds.some((id) => state.choices[id] === null)) ||
      // Simultaneous puzzle race games like Wordle Duel
      (match.gameType === 'WORDLE_DUEL' &&
        aiIds.some((id) => !state?.isFinished?.[id]) &&
        !this.pendingAiTimers.has(match.roomCode));

    if (isAiTurn) {
      this.scheduleAiTurn(match);
    }
  }

  /**
   * Schedules AI turn asynchronously with human-like thinking delay
   */
  private static scheduleAiTurn(match: ActiveMatch): void {
    const roomCode = match.roomCode;
    const aiIds = match.aiPlayerIds || (match.aiPlayerId ? [match.aiPlayerId] : []);
    if (aiIds.length === 0) return;

    // Find the current AI bot that should act
    let targetAiId = aiIds.find((id) => id === match.state?.turnPlayerId);
    if (!targetAiId) {
      if (match.state?.choices) {
        targetAiId = aiIds.find((id) => match.state.choices[id] === null);
      } else if (match.gameType === 'WORDLE_DUEL') {
        targetAiId = aiIds.find((id) => !match.state?.isFinished?.[id]);
      }
    }
    if (!targetAiId) {
      targetAiId = aiIds[0];
    }

    const aiPlayerMeta = match.players.find((p) => p.userId === targetAiId);
    const targetAiName = aiPlayerMeta?.displayName || 'Otter';

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
    } else if (match.gameType === 'SNAKES_AND_LADDERS') {
      // Natural, prompt board game turn pacing
      if (difficulty === 'EASY') extraPacing = -400; // ~1400ms
      else if (difficulty === 'MEDIUM') extraPacing = -300; // ~1200ms
      else if (difficulty === 'HARD') extraPacing = -200; // ~1000ms
      else extraPacing = -100; // ~800ms
    } else if (match.gameType === 'WORDLE_DUEL') {
      // Natural human-like deduction and keyboard typing pacing
      if (difficulty === 'EASY') extraPacing = 3200;
      else if (difficulty === 'MEDIUM') extraPacing = 2200;
      else if (difficulty === 'HARD') extraPacing = 1200;
      else extraPacing = 600;
    }
    const delayMs = baseDelayMs + extraPacing;

    // Broadcast that AI is thinking
    emitRoom(roomCode, 'solo:ai_thinking', {
      roomCode,
      aiPlayerId: targetAiId,
      aiPlayerName: targetAiName,
      thinkingMs: delayMs,
    });

    const timer = setTimeout(async () => {
      this.pendingAiTimers.delete(roomCode);

      try {
        if (match.isConcluded) return;

        // Calculate AI move for the active bot
        const aiMove = await AiRegistry.getMove(
          match.gameType,
          match.state,
          targetAiId,
          difficulty
        );

        if (!aiMove) {
          console.warn(`[SoloManager] AI returned no move for ${match.gameType} (${targetAiId})`);
          return;
        }

        // Apply action through the exact same authoritative MatchManager
        await MatchManager.handleAction(roomCode, targetAiId, aiMove);

        // For simultaneous games like WORDLE_DUEL, schedule next AI guess if not finished
        if (
          match.gameType === 'WORDLE_DUEL' &&
          !match.isConcluded &&
          !match.state?.isFinished?.[targetAiId]
        ) {
          this.scheduleAiTurn(match);
        }
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
