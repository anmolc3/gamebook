# 🔄 Core User Flows

## Flow 1: Social-to-Game Engagement Loop
```
User launches App
  ↓
Views Online Friends Carousel & 24h Stories
  ↓
Taps friend avatar -> Opens Direct Chat
  ↓
Taps [+] Action -> Selects "Invite to Ludo"
  ↓
Server generates private GameRoom (Code: "X9K2L1")
  ↓
Embedded invitation card appears instantly in chat
  ↓
Friend taps "Join Game"
  ↓
Both players enter Game Lobby -> Toggle Ready
  ↓
Authoritative match starts
  ↓
Match concludes -> Victory modal displays stats
  ↓
One-tap "Share as Story" publishes victory snapshot
  ↓
Friends view story on Home feed & send replies
```

## Flow 2: Instant Code Room Entry
```
User taps "Join Room" from Home
  ↓
Enters 6-character code into themed input
  ↓
Socket connects & joins room channel
  ↓
Room lobby syncs active player list & host status
  ↓
Host presses "Start Game" when all players are ready
```

## Flow 3: Reconnection Handling
```
Player drops connection during active match
  ↓
Server pauses game clock; reserves player slot for 30s
  ↓
Remaining players see "Player disconnected - Waiting (25s)" banner
  ↓
Mobile client reconnects socket & sends `game:reconnect`
  ↓
Server verifies room token and emits complete current snapshot
  ↓
Game resumes seamlessly without lost moves
```
