# ⚡ Real-Time Communication Architecture

## 1. Overview
Socket.IO powers all bi-directional, synchronous communication: real-time presence indicators, direct chat messages, delivery receipts, typing indicators, game room lobbies, and server-authoritative live game moves.

---

## 2. Connection Lifecycle & Handshake Authentication
1. **Handshake**: Client initiates WebSocket connection with Bearer JWT token in `auth: { token }` payload.
2. **Verification**: Server validates JWT via `authenticateSocketHandshake`; unauthenticated connections are refused with `401 Unauthorized`.
3. **Personal Room Binding**: Socket automatically joins `user:${userId}` room for targeted notifications, game invites, and read receipts.
4. **Presence Broadcasting**:
   - Connection marks `Profile.isOnline = true` in PostgreSQL.
   - Emits `presence:update` to all mutual friends via their personal rooms.
5. **Multi-Tab / Multi-Device Tracking**:
   - Connections per user are tracked via `activeUserSockets: Map<string, Set<string>>`.
   - User only transitions to offline when their final active socket disconnects.

---

## 3. Channel & Room Topology

| Room Key | Purpose | Subscribers |
| :--- | :--- | :--- |
| `user:${userId}` | Personal targeted alerts, friend requests, game invites, direct message delivery. | User's active sockets. |
| `conversation:${convId}` | Live 1-on-1 chat typing indicators (`chat:user_typing`). | Active chat participants. |
| `room:${roomCode}` | Multiplayer lobby slot changes, readiness toggles, authoritative match state. | Room players & spectators. |

---

## 4. 30-Second Reconnection Grace Protocol
Mobile wireless connections suffer from cellular handovers and tunnel dropouts:
1. **Grace Window Trigger**: When a socket drops unexpectedly, server checks active room affiliations and starts a **30-second Grace Timer**.
2. **Peer Notification**: Broadcasts `room:player_disconnected` with `graceSeconds: 30` to notify lobby/match peers.
3. **Reconciliation**: When player reconnects within 30s and emits `room:join`, server cancels the timer and emits `room:player_reconnected`.
4. **Abandonment**: If 30 seconds elapse without reconnect, server emits `room:player_abandoned` and handles forfeit.

---

## 5. Anti-Desync Safeguards
- State updates carry a monotonically increasing `sequenceNumber`.
- If a client detects a sequence number gap, it requests an authoritative state snapshot via `game:sync`.
