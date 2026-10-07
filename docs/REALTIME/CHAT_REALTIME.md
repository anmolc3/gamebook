# 💬 Chat Real-Time Architecture

## Lifecycle of a Message
1. **Send (`chat:send`)**:
   - Client assigns a local temporary UUID, renders bubble optimistically with single grey tick.
   - Socket emits message payload to server.
2. **Persistence**:
   - Server validates sender membership in `conversationId`.
   - Message persisted to PostgreSQL via Prisma.
3. **Delivery (`chat:delivered`)**:
   - Server emits `chat:message` to recipient's personal room `user:${receiverId}`.
   - Client sends acknowledgment -> status updates to double grey tick.
4. **Read (`chat:read`)**:
   - When recipient views the active chat window, emits `chat:read`.
   - Status updates on sender screen to double colored tick.
