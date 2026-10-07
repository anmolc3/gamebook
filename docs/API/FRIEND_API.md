# 👥 Friend API Specification *(Planned - Phase 5)*

### `GET /api/v1/friends`
- **Auth**: Bearer JWT
- **Response `200`**: List of confirmed friends with presence and avatars.

### `GET /api/v1/friends/requests`
- **Auth**: Bearer JWT
- **Response `200`**: Lists incoming and outgoing pending friend requests.

### `POST /api/v1/friends/requests`
- **Auth**: Bearer JWT
- **Body**: `{ "targetUserId": "uuid" }`
- **Response `201`**: `{ "success": true, "requestId": "uuid" }`

### `POST /api/v1/friends/requests/:id/accept`
- **Auth**: Bearer JWT
- **Response `200`**: Transitions friendship to confirmed status.

### `POST /api/v1/friends/requests/:id/reject`
- **Auth**: Bearer JWT
- **Response `200`**: Rejects pending request.

### `DELETE /api/v1/friends/:friendId`
- **Auth**: Bearer JWT
- **Response `200`**: Removes friend relationship.

### `POST /api/v1/users/:id/block`
- **Auth**: Bearer JWT
- **Response `200`**: Blocks target user across all social channels.
