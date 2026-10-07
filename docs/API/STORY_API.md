# 📸 Story API Specification *(Planned - Phase 10)*

### `GET /api/v1/stories/feed`
- **Auth**: Bearer JWT
- **Response `200`**: Grouped active stories from friends and current user created within the last 24 hours.

### `POST /api/v1/stories`
- **Auth**: Bearer JWT
- **Body**:
  ```json
  {
    "mediaUrl": "https://storage.url/story.jpg",
    "mediaType": "IMAGE",
    "caption": "Victory streak in Ludo!",
    "privacy": "FRIENDS"
  }
  ```
- **Response `201`**: Created story with automatic 24h expiration timestamp.

### `POST /api/v1/stories/:id/view`
- **Auth**: Bearer JWT
- **Response `200`**: Records view event for the author's viewer list.
