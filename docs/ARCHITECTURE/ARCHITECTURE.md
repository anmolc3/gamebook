# 🏛️ System Architecture

## Architecture Overview

```
┌────────────────────────────────────────────────────────┐
│                   React Native Client                  │
│  (Expo SDK, TypeScript, Theme Engine, Sound, Storage)  │
└──────────────────────────┬─────────────────────────────┘
                           │
             HTTPS REST    │    WebSocket (Socket.IO)
                           │
┌──────────────────────────▼─────────────────────────────┐
│                 Node.js / Express Server               │
│  ├── REST API Controllers (Auth, Users, Friends)       │
│  ├── Socket.IO Gateway (Presence, Chat, Rooms)         │
│  ├── Server-Authoritative Game State Machines          │
│  └── Middleware (JWT, Rate Limiting, Input Validation) │
└──────────────────────────┬─────────────────────────────┘
                           │
             Prisma ORM    │    Object Storage (Local/S3)
                           │
┌──────────────────────────▼─────────────────────────────┐
│                   PostgreSQL Database                  │
│   (Users, Friendships, Messages, Rooms, Stats, Stories)│
└────────────────────────────────────────────────────────┘
```

## Architectural Principles
1. **Free-First Infrastructure**: Clean monolith designed to run on single low-cost VPS/Node environment initially; stateless REST + stateful socket rooms.
2. **Server Authority**: Game outcomes, dice generation, and state transitions are strictly executed server-side.
3. **Domain Segregation**: Mobile UI, Backend API, and Shared Types are separated to ensure clear boundary enforcement.
4. **Decoupled Media Layer**: Storage adapter pattern enables switching from local filesystem mock to AWS S3/Cloudflare R2 without code alteration.
