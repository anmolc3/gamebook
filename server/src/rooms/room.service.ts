import { prisma } from '../database/prisma';
import { CreateRoomInput } from './room.validation';
import { emitToRoom } from '../sockets/socket.server';
import { GameRegistry } from '../games/game.registry';
import { MatchManager } from '../games/match.manager';

const CODE_CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export class RoomService {
  /**
   * Generates a unique, user-friendly 6-character room code.
   * Avoids easily confused characters like O, 0, I, 1.
   */
  static async generateRoomCode(): Promise<string> {
    let attempts = 0;
    while (attempts < 20) {
      let code = '';
      for (let i = 0; i < 6; i++) {
        const randomIndex = Math.floor(Math.random() * CODE_CHARSET.length);
        code += CODE_CHARSET[randomIndex];
      }

      const existing = await prisma.gameRoom.findUnique({
        where: { code },
        select: { id: true },
      });

      if (!existing) {
        return code;
      }
      attempts++;
    }
    // Fallback timestamp suffix if collision rate is high
    return `R${Date.now().toString(36).substring(2, 7).toUpperCase()}`;
  }

  /**
   * Formats raw Prisma room record into a clean, client-ready DTO
   */
  private static formatRoom(room: any) {
    const gameDef = GameRegistry.getGame(room.gameType);

    return {
      id: room.id,
      code: room.code,
      gameType: room.gameType,
      gameName: gameDef?.name || room.gameType,
      gameCategory: gameDef?.category || 'BOARD',
      turnTimeSeconds: gameDef?.turnTimeSeconds || 20,
      supportsSpectators: gameDef?.supportsSpectators ?? true,
      status: room.status,
      isPrivate: room.isPrivate,
      maxPlayers: room.maxPlayers,
      hostId: room.hostId,
      host: room.host
        ? {
            id: room.host.id,
            username: room.host.username,
            displayName: room.host.profile?.displayName || room.host.username,
            avatarUrl: room.host.profile?.avatarUrl || null,
          }
        : null,
      players: (room.players || [])
        .sort((a: any, b: any) => a.slotIndex - b.slotIndex)
        .map((p: any) => ({
          id: p.id,
          userId: p.userId,
          slotIndex: p.slotIndex,
          isReady: p.isReady,
          score: p.score,
          user: {
            id: p.user.id,
            username: p.user.username,
            displayName: p.user.profile?.displayName || p.user.username,
            avatarUrl: p.user.profile?.avatarUrl || null,
            isOnline: p.user.profile?.isOnline || false,
          },
        })),
      createdAt: room.createdAt,
      updatedAt: room.updatedAt,
    };
  }

  /**
   * Create a new multiplayer room with host assigned to slot 0
   */
  static async createRoom(userId: string, input: CreateRoomInput) {
    const rawType = input.gameType || 'TICTACTOE';
    const gameDef = GameRegistry.getGame(rawType);
    const gameType = (gameDef?.id || rawType) as any;

    let maxPlayers = input.maxPlayers;
    if (!maxPlayers) {
      maxPlayers = gameDef?.defaultPlayers || 2;
    } else if (gameDef) {
      if (maxPlayers < gameDef.minPlayers) maxPlayers = gameDef.minPlayers;
      if (maxPlayers > gameDef.maxPlayers) maxPlayers = gameDef.maxPlayers;
    }

    const code = await this.generateRoomCode();

    const room = await prisma.gameRoom.create({
      data: {
        code,
        hostId: userId,
        gameType,
        isPrivate: input.isPrivate !== undefined ? input.isPrivate : true,
        maxPlayers,
        status: 'WAITING',
        players: {
          create: {
            userId,
            slotIndex: 0,
            isReady: true, // Host starts ready by default
            score: 0,
          },
        },
      },
      include: {
        host: { include: { profile: true } },
        players: {
          include: {
            user: { include: { profile: true } },
          },
        },
      },
    });

    return this.formatRoom(room);
  }

  /**
   * Retrieve current room details by room code
   */
  static async getRoom(code: string) {
    const normalizedCode = code.trim().toUpperCase();

    const room = await prisma.gameRoom.findUnique({
      where: { code: normalizedCode },
      include: {
        host: { include: { profile: true } },
        players: {
          include: {
            user: { include: { profile: true } },
          },
        },
      },
    });

    if (!room) {
      throw new Error(`Room with code "${normalizedCode}" not found`);
    }

    return this.formatRoom(room);
  }

  /**
   * Join an existing room via 6-character room code
   */
  static async joinRoom(userId: string, code: string) {
    const normalizedCode = code.trim().toUpperCase();

    const room = await prisma.gameRoom.findUnique({
      where: { code: normalizedCode },
      include: {
        players: {
          include: {
            user: { include: { profile: true } },
          },
        },
        host: { include: { profile: true } },
      },
    });

    if (!room) {
      throw new Error(`Room with code "${normalizedCode}" not found`);
    }

    if (room.status !== 'WAITING') {
      throw new Error('This room is already in progress or has finished');
    }

    // Check if player is already inside the room (idempotent rejoin)
    const existingPlayer = room.players.find((p: any) => p.userId === userId);
    if (existingPlayer) {
      return this.formatRoom(room);
    }

    // Check capacity
    if (room.players.length >= room.maxPlayers) {
      throw new Error(`Room is full (${room.players.length}/${room.maxPlayers} players)`);
    }

    // Determine the lowest unoccupied slotIndex
    const occupiedSlots = new Set(room.players.map((p: any) => p.slotIndex));
    let nextSlot = 0;
    while (occupiedSlots.has(nextSlot) && nextSlot < room.maxPlayers) {
      nextSlot++;
    }

    // Add player to room
    await prisma.gamePlayer.create({
      data: {
        roomId: room.id,
        userId,
        slotIndex: nextSlot,
        isReady: false,
        score: 0,
      },
    });

    // Fetch updated room
    const updatedRoom = await prisma.gameRoom.findUnique({
      where: { id: room.id },
      include: {
        host: { include: { profile: true } },
        players: {
          include: {
            user: { include: { profile: true } },
          },
        },
      },
    });

    const formatted = this.formatRoom(updatedRoom);

    // Broadcast real-time update to socket room
    emitToRoom(normalizedCode, 'room:player_joined', {
      roomCode: normalizedCode,
      player: formatted.players.find((p: any) => p.userId === userId),
      room: formatted,
    });
    emitToRoom(normalizedCode, 'room:state', formatted);

    return formatted;
  }

  /**
   * Toggle player ready state in the room
   */
  static async toggleReady(userId: string, code: string, isReady?: boolean) {
    const normalizedCode = code.trim().toUpperCase();

    const room = await prisma.gameRoom.findUnique({
      where: { code: normalizedCode },
      include: {
        players: true,
      },
    });

    if (!room) {
      throw new Error(`Room with code "${normalizedCode}" not found`);
    }

    if (room.status !== 'WAITING') {
      throw new Error('Cannot change ready state while match is active');
    }

    const player = room.players.find((p: any) => p.userId === userId);
    if (!player) {
      throw new Error('You are not a participant in this room');
    }

    const nextReadyState = isReady !== undefined ? isReady : !player.isReady;

    await prisma.gamePlayer.update({
      where: { id: player.id },
      data: { isReady: nextReadyState },
    });

    const updatedRoom = await prisma.gameRoom.findUnique({
      where: { id: room.id },
      include: {
        host: { include: { profile: true } },
        players: {
          include: {
            user: { include: { profile: true } },
          },
        },
      },
    });

    const formatted = this.formatRoom(updatedRoom);

    emitToRoom(normalizedCode, 'room:player_ready', {
      roomCode: normalizedCode,
      userId,
      isReady: nextReadyState,
    });
    emitToRoom(normalizedCode, 'room:state', formatted);

    return formatted;
  }

  /**
   * Launch match / Start game session
   */
  static async startGame(userId: string, code: string) {
    const normalizedCode = code.trim().toUpperCase();

    const room = await prisma.gameRoom.findUnique({
      where: { code: normalizedCode },
      include: {
        players: {
          include: {
            user: { include: { profile: true } },
          },
        },
        host: { include: { profile: true } },
      },
    });

    if (!room) {
      throw new Error(`Room with code "${normalizedCode}" not found`);
    }

    if (room.hostId !== userId) {
      throw new Error('Only the room host can start the match');
    }

    if (room.status !== 'WAITING') {
      throw new Error('Match has already started or finished');
    }

    const gameDef = GameRegistry.getGame(room.gameType);
    const minRequired = gameDef?.minPlayers || 2;

    if (room.players.length < minRequired) {
      throw new Error(`At least ${minRequired} players are required to start ${gameDef?.name || 'the match'}`);
    }

    // Check ready state of all non-host players
    const unreadyPlayers = room.players.filter((p: any) => !p.isReady);
    if (unreadyPlayers.length > 0) {
      throw new Error('All players must be marked READY before the match can begin');
    }

    // Transition room status to PLAYING
    const updatedRoom = await prisma.gameRoom.update({
      where: { id: room.id },
      data: { status: 'PLAYING' },
      include: {
        host: { include: { profile: true } },
        players: {
          include: {
            user: { include: { profile: true } },
          },
        },
      },
    });

    const formatted = this.formatRoom(updatedRoom);

    // Initialize authoritative match in MatchManager
    try {
      const playerMetas = formatted.players.map((p: any) => ({
        userId: p.userId,
        username: p.username,
        displayName: p.displayName,
        slotIndex: p.slotIndex,
      }));
      MatchManager.startMatch(normalizedCode, room.gameType as any, playerMetas);
    } catch (engineErr) {
      console.warn(`[RoomService] Could not auto-start MatchManager session:`, engineErr);
    }

    // Broadcast match launch trigger
    emitToRoom(normalizedCode, 'game:start', {
      roomCode: normalizedCode,
      gameType: room.gameType,
      gameName: gameDef?.name || room.gameType,
      players: formatted.players,
      turnPlayerId: room.hostId, // Host starts turn
      turnTimeSeconds: gameDef?.turnTimeSeconds || 15,
    });
    emitToRoom(normalizedCode, 'room:state', formatted);

    return formatted;
  }

  /**
   * Leave room and transfer host or disband if empty
   */
  static async leaveRoom(userId: string, code: string) {
    const normalizedCode = code.trim().toUpperCase();

    const room = await prisma.gameRoom.findUnique({
      where: { code: normalizedCode },
      include: {
        players: true,
      },
    });

    if (!room) {
      throw new Error(`Room with code "${normalizedCode}" not found`);
    }

    const player = room.players.find((p: any) => p.userId === userId);
    if (!player) {
      return { left: true, message: 'Player was not in this room' };
    }

    // Remove player
    await prisma.gamePlayer.delete({
      where: { id: player.id },
    });

    const remainingPlayers = room.players.filter((p: any) => p.userId !== userId);

    if (remainingPlayers.length === 0) {
      // Disband room
      await prisma.gameRoom.update({
        where: { id: room.id },
        data: { status: 'FINISHED' },
      });

      emitToRoom(normalizedCode, 'room:disbanded', {
        roomCode: normalizedCode,
        reason: 'All players left the room',
      });

      return { left: true, roomDisbanded: true };
    }

    let newHostId = room.hostId;
    if (room.hostId === userId) {
      // Transfer host to lowest slotIndex player
      const nextHost = remainingPlayers.sort((a: any, b: any) => a.slotIndex - b.slotIndex)[0];
      newHostId = nextHost.userId;
      await prisma.gameRoom.update({
        where: { id: room.id },
        data: { hostId: newHostId },
      });
      // Ensure new host is marked ready
      await prisma.gamePlayer.update({
        where: { id: nextHost.id },
        data: { isReady: true },
      });
    }

    const updatedRoom = await prisma.gameRoom.findUnique({
      where: { id: room.id },
      include: {
        host: { include: { profile: true } },
        players: {
          include: {
            user: { include: { profile: true } },
          },
        },
      },
    });

    const formatted = this.formatRoom(updatedRoom);

    emitToRoom(normalizedCode, 'room:player_left', {
      roomCode: normalizedCode,
      userId,
      newHostId,
    });
    emitToRoom(normalizedCode, 'room:state', formatted);

    return { left: true, room: formatted };
  }

  /**
   * Public matchmaking queue: finds an existing public room or creates one
   */
  static async matchmake(userId: string, gameType: string) {
    const gameDef = GameRegistry.getGame(gameType);
    const resolvedType = (gameDef?.id || gameType) as any;
    const maxPlayers = gameDef?.defaultPlayers || 2;

    // Search for active public waiting room with available capacity
    const availableRooms = await prisma.gameRoom.findMany({
      where: {
        gameType: resolvedType,
        isPrivate: false,
        status: 'WAITING',
      },
      include: {
        players: true,
        host: { include: { profile: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Find first room where user is not already host/player and has free slot
    const suitableRoom = availableRooms.find(
      (r: any) => r.players.length < r.maxPlayers && !r.players.some((p: any) => p.userId === userId)
    );

    if (suitableRoom) {
      const joined = await this.joinRoom(userId, suitableRoom.code);
      return {
        matched: true,
        room: joined,
      };
    }

    // No existing public room available, create a new public room
    const created = await this.createRoom(userId, {
      gameType: resolvedType,
      isPrivate: false,
      maxPlayers,
    });

    return {
      matched: false,
      waitingForOpponent: true,
      room: created,
    };
  }
}
