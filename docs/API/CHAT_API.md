# 💬 Chat API Specification *(Planned - Phase 6)*

### `GET /api/v1/conversations`
- **Auth**: Bearer JWT
- **Response `200`**: List of active conversations with latest message preview and unread counters.

### `GET /api/v1/conversations/:id/messages`
- **Auth**: Bearer JWT
- **Query**: `?limit=30&cursor=timestamp`
- **Response `200`**: Paginated messages in chronological reverse order.

### `POST /api/v1/conversations/:id/messages`
- **Auth**: Bearer JWT
- **Body**:
  ```json
  {
    "content": "Ready for a quick game of Ludo?",
    "type": "TEXT"
  }
  ```
- **Response `201`**: Created message object.
