# Phase 5: Friends & Social Graph

## Objective
Implement complete social graph management: user search with prefix matching, friend request lifecycle (sending, accepting, rejecting, cancelling), mutual friendship management, real-time presence indicators broadcast via Socket.IO, and player blocking/unblocking restrictions.

## Delivered Architecture

### 1. Backend REST Endpoints (`/api/v1/friends`)
- `GET /api/v1/friends`: Fetches accepted friends for the authenticated caller with online presence, lastSeen timestamp, total matches, total wins, and win rate.
- `GET /api/v1/friends/requests`: Retrieves separate lists for incoming pending requests and outgoing pending requests.
- `POST /api/v1/friends/request/:targetUserId`: Sends friend request with validations (cannot add self, cannot add if blocked, cannot send duplicate request). Automatically accepts request if cross-request already exists. Emits real-time `friend:request_received` to recipient.
- `POST /api/v1/friends/request/:requestId/accept`: Accepts friend request in a database transaction, creating bidirectional `Friendship` records and updating status to `ACCEPTED`. Emits real-time `friend:request_accepted` to sender.
- `POST /api/v1/friends/request/:requestId/reject`: Declines friend request and sets status to `REJECTED`.
- `DELETE /api/v1/friends/request/:requestId/cancel`: Cancels outgoing pending friend request.
- `DELETE /api/v1/friends/:friendId`: Removes bidirectional friendship and deletes past request history.
- `GET /api/v1/friends/search?q=...`: Searches players by username or display name with prefix/substring matching, computes relationship state (`NONE`, `REQUEST_SENT`, `REQUEST_RECEIVED`, `FRIENDS`), and filters out blocked players.
- `POST /api/v1/friends/block/:targetUserId`: Blocks user, removes mutual friendships, and cancels pending requests.
- `DELETE /api/v1/friends/block/:targetUserId`: Unblocks player.
- `GET /api/v1/friends/blocked`: Lists blocked players.

### 2. Real-Time Socket.IO Presence Engine (`server/src/sockets/socket.server.ts`)
- Multi-connection presence tracking using active socket sets per user ID.
- Automatically marks `Profile.isOnline = true` on initial connection and broadcasts `presence:update` to all mutual friends.
- Automatically marks `Profile.isOnline = false` and updates `lastSeen` on final disconnection and broadcasts update to friends.
- Real-time event emissions for `friend:request_received`, `friend:request_accepted`, and `friend:removed`.

### 3. Mobile Social Client & UI Architecture
- **[friends.service.ts](file:///c:/Users/anmol/OneDrive/Desktop/game%20app/mobile/services/friends.service.ts)**: API communication for all social graph operations.
- **[socket.service.ts](file:///c:/Users/anmol/OneDrive/Desktop/game%20app/mobile/services/socket.service.ts)**: Socket connection manager and real-time event listeners (`onPresenceUpdate`, `onFriendRequestReceived`, `onFriendRequestAccepted`).
- **[FriendsScreen.tsx](file:///c:/Users/anmol/OneDrive/Desktop/game%20app/mobile/screens/friends/FriendsScreen.tsx)**:
  - 3-segment Marvie control: **Friends**, **Requests**, and **Discover**.
  - *Friends Tab*: Live online count pill, cards with online dot indicators, quick Message & Play actions, unfriend confirmation alert.
  - *Requests Tab*: Incoming request cards with Accept/Decline action buttons, Sent request cards with Cancel button.
  - *Discover Tab*: Live debounced search bar, player cards with contextual action buttons (`Add`, `Sent`, `Accept`, `Friends`).
  - Seamless navigation to full `ProfileScreen` on player card press.

## Completion Checklist
- [x] User search functional (`GET /api/v1/friends/search?q=...`)
- [x] Friend request lifecycle implemented (send, receive, accept, decline, cancel)
- [x] Real-time presence updates over Socket.IO broadcast to mutual friends
- [x] Blocking and unblocking restrictions enforced with bidirectional relationship cleanup
- [x] Automated test suite verified (30/30 assertions passed in `server/test-friends.js`)
- [x] Automated Socket.IO real-time presence test passed (`server/test-friends-socket.js`)
- [x] Mobile TypeScript typecheck clean (0 errors)
- [x] Hermes Android bundle compiled successfully (729 modules, 2.1 MB)

## Current Status
**COMPLETE**
