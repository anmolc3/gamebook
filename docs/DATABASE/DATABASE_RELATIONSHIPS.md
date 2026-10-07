# 🔗 Database Relationships & Integrity Rules

## Relational Constraints

### 1. User & Profile
- `User` 1-to-1 `Profile` (Cascade Delete: Deleting a User deletes the corresponding Profile).

### 2. Social Network
- `User` 1-to-Many `FriendRequest` (Sent Requests).
- `User` 1-to-Many `FriendRequest` (Received Requests).
- `Friendship`: Composite Unique constraint `[userId, friendId]` ensures no duplicate friend rows.
- `BlockedUser`: Composite Unique constraint `[blockerId, blockedId]`.

### 3. Messaging
- `Conversation` 1-to-Many `ConversationMember`.
- `Conversation` 1-to-Many `Message`.
- `Message` Many-to-1 `User` (as `sender`).

### 4. Ephemeral Stories
- `Story` 1-to-Many `StoryView`.
- `Story` 1-to-Many `StoryReply`.
- Foreign key constraints maintain clean referential integrity when stories expire or are deleted.

### 5. Multiplayer Records
- `GameRoom` 1-to-Many `GamePlayer`.
- `GameResult` references winner and participating user records.
