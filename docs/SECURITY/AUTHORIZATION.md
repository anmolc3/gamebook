# 👮 Authorization & Resource Access Control

## Ownership Rules
- Users may only edit or delete their own profiles, stories, or messages.
- Conversation access requires confirmed membership in `ConversationMember`.
- Game actions are accepted only if `socket.userId === currentTurnPlayerId`.

## Middleware Pipeline
```typescript
// Example Authorization Guard
export const requireConversationMember = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const { id: conversationId } = req.params;
  const isMember = await prisma.conversationMember.findUnique({
    where: { conversationId_userId: { conversationId, userId: req.user.id } }
  });
  if (!isMember) return res.status(403).json({ success: false, error: "Access denied" });
  next();
};
```
