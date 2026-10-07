# Phase 7: Multiplayer Game Rooms & Lobbies

## Objective
Build a reusable, game-agnostic multiplayer room system supporting dynamic room creation with 6-character user-friendly codes, player slot management, host controls, ready state toggling, public matchmaking, and 30-second disconnect grace windows.

---

## Architectural Scope & Requirements
- **Game-Agnostic Engine Integration**:
  - Room system dynamically queries `GameRegistry` for player limits (`minPlayers` to `maxPlayers`), turn timings, and category settings.
  - Zero hardcoding for specific game titles; supports board, card, casual, puzzle, and party games alike.
- **Room Lifecycle**:
  - Dynamic room generation (`POST /api/v1/rooms`) with collision-resistant 6-character uppercase codes (`ABCDEFGHJKLMNPQRSTUVWXYZ23456789`).
  - Join via code (`POST /api/v1/rooms/:code/join`) with slot index assignment (`0 .. maxPlayers - 1`) and idempotent rejoin.
  - Ready state synchronization (`POST /api/v1/rooms/:code/ready`).
  - Host controls (`POST /api/v1/rooms/:code/start`) validating all players are ready before emitting `game:start`.
  - Player exit (`POST /api/v1/rooms/:code/leave`) with automatic host reassignment or empty room cleanup.
  - 1-click public matchmaking queue (`POST /api/v1/rooms/matchmake`) matching players in sub-1s.
- **Real-Time Socket.IO Channels**:
  - Room channels: `room:join`, `room:leave` (`room:${roomCode}`).
  - Authoritative broadcasts: `room:player_joined`, `room:player_left`, `room:player_ready`, `room:state`, `game:start`, `room:disbanded`.
- **30-Second Disconnect Grace Protocol**:
  - Memory-tracked room sessions (`userActiveRoom`).
  - Triggers 30-second timer and broadcasts `room:player_disconnected` with `graceSeconds: 30`.
  - Reconnection reconciles state and broadcasts `room:player_reconnected`.
  - Timer expiration triggers `room:player_abandoned` and handles forfeit.
- **Mobile UI**:
  - `RoomLobbyScreen`: 6-character code card, copy action, slot grid with host crown and ready indicators, disconnect countdown banner, host start controls.
  - `JoinRoomModal`: 3-tab dialog (Quick Play, Join via Code, Custom Room Creation).

---

## Completion Checklist
- [x] Game-agnostic room system utilizing `GameRegistry`
- [x] Room creation with unique 6-character alphanumeric codes
- [x] Player slots, host status, and ready states synchronized
- [x] Public matchmaking queue with automatic pairing
- [x] Host controls and match launch trigger
- [x] 30-second disconnect grace window protocol operational
- [x] Mobile RoomLobbyScreen and JoinRoomModal fully wired

---

## Current Status
**IN PROGRESS**
