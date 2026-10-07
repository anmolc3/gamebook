# 📑 Core Test Cases

## Auth & Account
- TC-AUTH-01: Valid registration creates user + profile and issues JWT.
- TC-AUTH-02: Duplicate username or email rejected with 400.
- TC-AUTH-03: Login with invalid password fails with 401.

## Social & Chat
- TC-SOC-01: User cannot send friend request to themselves.
- TC-SOC-02: Friend request acceptance generates reciprocal Friendship record.
- TC-CHAT-01: Inbound message delivers in real time via socket; status updates to DELIVERED.

## Multiplayer & Games
- TC-GAME-01: Action submitted by non-active player rejected by server.
- TC-GAME-02: Invalid move (e.g. occupied cell in Tic-Tac-Toe) rejected with error payload.
- TC-GAME-03: Disconnected player reconnected within 30s resumes match without state loss.
- TC-GAME-04: Disconnected player failing to reconnect within 30s forfeits match.
