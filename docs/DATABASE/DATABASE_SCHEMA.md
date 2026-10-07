# 🗃️ Database Schema Specifications (Prisma)

## Core Models

### `User`
- `id`: UUID (Primary Key)
- `email`: String (Unique)
- `username`: String (Unique)
- `passwordHash`: String
- `createdAt`: DateTime
- `updatedAt`: DateTime

### `Profile`
- `id`: UUID (Primary Key)
- `userId`: UUID (Unique Foreign Key -> User)
- `displayName`: String
- `bio`: String (Nullable)
- `avatarUrl`: String (Nullable)
- `themePreference`: String (Default: "coralMarble")
- `appearanceMode`: String (Default: "system")
- `lastSeen`: DateTime
- `isOnline`: Boolean (Default: false)

### `Friendship` & `FriendRequest`
- `FriendRequest`: `id`, `senderId`, `receiverId`, `status` (PENDING, ACCEPTED, REJECTED, CANCELLED), `createdAt`
- `Friendship`: `id`, `userId`, `friendId`, `createdAt`
- `BlockedUser`: `id`, `blockerId`, `blockedId`, `createdAt`

### `Conversation`, `ConversationMember`, `Message`
- `Conversation`: `id`, `type` (DIRECT, GROUP), `createdAt`, `updatedAt`
- `ConversationMember`: `id`, `conversationId`, `userId`, `lastReadMessageId`
- `Message`: `id`, `conversationId`, `senderId`, `content`, `type` (TEXT, GAME_INVITE, GAME_RESULT), `status` (SENT, DELIVERED, READ), `metadata` (JSON), `createdAt`

### `Story`, `StoryView`, `StoryReply`
- `Story`: `id`, `userId`, `mediaUrl`, `mediaType` (IMAGE, VIDEO, TEXT), `caption`, `expiresAt`, `privacy` (FRIENDS, SELECTED, PRIVATE), `createdAt`
- `StoryView`: `id`, `storyId`, `viewerId`, `viewedAt`
- `StoryReply`: `id`, `storyId`, `userId`, `content`, `createdAt`

### `GameRoom`, `GamePlayer`, `GameResult`
- `GameRoom`: `id`, `code` (Unique 6-char), `hostId`, `gameType`, `status` (WAITING, PLAYING, FINISHED), `isPrivate`, `maxPlayers`, `createdAt`
- `GamePlayer`: `id`, `roomId`, `userId`, `slotIndex`, `isReady`, `score`
- `GameResult`: `id`, `gameType`, `roomId`, `winnerId`, `durationSeconds`, `players` (JSON), `finalState` (JSON), `createdAt`
- `GameStatistics`: `id`, `userId`, `gameType`, `matchesPlayed`, `matchesWon`, `matchesLost`, `currentStreak`, `highestStreak`

### `Achievement`, `UserAchievement`, `Notification`
- `Achievement`: `id`, `key` (Unique), `title`, `description`, `iconName`, `category`
- `UserAchievement`: `id`, `userId`, `achievementId`, `unlockedAt`
- `Notification`: `id`, `userId`, `type`, `title`, `body`, `data` (JSON), `isRead`, `createdAt`
