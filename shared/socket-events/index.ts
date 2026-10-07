export const SOCKET_EVENTS = {
  // Connection & Auth
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  ERROR: 'error',
  
  // Real-Time Presence
  PRESENCE_UPDATE: 'presence:update',
  PRESENCE_QUERY: 'presence:query',
  
  // Social & Friend Requests
  FRIEND_REQUEST: 'friend:request',
  FRIEND_ACCEPTED: 'friend:accepted',
  
  // Direct Messaging
  CHAT_SEND: 'chat:send',
  CHAT_MESSAGE: 'chat:message',
  CHAT_DELIVERED: 'chat:delivered',
  CHAT_READ: 'chat:read',
  CHAT_TYPING: 'chat:typing',
  
  // Multiplayer Rooms & Lobbies
  ROOM_CREATE: 'room:create',
  ROOM_JOIN: 'room:join',
  ROOM_LEAVE: 'room:leave',
  ROOM_STATE: 'room:state',
  ROOM_READY: 'room:ready',
  ROOM_PLAYER_JOINED: 'room:player_joined',
  ROOM_PLAYER_LEFT: 'room:player_left',
  
  // Game Lifecycle & Actions
  GAME_START: 'game:start',
  GAME_ACTION: 'game:action',
  GAME_STATE: 'game:state',
  GAME_FINISHED: 'game:finished',
  GAME_REMATCH_REQUEST: 'game:rematch_request',
  GAME_REMATCH_RESPONSE: 'game:rematch_response',
  GAME_RECONNECT: 'game:reconnect',
  GAME_FORFEIT: 'game:forfeit',
} as const;

export type SocketEventName = typeof SOCKET_EVENTS[keyof typeof SOCKET_EVENTS];
