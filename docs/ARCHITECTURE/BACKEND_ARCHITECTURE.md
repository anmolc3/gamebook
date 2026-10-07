# 🖥️ Backend Architecture

## Core Technologies
- **Runtime**: Node.js (v20+ / v24)
- **Framework**: Express.js
- **Language**: TypeScript
- **Database Access**: Prisma ORM with PostgreSQL
- **Real-Time Layer**: Socket.IO with JWT handshake authentication

## Layered Design
```
HTTP Request / Socket Event
         ↓
Security & Rate Limit Middleware
         ↓
Authentication Middleware (JWT verification)
         ↓
Controller / Socket Handler
         ↓
Service Layer (Business Logic & Game State Machines)
         ↓
Repository Layer (Prisma Client queries)
         ↓
PostgreSQL Database
```

## Modular Domain Isolation
Each major feature is isolated in `src/<domain>/`:
- `routes.ts`: Defines endpoints and attaches validation schema.
- `controller.ts`: Handles req/res parsing and status codes.
- `service.ts`: Implements pure business logic and DB transactions.
- `validation.ts`: Input sanitization using Zod or custom validators.
