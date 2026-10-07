import { API_BASE_URL } from './api';
import { MobileAuthService } from './auth.service';

export interface RoomPlayer {
  id: string;
  userId: string;
  slotIndex: number;
  isReady: boolean;
  score: number;
  user: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
    isOnline: boolean;
  };
}

export type SupportedGameType =
  | 'TICTACTOE'
  | 'LUDO'
  | 'CONNECT_FOUR'
  | 'REVERSI'
  | 'GOMOKU'
  | 'CHECKERS'
  | 'CHESS'
  | 'CARDS'
  | string;

export interface RoomDetails {
  id: string;
  code: string;
  gameType: SupportedGameType;
  status: 'WAITING' | 'PLAYING' | 'FINISHED';
  isPrivate: boolean;
  maxPlayers: number;
  hostId: string;
  host: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
  } | null;
  players: RoomPlayer[];
  createdAt: string;
  updatedAt: string;
}

export class RoomService {
  private static async getAuthHeaders(): Promise<Record<string, string>> {
    const token = await MobileAuthService.getStoredToken();
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  static async createRoom(
    gameType: SupportedGameType = 'TICTACTOE',
    isPrivate = true,
    maxPlayers?: number
  ): Promise<RoomDetails> {
    const headers = await this.getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/rooms`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ gameType, isPrivate, maxPlayers }),
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error?.message || 'Failed to create game room');
    }
    return json.data;
  }

  static async getRoom(code: string): Promise<RoomDetails> {
    const headers = await this.getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/rooms/${code.trim().toUpperCase()}`, {
      method: 'GET',
      headers,
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error?.message || 'Failed to retrieve room details');
    }
    return json.data;
  }

  static async joinRoom(code: string): Promise<RoomDetails> {
    const headers = await this.getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/rooms/${code.trim().toUpperCase()}/join`, {
      method: 'POST',
      headers,
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error?.message || 'Failed to join game room');
    }
    return json.data;
  }

  static async toggleReady(code: string, isReady?: boolean): Promise<RoomDetails> {
    const headers = await this.getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/rooms/${code.trim().toUpperCase()}/ready`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ isReady }),
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error?.message || 'Failed to update ready state');
    }
    return json.data;
  }

  static async startGame(code: string): Promise<RoomDetails> {
    const headers = await this.getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/rooms/${code.trim().toUpperCase()}/start`, {
      method: 'POST',
      headers,
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error?.message || 'Failed to start match');
    }
    return json.data;
  }

  static async leaveRoom(code: string): Promise<any> {
    const headers = await this.getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/rooms/${code.trim().toUpperCase()}/leave`, {
      method: 'POST',
      headers,
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error?.message || 'Failed to leave room');
    }
    return json.data;
  }

  static async matchmake(
    gameType: SupportedGameType = 'TICTACTOE'
  ): Promise<{ matched: boolean; waitingForOpponent?: boolean; room: RoomDetails }> {
    const headers = await this.getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/rooms/matchmake`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ gameType }),
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error?.message || 'Matchmaking request failed');
    }
    return json.data;
  }
}
