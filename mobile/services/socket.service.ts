import { io, Socket } from 'socket.io-client';
import { SOCKET_URL } from './api';
import { MobileAuthService } from './auth.service';

let socket: Socket | null = null;
const eventListeners = new Map<string, Set<Function>>();

function registerListener(event: string, callback: Function): () => void {
  if (!eventListeners.has(event)) {
    eventListeners.set(event, new Set());
    if (socket && socket.connected) {
      socket.off(event);
      socket.on(event, (...args: any[]) => {
        eventListeners.get(event)?.forEach((cb) => {
          try {
            cb(...args);
          } catch (err) {
            console.warn(`[Socket] Error in listener for ${event}:`, err);
          }
        });
      });
    }
  }
  eventListeners.get(event)!.add(callback);

  return () => {
    const set = eventListeners.get(event);
    if (set) {
      set.delete(callback);
    }
  };
}

function attachAllListeners(sock: Socket): void {
  eventListeners.forEach((listeners, event) => {
    sock.off(event);
    sock.on(event, (...args: any[]) => {
      listeners.forEach((cb) => {
        try {
          cb(...args);
        } catch (err) {
          console.warn(`[Socket] Error in listener for ${event}:`, err);
        }
      });
    });
  });
}

export class MobileSocketService {
  static async connect(): Promise<Socket | null> {
    const token = await MobileAuthService.getStoredToken();
    if (!token) {
      return null;
    }

    if (socket && socket.connected) {
      return socket;
    }

    socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      console.log('⚡ [Socket] Connected to real-time multiplayer gateway');
      if (socket) attachAllListeners(socket);
    });

    socket.on('disconnect', (reason) => {
      console.log(`🔌 [Socket] Disconnected: ${reason}`);
    });

    attachAllListeners(socket);

    return socket;
  }

  static getSocket(): Socket | null {
    return socket;
  }

  static disconnect(): void {
    if (socket) {
      socket.disconnect();
      socket = null;
    }
  }

  // Presence listeners
  static onPresenceUpdate(callback: (data: { userId: string; isOnline: boolean; lastSeen: string }) => void): () => void {
    return registerListener('presence:update', callback);
  }

  // Social friend request listeners
  static onFriendRequestReceived(callback: (data: any) => void): () => void {
    return registerListener('friend:request_received', callback);
  }

  static onFriendRequestAccepted(callback: (data: any) => void): () => void {
    return registerListener('friend:request_accepted', callback);
  }

  // Real-Time Story updates
  static onStoryNew(callback: (data: any) => void): () => void {
    return registerListener('story:new', callback);
  }

  // Real-Time Game Room Invites Across All Games
  static sendGameInvite(
    recipientId: string,
    roomCode: string,
    gameType: string,
    gameName?: string
  ): Promise<{ success: boolean; error?: string }> {
    return new Promise((resolve) => {
      if (!socket || !socket.connected) {
        resolve({ success: false, error: 'Socket not connected' });
        return;
      }
      socket.emit(
        'room:invite',
        { recipientId, roomCode, gameType, gameName },
        (res: any) => {
          resolve(res || { success: true });
        }
      );
    });
  }

  static onGameInviteReceived(
    callback: (invite: {
      inviterId: string;
      inviterName: string;
      inviterAvatarUrl?: string | null;
      roomCode: string;
      gameType: string;
      gameName: string;
      timestamp: string;
    }) => void
  ): () => void {
    return registerListener('game:invite_received', callback);
  }

  // Chat real-time room joining & events
  static joinConversation(conversationId: string): void {
    if (socket) {
      socket.emit('chat:join', { conversationId });
    }
  }

  static leaveConversation(conversationId: string): void {
    if (socket) {
      socket.emit('chat:leave', { conversationId });
    }
  }

  static sendTyping(conversationId: string, isTyping: boolean): void {
    if (socket) {
      socket.emit('chat:typing', { conversationId, isTyping });
    }
  }

  static onUserTyping(
    callback: (data: { conversationId: string; userId: string; username: string; isTyping: boolean }) => void
  ): () => void {
    return registerListener('chat:user_typing', callback);
  }

  static onMessageReceived(callback: (message: any) => void): () => void {
    return registerListener('chat:message_received', callback);
  }

  static sendDeliveryConfirmation(conversationId: string, messageIds?: string[]): void {
    if (socket) {
      socket.emit('chat:message_delivered', { conversationId, messageIds });
    }
  }

  static sendMessagesRead(conversationId: string, messageIds?: string[]): void {
    if (socket) {
      socket.emit('chat:messages_read', { conversationId, messageIds });
    }
  }

  static sendGroupReadReceipt(conversationId: string, messageIds?: string[]): void {
    if (socket) {
      socket.emit('group:messages:read', { conversationId, messageIds });
    }
  }

  static onMessageDelivered(
    callback: (data: {
      conversationId: string;
      messageId: string;
      deliveredTo: string;
      deliveredAt: string;
      status: 'SENT' | 'DELIVERED' | 'READ';
      isAllDelivered?: boolean;
    }) => void
  ): () => void {
    return registerListener('chat:message_delivered', callback);
  }

  static onMessagesRead(
    callback: (data: {
      conversationId: string;
      readBy: string;
      readAt: string;
      messageId?: string;
      messageIds?: string[];
      status?: 'READ' | 'DELIVERED';
      isAllRead?: boolean;
      messageUpdates?: Array<{
        messageId: string;
        readCount: number;
        totalRecipients: number;
        isAllRead: boolean;
        status: 'SENT' | 'DELIVERED' | 'READ';
      }>;
    }) => void
  ): () => void {
    const unsub1 = registerListener('chat:messages_read', callback);
    const unsub2 = registerListener('group:read_receipt', callback);
    return () => {
      unsub1();
      unsub2();
    };
  }

  static onViewOnceOpened(
    callback: (data: { conversationId: string; messageId: string; openedAt: string }) => void
  ): () => void {
    return registerListener('chat:view_once_opened', callback);
  }

  // Group real-time event listeners
  static onGroupCreated(callback: (data: any) => void): () => void {
    return registerListener('chat:group_created', callback);
  }

  static onGroupUpdated(callback: (data: any) => void): () => void {
    return registerListener('chat:group_updated', callback);
  }

  static onGroupMembersUpdated(callback: (data: any) => void): () => void {
    return registerListener('chat:group_members_updated', callback);
  }

  static onGroupMemberRemoved(callback: (data: any) => void): () => void {
    return registerListener('chat:group_member_removed', callback);
  }

  static onGroupMemberLeft(callback: (data: any) => void): () => void {
    return registerListener('chat:group_member_left', callback);
  }

  static onGroupRoleUpdated(callback: (data: any) => void): () => void {
    return registerListener('chat:group_role_updated', callback);
  }

  static onGroupRemoved(callback: (data: any) => void): () => void {
    return registerListener('chat:group_removed', callback);
  }

  // Multiplayer Game Room & Lobby Real-Time Events
  static joinRoom(roomCode: string, callback?: (data: any) => void): void {
    if (socket) {
      socket.emit('room:join', { roomCode }, callback);
    }
  }

  static leaveRoom(roomCode: string): void {
    if (socket) {
      socket.emit('room:leave', { roomCode });
    }
  }

  static onRoomState(callback: (room: any) => void): () => void {
    return registerListener('room:state', callback);
  }

  static onPlayerJoined(callback: (data: any) => void): () => void {
    return registerListener('room:player_joined', callback);
  }

  static onPlayerLeft(callback: (data: any) => void): () => void {
    return registerListener('room:player_left', callback);
  }

  static onPlayerReady(callback: (data: any) => void): () => void {
    return registerListener('room:player_ready', callback);
  }

  static onGameStart(callback: (data: any) => void): () => void {
    return registerListener('game:start', callback);
  }

  static onPlayerDisconnected(
    callback: (data: { userId: string; username: string; roomCode: string; graceSeconds: number }) => void
  ): () => void {
    return registerListener('room:player_disconnected', callback);
  }

  static onPlayerReconnected(
    callback: (data: { userId: string; username: string; roomCode: string }) => void
  ): () => void {
    return registerListener('room:player_reconnected', callback);
  }

  static onPlayerAbandoned(
    callback: (data: { userId: string; username: string; roomCode: string }) => void
  ): () => void {
    return registerListener('room:player_abandoned', callback);
  }

  static onRoomDisbanded(callback: (data: any) => void): () => void {
    return registerListener('room:disbanded', callback);
  }

  // --------------------------------------------------------------------------
  // Real-Time Authoritative Game Events (Tic-Tac-Toe, etc.)
  // --------------------------------------------------------------------------

  static sendGameAction(roomCode: string, action: any): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!socket) return reject(new Error('Socket disconnected'));
      socket.emit('game:action', { roomCode, action }, (res: any) => {
        if (res && res.success === false) {
          reject(new Error(res.error || 'Failed to submit move'));
        } else {
          resolve(res);
        }
      });
    });
  }

  static requestRematch(roomCode: string): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!socket) return reject(new Error('Socket disconnected'));
      socket.emit('game:rematch_request', { roomCode }, (res: any) => {
        if (res && res.success === false) {
          reject(new Error(res.error || 'Failed to request rematch'));
        } else {
          resolve(res);
        }
      });
    });
  }

  static respondRematch(roomCode: string, accept: boolean): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!socket) return reject(new Error('Socket disconnected'));
      socket.emit('game:rematch_response', { roomCode, accept }, (res: any) => {
        if (res && res.success === false) {
          reject(new Error(res.error || 'Failed to respond to rematch'));
        } else {
          resolve(res);
        }
      });
    });
  }

  static forfeitGame(roomCode: string): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!socket) return reject(new Error('Socket disconnected'));
      socket.emit('game:forfeit', { roomCode }, (res: any) => {
        if (res && res.success === false) {
          reject(new Error(res.error || 'Failed to forfeit game'));
        } else {
          resolve(res);
        }
      });
    });
  }

  static getGameState(roomCode: string): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!socket) return reject(new Error('Socket disconnected'));
      socket.emit('game:get_state', { roomCode }, (res: any) => {
        if (res && res.success === false) {
          reject(new Error(res.error || 'Failed to get game state'));
        } else {
          resolve(res);
        }
      });
    });
  }

  static onGameState(callback: (data: any) => void): () => void {
    if (!socket) return () => {};
    socket.on('game:state', callback);
    return () => {
      socket?.off('game:state', callback);
    };
  }

  static onGameOver(callback: (data: any) => void): () => void {
    if (!socket) return () => {};
    socket.on('game:over', callback);
    return () => {
      socket?.off('game:over', callback);
    };
  }

  static onRematchOffered(callback: (data: any) => void): () => void {
    if (!socket) return () => {};
    socket.on('game:rematch_offered', callback);
    return () => {
      socket?.off('game:rematch_offered', callback);
    };
  }

  static onRematchDeclined(callback: (data: any) => void): () => void {
    if (!socket) return () => {};
    socket.on('game:rematch_declined', callback);
    return () => {
      socket?.off('game:rematch_declined', callback);
    };
  }

  static onRematchStarted(callback: (data: any) => void): () => void {
    if (!socket) return () => {};
    socket.on('game:rematch_started', callback);
    return () => {
      socket?.off('game:rematch_started', callback);
    };
  }

  static onGameStarted(callback: (data: any) => void): () => void {
    if (!socket) return () => {};
    socket.on('game:started', callback);
    return () => {
      socket?.off('game:started', callback);
    };
  }

  // ==========================================
  // Real-time 1-on-1 Audio & Video Call Methods
  // ==========================================

  static initiateCall(payload: {
    callId: string;
    recipientId: string;
    callType: 'audio' | 'video';
    callerInfo: { name: string; username: string; avatarUrl: string | null };
    conversationId?: string;
  }): void {
    if (socket) {
      socket.emit('call:initiate', payload);
    }
  }

  static acceptCall(callId: string): void {
    if (socket) {
      socket.emit('call:accept', { callId });
    }
  }

  static rejectCall(callId: string, reason = 'declined'): void {
    if (socket) {
      socket.emit('call:reject', { callId, reason });
    }
  }

  static endCall(callId: string, durationSeconds = 0): void {
    if (socket) {
      socket.emit('call:end', { callId, durationSeconds });
    }
  }

  static sendCallMediaState(callId: string, isMuted?: boolean, isVideoOff?: boolean): void {
    if (socket) {
      socket.emit('call:media_state', { callId, isMuted, isVideoOff });
    }
  }

  static sendCallSignal(callId: string, signal: any): void {
    if (socket) {
      socket.emit('call:signal', { callId, signal });
    }
  }

  static onCallIncoming(
    callback: (data: {
      callId: string;
      callerId: string;
      callType: 'audio' | 'video';
      callerInfo: { name: string; username: string; avatarUrl: string | null };
      conversationId?: string;
      timestamp: string;
    }) => void
  ): () => void {
    return registerListener('call:incoming', callback);
  }

  static onCallAccepted(
    callback: (data: { callId: string; timestamp: string }) => void
  ): () => void {
    return registerListener('call:accepted', callback);
  }

  static onCallRejected(
    callback: (data: { callId: string; reason: string; byUserId?: string }) => void
  ): () => void {
    return registerListener('call:rejected', callback);
  }

  static onCallEnded(
    callback: (data: { callId: string; durationSeconds?: number; endedBy?: string; reason?: string }) => void
  ): () => void {
    return registerListener('call:ended', callback);
  }

  static onCallPeerMediaState(
    callback: (data: { callId: string; isMuted?: boolean; isVideoOff?: boolean; userId: string }) => void
  ): () => void {
    return registerListener('call:peer_media_state', callback);
  }

  static onCallSignal(
    callback: (data: { callId: string; signal: any; fromUserId: string }) => void
  ): () => void {
    return registerListener('call:signal', callback);
  }

  static notifyPresencePrivacyUpdate(): void {
    if (socket) {
      socket.emit('presence:privacy_update');
    }
  }

  static queryPresence(userId: string): Promise<{ isOnline: boolean; lastSeen: string | null }> {
    return new Promise((resolve) => {
      if (!socket) return resolve({ isOnline: false, lastSeen: null });
      socket.emit('presence:query', { userId }, (res: any) => {
        resolve(res || { isOnline: false, lastSeen: null });
      });
    });
  }

  // Real-time In-App Notifications
  static onNotificationReceived(callback: (notification: any) => void): () => void {
    return registerListener('notification:new', callback);
  }

  static onNotificationsCleared(callback: () => void): () => void {
    return registerListener('notifications:cleared', callback);
  }

  static onUnreadNotificationCount(callback: (data: { unreadCount: number }) => void): () => void {
    return registerListener('notifications:unread_count', callback);
  }
}

export const getSocket = (): Socket | null => MobileSocketService.getSocket();

