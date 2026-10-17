import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env';
import { AuthenticatedUser } from '../middleware/auth.middleware';
import { prisma } from '../database/prisma';
import { MatchManager } from '../games/match.manager';
import { PushNotificationService } from '../notifications/push.service';
import { PresenceService } from '../presence/presence.service';

export let io: SocketIOServer;

// Map tracking active socket connections per user for multi-tab/device presence
const activeUserSockets = new Map<string, Set<string>>();

// Tracking active game room per user for reconnection handling
const userActiveRoom = new Map<string, string>(); // userId -> roomCode
const disconnectGraceTimers = new Map<string, NodeJS.Timeout>(); // `${userId}:${roomCode}` -> timer

// Active 1-on-1 Audio/Video Call Sessions
export interface ActiveCallSession {
  callId: string;
  callerId: string;
  recipientId: string;
  callType: 'audio' | 'video';
  status: 'ringing' | 'connected' | 'ended';
  conversationId?: string;
  startedAt?: number;
  timeoutTimer?: NodeJS.Timeout;
}

const activeCalls = new Map<string, ActiveCallSession>(); // callId -> session
const userActiveCall = new Map<string, string>(); // userId -> callId

// Security Rate Limiter: socketId -> action timestamps (sliding window)
const socketActionTimestamps = new Map<string, number[]>();

export function checkActionRateLimit(socketId: string, maxPerSecond = 10): boolean {
  const now = Date.now();
  let timestamps = socketActionTimestamps.get(socketId) || [];
  timestamps = timestamps.filter((t) => now - t < 1000);
  if (timestamps.length >= maxPerSecond) {
    socketActionTimestamps.set(socketId, timestamps);
    return false;
  }
  timestamps.push(now);
  socketActionTimestamps.set(socketId, timestamps);
  return true;
}

export function clearSocketRateLimit(socketId: string): void {
  socketActionTimestamps.delete(socketId);
}

export function isUserOnline(userId: string): boolean {
  return PresenceService.isUserOnline(userId);
}

export function getOnlineUsersCount(): number {
  return activeUserSockets.size;
}

export function getTotalConnectedSockets(): number {
  return io ? io.sockets.sockets.size : 0;
}

export function emitToUser(userId: string, event: string, payload: any): void {
  if (io) {
    io.to(`user:${userId}`).emit(event, payload);
  }
}

export function emitToConversation(conversationId: string, event: string, payload: any): void {
  if (io) {
    io.to(`conversation:${conversationId}`).emit(event, payload);
  }
}

export function emitToRoom(roomCode: string, event: string, payload: any): void {
  if (io) {
    io.to(`room:${roomCode.toUpperCase()}`).emit(event, payload);
  }
}

export function emitToAll(event: string, payload: any): void {
  if (io) {
    io.emit(event, payload);
  }
}

