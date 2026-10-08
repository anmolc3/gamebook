import { io, Socket } from 'socket.io-client';
import { SOCKET_URL } from './api';
import { MobileAuthService } from './auth.service';

let socket: Socket | null = null;

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
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      console.log('⚡ [Socket] Connected to real-time multiplayer gateway');
    });

    socket.on('disconnect', (reason) => {
      console.log(`🔌 [Socket] Disconnected: ${reason}`);
    });

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
    if (!socket) return () => {};
    socket.on('presence:update', callback);
    return () => {
      socket?.off('presence:update', callback);
    };
  }

  // Social friend request listeners
  static onFriendRequestReceived(callback: (data: any) => void): () => void {
    if (!socket) return () => {};
    socket.on('friend:request_received', callback);
    return () => {
      socket?.off('friend:request_received', callback);
    };
  }

  static onFriendRequestAccepted(callback: (data: any) => void): () => void {
    if (!socket) return () => {};
    socket.on('friend:request_accepted', callback);
    return () => {
      socket?.off('friend:request_accepted', callback);
    };
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
    if (!socket) return () => {};
    socket.on('chat:user_typing', callback);
    return () => {
      socket?.off('chat:user_typing', callback);
    };
  }

  static onMessageReceived(callback: (message: any) => void): () => void {
    if (!socket) return () => {};
    socket.on('chat:message_received', callback);
    return () => {
      socket?.off('chat:message_received', callback);
    };
  }

  static onMessagesRead(
    callback: (data: { conversationId: string; readBy: string; readAt: string }) => void
  ): () => void {
    if (!socket) return () => {};
    socket.on('chat:messages_read', callback);
    return () => {
      socket?.off('chat:messages_read', callback);
    };
  }

  static onViewOnceOpened(
    callback: (data: { conversationId: string; messageId: string; openedAt: string }) => void
  ): () => void {
    if (!socket) return () => {};
    socket.on('chat:view_once_opened', callback);
    return () => {
      socket?.off('chat:view_once_opened', callback);
    };
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
    if (!socket) return () => {};
    socket.on('room:state', callback);
    return () => {
      socket?.off('room:state', callback);
    };
  }

  static onPlayerJoined(callback: (data: any) => void): () => void {
    if (!socket) return () => {};
    socket.on('room:player_joined', callback);
    return () => {
      socket?.off('room:player_joined', callback);
    };
  }

  static onPlayerLeft(callback: (data: any) => void): () => void {
    if (!socket) return () => {};
    socket.on('room:player_left', callback);
    return () => {
      socket?.off('room:player_left', callback);
    };
  }

  static onPlayerReady(callback: (data: any) => void): () => void {
    if (!socket) return () => {};
    socket.on('room:player_ready', callback);
    return () => {
      socket?.off('room:player_ready', callback);
    };
  }

  static onGameStart(callback: (data: any) => void): () => void {
    if (!socket) return () => {};
    socket.on('game:start', callback);
    return () => {
      socket?.off('game:start', callback);
    };
  }

  static onPlayerDisconnected(
    callback: (data: { userId: string; username: string; roomCode: string; graceSeconds: number }) => void
  ): () => void {
    if (!socket) return () => {};
    socket.on('room:player_disconnected', callback);
    return () => {
      socket?.off('room:player_disconnected', callback);
    };
  }

  static onPlayerReconnected(
    callback: (data: { userId: string; username: string; roomCode: string }) => void
  ): () => void {
    if (!socket) return () => {};
    socket.on('room:player_reconnected', callback);
    return () => {
      socket?.off('room:player_reconnected', callback);
    };
  }

  static onPlayerAbandoned(
    callback: (data: { userId: string; username: string; roomCode: string }) => void
  ): () => void {
    if (!socket) return () => {};
    socket.on('room:player_abandoned', callback);
    return () => {
      socket?.off('room:player_abandoned', callback);
    };
  }

  static onRoomDisbanded(callback: (data: any) => void): () => void {
    if (!socket) return () => {};
    socket.on('room:disbanded', callback);
    return () => {
      socket?.off('room:disbanded', callback);
    };
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
}

export const getSocket = (): Socket | null => MobileSocketService.getSocket();

