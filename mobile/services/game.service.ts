import { API_BASE_URL } from './api';
import { MobileAuthService } from './auth.service';

export interface GameStats {
  gameType: string;
  matchesPlayed: number;
  matchesWon: number;
  matchesLost: number;
  currentStreak: number;
  highestStreak: number;
  winRate: number;
}

export interface GameHistoryItem {
  id: string;
  gameType: string;
  winnerId: string | null;
  durationSeconds: number;
  createdAt: string;
  winner?: {
    id: string;
    username: string;
    profile?: {
      displayName: string;
      avatarUrl: string | null;
    };
  } | null;
}

export class GameService {
  private static async getAuthHeaders(): Promise<Record<string, string>> {
    const token = await MobileAuthService.getStoredToken();
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  static async fetchGameStats(gameType: string): Promise<GameStats> {
    const headers = await this.getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/games/stats/${gameType}`, {
      method: 'GET',
      headers,
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error || 'Failed to fetch game statistics');
    }
    return json;
  }

  static async fetchGameHistory(gameType: string, limit = 10): Promise<GameHistoryItem[]> {
    const headers = await this.getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/games/history/${gameType}?limit=${limit}`, {
      method: 'GET',
      headers,
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error || 'Failed to fetch game history');
    }
    return json.results || [];
  }

  static async fetchActiveMatch(roomCode: string): Promise<any> {
    const headers = await this.getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/games/active/${roomCode}`, {
      method: 'GET',
      headers,
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error || 'Failed to fetch active match');
    }
    return json;
  }

  static async fetchLiveOnlineCounts(): Promise<Record<string, number>> {
    try {
      const headers = await this.getAuthHeaders();
      const res = await fetch(`${API_BASE_URL}/games/live-online`, {
        method: 'GET',
        headers,
      });
      const json = await res.json();
      return json.counts || {};
    } catch {
      return {};
    }
  }
}
