# ⚡ Socket.IO Event Dictionary

Every real-time event is strongly typed. Raw event string literals are forbidden in client/server implementations; all code imports from `@shared/socket-events`.

## Event Manifest

| Event Name | Direction | Payload | Purpose |
| :--- | :--- | :--- | :--- |
| `presence:update` | Server -> Client | `{ userId, isOnline, status, lastSeen }` | Broadcast friend presence changes |
| `friend:request` | Server -> Client | `{ requestId, sender }` | Real-time friend request alert |
| `friend:accepted` | Server -> Client | `{ friendshipId, friend }` | Friend request acceptance notice |
| `chat:send` | Client -> Server | `{ conversationId, content, type }` | Dispatch new chat message |
| `chat:message` | Server -> Client | `{ message }` | Deliver inbound message |
| `chat:delivered` | Server -> Client | `{ messageId, userId }` | Update message delivery state |
| `chat:read` | Server -> Client | `{ messageId, userId }` | Update message read state |
| `chat:typing` | Both | `{ conversationId, userId, isTyping }` | Ephemeral typing indicator |
| `room:join` | Client -> Server | `{ roomCode }` | Join game room lobby |
| `room:state` | Server -> Client | `{ room }` | Synchronize full room state |
| `room:ready` | Client -> Server | `{ isReady }` | Toggle player ready status |
| `room:leave` | Client -> Server | `{}` | Exit room |
| `game:start` | Server -> Client | `{ initialState, turnPlayerId }` | Game launch trigger |
| `game:action` | Client -> Server | `{ actionType, payload }` | Player input (move/roll) |
| `game:state` | Server -> Client | `{ state, nextTurn, validMoves }` | Authoritative state broadcast |
| `game:finished` | Server -> Client | `{ winnerId, scoreSummary }` | Match outcome broadcast |
| `game:reconnect` | Client -> Server | `{ roomCode }` | Recover match state after disconnect |