export function initializeSockets(server: HttpServer): SocketIOServer {
  io = new SocketIOServer(server, {
    cors: {
      origin: ENV.CORS_ORIGIN,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 20000,
    pingInterval: 10000,
  });

  // Authentication Middleware for Socket.IO
  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '');

    if (token) {
      try {
        const decoded = jwt.verify(token, ENV.JWT_SECRET) as AuthenticatedUser;
        socket.data.user = decoded;
        socket.data.userId = decoded.userId;
      } catch (err) {
        console.log(`⚠️ [Socket.IO] Invalid token on handshake: ${socket.id}`);
      }
    }
    // Allow anonymous diagnostics connection, but tag authenticated sockets
    next();
  });

  io.on('connection', async (socket: Socket) => {
    const userId = socket.data.userId;
    const username = socket.data.user?.username;

    if (userId) {
      console.log(`🔌 [Socket.IO] Authenticated client connected: ${username} (${userId}) - socket: ${socket.id}`);
      // Join personal room for targeted alerts & direct invites
      socket.join(`user:${userId}`);

      // Track active sockets
      let userSockets = activeUserSockets.get(userId);
      if (!userSockets) {
        userSockets = new Set();
        activeUserSockets.set(userId, userSockets);
      }
      userSockets.add(socket.id);

      // Register socket with PresenceService
      const isFirstConnection = PresenceService.handleSocketConnect(userId, socket.id);

      // Immediately sync current online statuses of all friends to this device
      PresenceService.syncFriendsPresenceToUser(userId, socket).catch((err) =>
        console.error('[Socket.IO] Error syncing friends presence:', err)
      );

      // Synchronize undelivered message receipts on connect / reconnect
      try {
        const { ChatService } = require('../chat/chat.service');
        ChatService.syncUndeliveredMessagesForUser(userId).catch((err: any) =>
          console.error('[Socket.IO] Error syncing undelivered messages:', err)
        );
      } catch (err) {
        console.error('[Socket.IO] Error requiring ChatService for sync:', err);
      }

      if (isFirstConnection) {
        const now = new Date();
        prisma.profile
          .updateMany({
            where: { userId },
            data: { isOnline: true, lastSeen: now },
          })
          .catch(() => null);

        PresenceService.notifyAuthorizedRecipients(userId, true, now, emitToUser).catch((err) =>
          console.error('[Socket.IO] Error notifying friends of online presence:', err)
        );
      }
    } else {
      console.log(`🔌 [Socket.IO] Anonymous client connected: ${socket.id}`);
    }

    socket.emit('connection:established', {
      socketId: socket.id,
      authenticated: !!userId,
      user: socket.data.user || null,
      timestamp: new Date().toISOString(),
      message: 'Connected to Social Gaming Realtime Gateway',
    });

    socket.on('ping', () => {
      socket.emit('pong', { timestamp: Date.now() });
    });

    // Real-Time Chat Room Subscriptions & Typing Indicators
    socket.on('chat:join', (data: { conversationId: string }, cb?: any) => {
      if (data?.conversationId) {
        socket.join(`conversation:${data.conversationId}`);
        if (typeof cb === 'function') cb({ joined: true });
      }
    });

    socket.on('chat:leave', (data: { conversationId: string }) => {
      if (data?.conversationId) {
        socket.leave(`conversation:${data.conversationId}`);
      }
    });

    socket.on('chat:typing', (data: { conversationId: string; isTyping: boolean }) => {
      if (userId && data?.conversationId) {
        socket.to(`conversation:${data.conversationId}`).emit('chat:user_typing', {
          conversationId: data.conversationId,
          userId,
          username,
          isTyping: !!data.isTyping,
        });
      }
    });

    // Delivery confirmation acknowledgment (2 grey ticks)
    socket.on('chat:message_delivered', async (data: { conversationId: string; messageIds?: string[] }, cb?: any) => {
      if (userId && data?.conversationId) {
        try {
          const { ChatService } = require('../chat/chat.service');
          const res = await ChatService.confirmDelivery(userId, data.conversationId, data.messageIds);
          if (typeof cb === 'function') cb(res);
        } catch (err: any) {
          if (typeof cb === 'function') cb({ success: false, error: err.message });
        }
      }
    });

    // Read receipt acknowledgment (2 blue ticks)
    socket.on('chat:messages_read', async (data: { conversationId: string }, cb?: any) => {
      if (userId && data?.conversationId) {
        try {
          const { ChatService } = require('../chat/chat.service');
          const res = await ChatService.markAsRead(userId, data.conversationId);
          if (typeof cb === 'function') cb(res);
        } catch (err: any) {
          if (typeof cb === 'function') cb({ success: false, error: err.message });
        }
      }
    });

    // Multiplayer Game Room Subscriptions & Lobby Synchronizations
    socket.on('room:join', (data: { roomCode: string }, cb?: any) => {
      if (data?.roomCode) {
        const code = data.roomCode.trim().toUpperCase();
        socket.join(`room:${code}`);

        if (userId) {
          userActiveRoom.set(userId, code);
          // If a disconnect grace countdown was pending for this user in this room, cancel it!
          const timerKey = `${userId}:${code}`;
          const pendingTimer = disconnectGraceTimers.get(timerKey);
          if (pendingTimer) {
            clearTimeout(pendingTimer);
            disconnectGraceTimers.delete(timerKey);
            emitToRoom(code, 'room:player_reconnected', {
              userId,
              username,
              roomCode: code,
              timestamp: new Date().toISOString(),
            });
            MatchManager.handlePlayerReconnect(code, userId);
          }
        }

        if (typeof cb === 'function') cb({ joined: true, roomCode: code });
      }
    });

    socket.on('room:leave', (data: { roomCode: string }) => {
      if (data?.roomCode) {
        const code = data.roomCode.trim().toUpperCase();
        socket.leave(`room:${code}`);

        if (userId && userActiveRoom.get(userId) === code) {
          userActiveRoom.delete(userId);
          const timerKey = `${userId}:${code}`;
          const pendingTimer = disconnectGraceTimers.get(timerKey);
          if (pendingTimer) {
            clearTimeout(pendingTimer);
            disconnectGraceTimers.delete(timerKey);
          }
        }
      }
    });

    // Real-Time Direct Game Room Invites Across All Games
    socket.on('room:invite', async (data: { recipientId: string; roomCode: string; gameType: string; gameName?: string }, cb?: any) => {
      if (!userId || !data?.recipientId || !data?.roomCode) {
        if (typeof cb === 'function') cb({ success: false, error: 'Invalid invite parameters' });
        return;
      }
      try {
        const inviter = socket.data.user;
        const inviterName = inviter?.displayName || inviter?.username || username || 'A player';
        const normalizedCode = data.roomCode.trim().toUpperCase();
        const payload = {
          inviterId: userId,
          inviterName,
          inviterAvatarUrl: inviter?.avatarUrl || null,
          roomCode: normalizedCode,
          gameType: data.gameType,
          gameName: data.gameName || data.gameType,
          timestamp: new Date().toISOString(),
        };

        // Emit real-time invite directly to recipient's personal socket room
        emitToUser(data.recipientId, 'game:invite_received', payload);

        // Also post in chat conversation if one exists or create it
        try {
          const { ChatService } = require('../chat/chat.service');
          const conv = await ChatService.getOrCreateConversation(userId, data.recipientId);
          if (conv?.id) {
            await ChatService.sendMessage(userId, conv.id, {
              content: `Challenged you to play ${data.gameName || data.gameType}! Room code: ${normalizedCode}`,
              type: 'GAME_INVITE',
              metadata: {
                roomCode: normalizedCode,
                gameType: data.gameType,
                gameName: data.gameName || data.gameType,
                hostName: inviterName,
              },
            });
          }
        } catch (chatErr) {
          console.warn('[Socket] Optional chat invite delivery note:', chatErr);
        }

        if (typeof cb === 'function') cb({ success: true, payload });
      } catch (err: any) {
        if (typeof cb === 'function') cb({ success: false, error: err.message });
      }
    });

    // ------------------------------------------------------------------------
    // Real-Time Solo / AI Opponent Mode Events
    // ------------------------------------------------------------------------

    socket.on('solo:start', (data: { gameType: string; difficulty?: any; botId?: string }, cb?: any) => {
      let effectiveUserId = userId || socket.data.userId;
      let effectiveUsername = username || socket.data.user?.username;
      if (!effectiveUserId) {
        effectiveUserId = `guest_${socket.id.slice(0, 8)}`;
        effectiveUsername = 'Guest';
        socket.data.userId = effectiveUserId;
        socket.data.user = { userId: effectiveUserId, username: effectiveUsername } as any;
        socket.join(`user:${effectiveUserId}`);
      }
      try {
        const { SoloManager } = require('../ai/solo.manager');
        const session = SoloManager.startSoloSession(
          effectiveUserId,
          effectiveUsername || 'Player',
          data.gameType as any,
          data.difficulty || 'MEDIUM',
          data.botId
        );
        socket.join(`room:${session.roomCode}`);

        const payload = {
          success: true,
          roomCode: session.roomCode,
          matchId: session.match.matchId,
          gameType: session.match.gameType,
          players: session.match.players,
          aiProfile: session.botProfile,
          state: session.match.state,
          round: session.match.round,
          scores: session.match.scores,
          sequenceNumber: session.match.sequenceNumber,
        };

        if (typeof cb === 'function') cb(payload);
        socket.emit('solo:started', payload);
      } catch (err: any) {
        if (typeof cb === 'function') cb({ success: false, error: err.message });
      }
    });

    socket.on('solo:get_state', (cb?: any) => {
      const effectiveUserId = userId || socket.data.userId;
      if (!effectiveUserId) {
        if (typeof cb === 'function') cb({ success: false, error: 'Unauthorized' });
        return;
      }
      try {
        const { SoloManager } = require('../ai/solo.manager');
        const match = SoloManager.getActiveSession(effectiveUserId);
        if (match) {
          socket.join(`room:${match.roomCode}`);
          if (typeof cb === 'function') {
            cb({
              success: true,
              roomCode: match.roomCode,
              matchId: match.matchId,
              gameType: match.gameType,
              players: match.players,
              state: match.state,
              round: match.round,
              scores: match.scores,
              sequenceNumber: match.sequenceNumber,
            });
          }
        } else {
          if (typeof cb === 'function') cb({ success: false, error: 'No active solo match' });
        }
      } catch (err: any) {
        if (typeof cb === 'function') cb({ success: false, error: err.message });
      }
    });

    socket.on('solo:forfeit', async (cb?: any) => {
      const effectiveUserId = userId || socket.data.userId;
      if (!effectiveUserId) return;
      try {
        const { SoloManager } = require('../ai/solo.manager');
        await SoloManager.forfeitSession(effectiveUserId);
        if (typeof cb === 'function') cb({ success: true });
      } catch (err: any) {
        if (typeof cb === 'function') cb({ success: false, error: err.message });
      }
    });

    // ------------------------------------------------------------------------
    // Real-Time Authoritative Game Events (Tic-Tac-Toe, etc.)
    // ------------------------------------------------------------------------

    socket.on('game:action', async (data: { roomCode: string; action: any }, cb?: any) => {
      const effectiveUserId = userId || socket.data.userId || 'guest_player';
      if (!effectiveUserId || !data?.roomCode) {
        if (typeof cb === 'function') cb({ success: false, error: 'Unauthorized or missing room code' });
        return;
      }

      // Security: Rate limiting action flood protection
      if (!checkActionRateLimit(socket.id, 10)) {
        if (typeof cb === 'function') {
          cb({ success: false, error: 'Action rate limit exceeded: maximum 10 actions per second' });
        }
        return;
      }

      try {
        const result = await MatchManager.handleAction(data.roomCode, effectiveUserId, data.action);
        if (typeof cb === 'function') cb(result);
      } catch (err: any) {
        if (typeof cb === 'function') cb({ success: false, error: err.message });
      }
    });

    socket.on('game:rematch_request', (data: { roomCode: string }, cb?: any) => {
      const effectiveUserId = userId || socket.data.userId || 'guest_player';
      if (!effectiveUserId || !data?.roomCode) {
        if (typeof cb === 'function') cb({ success: false, error: 'Unauthorized or missing room code' });
        return;
      }
      try {
        const result = MatchManager.requestRematch(data.roomCode, effectiveUserId);
        if (typeof cb === 'function') cb({ success: true, ...result });
      } catch (err: any) {
        if (typeof cb === 'function') cb({ success: false, error: err.message });
      }
    });

    socket.on('game:rematch_response', (data: { roomCode: string; accept: boolean }, cb?: any) => {
      const effectiveUserId = userId || socket.data.userId || 'guest_player';
      if (!effectiveUserId || !data?.roomCode) {
        if (typeof cb === 'function') cb({ success: false, error: 'Unauthorized or missing room code' });
        return;
      }
      try {
        const result = MatchManager.respondRematch(data.roomCode, effectiveUserId, !!data.accept);
        if (typeof cb === 'function') cb({ success: true, ...result });
      } catch (err: any) {
        if (typeof cb === 'function') cb({ success: false, error: err.message });
      }
    });

    socket.on('game:forfeit', async (data: { roomCode: string }, cb?: any) => {
      const effectiveUserId = userId || socket.data.userId || 'guest_player';
      if (!effectiveUserId || !data?.roomCode) {
        if (typeof cb === 'function') cb({ success: false, error: 'Unauthorized or missing room code' });
        return;
      }
      try {
        await MatchManager.handleForfeit(data.roomCode, effectiveUserId);
        if (typeof cb === 'function') cb({ success: true });
      } catch (err: any) {
        if (typeof cb === 'function') cb({ success: false, error: err.message });
      }
    });

    socket.on('game:get_state', (data: { roomCode: string }, cb?: any) => {
      if (!data?.roomCode) {
        if (typeof cb === 'function') cb({ success: false, error: 'Missing room code' });
        return;
      }
      const match = MatchManager.getMatch(data.roomCode);
      if (typeof cb === 'function') {
        if (match) {
          cb({
            success: true,
            sequenceNumber: match.sequenceNumber,
            state: match.state,
            round: match.round,
            scores: match.scores,
            players: match.players,
          });
        } else {
          cb({ success: false, error: 'No active match found in room' });
        }
      }
    });

    // ─── 1-on-1 Audio & Video Calling Signaling ─────────────────────────────────────

    socket.on('call:initiate', async (data: {
      callId: string;
      recipientId: string;
      callType: 'audio' | 'video';
      conversationId?: string;
      callerInfo?: { name: string; username: string; avatarUrl: string | null };
    }, cb?: any) => {
      if (!userId || !data?.recipientId || !data?.callId) {
        if (typeof cb === 'function') cb({ success: false, error: 'Invalid call initiation data' });
        return;
      }

      // Check if recipient is already in a call
      if (userActiveCall.has(data.recipientId)) {
        if (typeof cb === 'function') cb({ success: false, error: 'User is currently on another call', isBusy: true });
        return;
      }

      // If caller is already in a call, clear previous
      const existingCallId = userActiveCall.get(userId);
      if (existingCallId) {
        const prevCall = activeCalls.get(existingCallId);
        if (prevCall) {
          if (prevCall.timeoutTimer) clearTimeout(prevCall.timeoutTimer);
          activeCalls.delete(existingCallId);
          userActiveCall.delete(prevCall.callerId);
          userActiveCall.delete(prevCall.recipientId);
        }
      }

      // 45 seconds timeout if not answered
      const timeoutTimer = setTimeout(() => {
        const call = activeCalls.get(data.callId);
        if (call && call.status === 'ringing') {
          activeCalls.delete(data.callId);
          userActiveCall.delete(call.callerId);
          userActiveCall.delete(call.recipientId);
          emitToUser(call.callerId, 'call:rejected', { callId: data.callId, reason: 'no_answer' });
          emitToUser(call.recipientId, 'call:ended', { callId: data.callId, reason: 'missed' });
        }
      }, 45000);

      const session: ActiveCallSession = {
        callId: data.callId,
        callerId: userId,
        recipientId: data.recipientId,
        callType: data.callType || 'audio',
        status: 'ringing',
        conversationId: data.conversationId,
        timeoutTimer,
      };

      activeCalls.set(data.callId, session);
      userActiveCall.set(userId, data.callId);
      userActiveCall.set(data.recipientId, data.callId);

      // Route incoming call event to recipient
      emitToUser(data.recipientId, 'call:incoming', {
        callId: data.callId,
        callerId: userId,
        callType: data.callType || 'audio',
        callerInfo: data.callerInfo || { name: username, username, avatarUrl: null },
        conversationId: data.conversationId,
        timestamp: new Date().toISOString(),
      });

      // Dispatch high-priority push notification so device shows incoming call
      const callerDisplayName = data.callerInfo?.name || username;
      PushNotificationService.notifyIncomingCall(
        data.recipientId,
        callerDisplayName,
        data.callType || 'audio',
        data.callId
      ).catch(() => null);

      if (typeof cb === 'function') cb({ success: true, callId: data.callId });
    });

    socket.on('call:accept', (data: { callId: string }, cb?: any) => {
      if (!userId || !data?.callId) return;
      const call = activeCalls.get(data.callId);
      if (!call) {
        if (typeof cb === 'function') cb({ success: false, error: 'Call no longer active' });
        return;
      }

      if (call.timeoutTimer) clearTimeout(call.timeoutTimer);
      call.status = 'connected';
      call.startedAt = Date.now();

      emitToUser(call.callerId, 'call:accepted', { callId: call.callId, timestamp: new Date().toISOString() });
      emitToUser(call.recipientId, 'call:accepted', { callId: call.callId, timestamp: new Date().toISOString() });

      if (typeof cb === 'function') cb({ success: true });
    });

    socket.on('call:reject', (data: { callId: string; reason?: string }, cb?: any) => {
      if (!userId || !data?.callId) return;
      const call = activeCalls.get(data.callId);
      if (call) {
        if (call.timeoutTimer) clearTimeout(call.timeoutTimer);
        activeCalls.delete(data.callId);
        userActiveCall.delete(call.callerId);
        userActiveCall.delete(call.recipientId);

        const otherUserId = call.callerId === userId ? call.recipientId : call.callerId;
        emitToUser(otherUserId, 'call:rejected', {
          callId: data.callId,
          reason: data.reason || 'declined',
          byUserId: userId,
        });
      }
      if (typeof cb === 'function') cb({ success: true });
    });

    socket.on('call:end', (data: { callId: string; durationSeconds?: number }, cb?: any) => {
      if (!userId || !data?.callId) return;
      const call = activeCalls.get(data.callId);
      if (call) {
        if (call.timeoutTimer) clearTimeout(call.timeoutTimer);
        activeCalls.delete(data.callId);
        userActiveCall.delete(call.callerId);
        userActiveCall.delete(call.recipientId);

        const otherUserId = call.callerId === userId ? call.recipientId : call.callerId;
        emitToUser(otherUserId, 'call:ended', {
          callId: data.callId,
          durationSeconds: data.durationSeconds || 0,
          endedBy: userId,
        });
      }
      if (typeof cb === 'function') cb({ success: true });
    });

    socket.on('call:media_state', (data: { callId: string; isMuted?: boolean; isVideoOff?: boolean }) => {
      if (!userId || !data?.callId) return;
      const call = activeCalls.get(data.callId);
      if (call) {
        const otherUserId = call.callerId === userId ? call.recipientId : call.callerId;
        emitToUser(otherUserId, 'call:peer_media_state', {
          callId: data.callId,
          isMuted: data.isMuted,
          isVideoOff: data.isVideoOff,
          userId,
        });
      }
    });

    socket.on('call:signal', (data: { callId: string; signal: any }) => {
      if (!userId || !data?.callId || !data?.signal) return;
      const call = activeCalls.get(data.callId);
      if (call) {
        const otherUserId = call.callerId === userId ? call.recipientId : call.callerId;
        emitToUser(otherUserId, 'call:signal', {
          callId: data.callId,
          signal: data.signal,
          fromUserId: userId,
        });
      }
    });

    socket.on('disconnect', async (reason) => {
      console.log(`🔌 [Socket.IO] Client disconnected: ${socket.id} (${reason})`);

      if (userId) {
        // Disconnect clean-up for active calls
        const activeCallId = userActiveCall.get(userId);
        if (activeCallId) {
          const call = activeCalls.get(activeCallId);
          if (call) {
            if (call.timeoutTimer) clearTimeout(call.timeoutTimer);
            activeCalls.delete(activeCallId);
            userActiveCall.delete(call.callerId);
            userActiveCall.delete(call.recipientId);
            const otherUserId = call.callerId === userId ? call.recipientId : call.callerId;
            emitToUser(otherUserId, 'call:ended', { callId: activeCallId, reason: 'peer_disconnected' });
          }
        }
        // Handle Multiplayer Room Disconnect Grace Window (30 seconds)
        const activeRoomCode = userActiveRoom.get(userId);
        if (activeRoomCode) {
          MatchManager.handlePlayerDisconnect(activeRoomCode, userId);

          const timerKey = `${userId}:${activeRoomCode}`;
          if (!disconnectGraceTimers.has(timerKey)) {
            emitToRoom(activeRoomCode, 'room:player_disconnected', {
              userId,
              username,
              roomCode: activeRoomCode,
              graceSeconds: 30,
              timestamp: new Date().toISOString(),
            });

            const graceTimer = setTimeout(async () => {
              disconnectGraceTimers.delete(timerKey);
              userActiveRoom.delete(userId);
              emitToRoom(activeRoomCode, 'room:player_abandoned', {
                userId,
                username,
                roomCode: activeRoomCode,
                timestamp: new Date().toISOString(),
              });
              await MatchManager.handleForfeit(activeRoomCode, userId);
            }, 30000);

            disconnectGraceTimers.set(timerKey, graceTimer);
          }
        }

        const userSockets = activeUserSockets.get(userId);
        if (userSockets) {
          userSockets.delete(socket.id);
          if (userSockets.size === 0) {
            activeUserSockets.delete(userId);
          }
        }

        PresenceService.handleSocketDisconnect(userId, socket.id, async (now) => {
          await PresenceService.notifyAuthorizedRecipients(userId, false, now, emitToUser);
        });
      }
    });
  });

  console.log('✅ Socket.IO Gateway initialized with Realtime Chat, Rooms & Presence support');
  return io;
}
