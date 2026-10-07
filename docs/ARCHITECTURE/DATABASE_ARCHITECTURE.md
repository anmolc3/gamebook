# 🗄️ Database Architecture & Design

## Engine
- **Database Engine**: PostgreSQL 16+ (Local dev runs PostgreSQL 18).
- **ORM / Query Builder**: Prisma ORM.

## Indexing Strategy
To maintain sub-10ms response times:
1. `User.username`: Unique index for instant lookups and profile routing.
2. `Friendship(userId, friendId)`: Composite unique index and reverse lookup.
3. `Message(conversationId, createdAt DESC)`: Clustered timestamp index for pagination.
4. `Story(expiresAt, userId)`: Index to filter unexpired stories (< 24h).
5. `GameRoom.code`: Unique index for rapid 6-character room code joining.
6. `GameResult(gameType, createdAt DESC)`: Index for user match history queries.

## Data Partitioning & Lifecycle
- **Stories**: Automatically filtered via `WHERE expiresAt > NOW()`; background cleanup worker removes orphaned media.
- **Messages**: Soft deletion support (`deletedAt`) without breaking read receipts or thread integrity.
