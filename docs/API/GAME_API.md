# 🎮 Game & Room API Specification *(Planned - Phase 7, 8, 9)*

### `POST /api/v1/rooms`
- **Auth**: Bearer JWT
- **Body**: `{ "gameType": "LUDO", "isPrivate": true, "maxPlayers": 4 }`
- **Response `201`**: Returns created room object including unique 6-character room code.

### `POST /api/v1/rooms/:code/join`
- **Auth**: Bearer JWT
- **Response `200`**: Assigns player slot and returns room details.

### `GET /api/v1/games/history`
- **Auth**: Bearer JWT
- **Response `200`**: User match history with outcomes, durations, and opponents.

### `GET /api/v1/leaderboards`
- **Auth**: Bearer JWT
- **Query**: `?gameType=LUDO&scope=global`
- **Response `200`**: Ranked leaderboard rows.
