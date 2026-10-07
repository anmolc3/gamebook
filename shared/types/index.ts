export interface UserSummary {
  id: string;
  username: string;
  email: string;
  displayName: string;
  avatarUrl?: string | null;
  isOnline: boolean;
  lastSeen?: string | Date;
}

export type PresenceStatus = 'online' | 'inGame' | 'away' | 'offline';

export interface UserProfile extends UserSummary {
  bio?: string | null;
  themePreference: ThemeId;
  appearanceMode: AppearanceMode;
  createdAt: string | Date;
  stats: {
    totalMatches: number;
    totalWins: number;
    totalLosses: number;
    winRate: number;
  };
}

export type ThemeId = 
  | 'coralMarble' 
  | 'moonViolet' 
  | 'violetDusk' 
  | 'midnightNeutral' 
  | 'forestGold';

export type AppearanceMode = 'system' | 'light' | 'dark';

export type FriendRelationshipState = 
  | 'NONE'
  | 'REQUEST_SENT'
  | 'REQUEST_RECEIVED'
  | 'FRIENDS'
  | 'BLOCKED';

export interface FriendRequestDto {
  id: string;
  senderId: string;
  receiverId: string;
  sender: UserSummary;
  createdAt: string;
}

export type MessageType = 'TEXT' | 'GAME_INVITE' | 'GAME_RESULT';
export type MessageStatus = 'SENT' | 'DELIVERED' | 'READ';

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  type: MessageType;
  status: MessageStatus;
  metadata?: Record<string, any>;
  createdAt: string;
}
