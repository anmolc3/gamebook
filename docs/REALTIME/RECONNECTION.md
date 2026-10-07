# 🔄 Reconnection & Disconnect Strategy

## Mobile Disconnect Challenges
Mobile wireless connections suffer from cellular handovers, tunnel dropouts, and app backgrounding.

## Resilient Reconnection Protocol
1. **Grace Period**: When a player drops socket connection during a match, the server pauses game action timer and starts a **30-second Grace Window**.
2. **Notification**: Room peers receive a non-blocking toast: "Alex disconnected. Waiting 30s...".
3. **Re-establishment**:
   - Client detects reconnect, re-authenticates socket handshake.
   - Emits `game:reconnect` with cached `roomCode` and last known `sequenceNumber`.
4. **State Reconciliation**: Server re-binds socket to room, emits complete current snapshot, and resumes turn timer.
5. **Abandoned Match Handling**: If 30 seconds elapse without reconnect, the disconnected player forfeits, and the active player is awarded the win.
