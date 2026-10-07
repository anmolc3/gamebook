# 🎮 Game Real-Time Architecture

## Socket Flow
```
Client Action (e.g. Move Token)
        ↓
Emits `game:action` { actionType, payload }
        ↓
Server Authoritative Validation
        ↓ (If Valid)
State Engine updates internal game model
        ↓
Broadcasts `game:state` to `room:${roomCode}`
        ↓
Clients update board view with smooth animations
```

## Anti-Desync Safeguards
- State updates carry a monotonically increasing `sequenceNumber`.
- If client detects a missed sequence number, it requests a full authoritative state snapshot via `game:sync`.
