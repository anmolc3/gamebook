# 🏛️ Architecture Decision Records (ADR)

## ADR-001: Server-Authoritative Game Engine
- **Context**: Multiplayer games on mobile are vulnerable to memory manipulation, modified clients, and fake action submissions.
- **Decision**: All move evaluations, dice generations, turns, and outcomes must be calculated server-side.
- **Consequences**:
  - *Advantages*: Complete anti-cheat security, unified game history recording, fair leaderboards.
  - *Disadvantages*: Requires network roundtrips for move confirmation (mitigated by responsive local animations and low-latency WebSockets).

## ADR-002: Modular Monorepo Architecture
- **Context**: Need clear boundary enforcement between client, server, and shared contracts while operating within a single repository.
- **Decision**: Partition into `mobile/`, `server/`, and `shared/` packages with isolated `package.json` configurations.
- **Consequences**:
  - Clean client/server separation, reusable shared types without duplicate interfaces, frictionless local development.
