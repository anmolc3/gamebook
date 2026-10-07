# 🟢 Real-Time Presence System

## State Machine
User presence transitions between:
1. `ONLINE`: User has an active, authenticated Socket.IO connection.
2. `IN_GAME`: User is currently engaged in an active multiplayer room match.
3. `AWAY`: Socket connected, but client has been backgrounded for > 3 minutes.
4. `OFFLINE`: Socket disconnected and grace timeout elapsed.

## Presence Privacy
Users can configure presence visibility in their profile settings:
- `Everyone`: Presence visible to all.
- `Friends Only`: Presence broadcast only to confirmed mutual friends.
- `Invisible`: User appears offline to all peers.
