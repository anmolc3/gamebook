# 🎮 Social Multiplayer Gaming Platform

> A production-grade cross-platform mobile application combining **Social Networking** (profiles, stories, direct chat, friend networks, real-time presence) and **Multiplayer Gaming** (server-authoritative Ludo, Tic-Tac-Toe, private game rooms) with an original, premium iOS-inspired design system.

---

## 📑 Table of Contents
1. [Product Vision](#-product-vision)
2. [Technology Stack](#-technology-stack)
3. [Architecture Overview](#-architecture-overview)
4. [Project Structure](#-project-structure)
5. [Design System & Themes](#-design-system--themes)
6. [Getting Started & Local Setup](#-getting-started--local-setup)
7. [Environment Variables](#-environment-variables)
8. [Multiplayer & Anti-Cheat](#-multiplayer--anti-cheat)
9. [Development Phases & Roadmap](#-development-phases--roadmap)
10. [Documentation Index](#-documentation-index)
11. [Current Status](#-current-status)

---

## 🌟 Product Vision

The platform interconnects social presence and synchronous multiplayer gaming into one seamless engagement loop:

```
FRIENDS → CHAT → GAME INVITATION → MULTIPLAYER ROOM → REAL-TIME MATCH → RESULT → STATISTICS → 24H STORY → FRIENDS
```

### Core Features
- **Social Graph**: Username search, friend requests (send/accept/reject/cancel), mutual friendships, online presence (`online`, `inGame`, `away`, `offline`), and user blocking/reporting.
- **Direct Real-Time Chat**: 1-on-1 conversations with delivery status tracking (`SENT`, `DELIVERED`, `READ` using SVG checks), typing indicators, and interactive game cards.
- **24-Hour Ephemeral Stories**: Media-first stories with 24h server-enforced expiration, viewer analytics, and direct chat replies.
- **Multiplayer Arena**: Reusable room lobby system with 6-character room codes, host controls, ready toggling, and 30-second disconnect grace periods.
- **Server-Authoritative Games**: Initial titles include **Tic-Tac-Toe** (Phase 8) and **Ludo** (Phase 9), with Chess and Card Games planned (Phase 13).
- **Meta & Progression**: Match histories, global & friend leaderboards, win streaks, and achievement badges.

---

## 🛠️ Technology Stack

| Layer | Technology | Rationale |
| :--- | :--- | :--- |
| **Mobile App** | React Native, Expo, TypeScript | Native 60 FPS performance on Android & iOS, rapid testing. |
| **Backend** | Node.js, Express, TypeScript | Unified TypeScript contracts, robust REST routing, lightweight footprint. |
| **Real-Time** | Socket.IO | Proven bi-directional WebSockets, room multiplexing, reconnection handling. |
| **Database** | PostgreSQL 16+ & Prisma ORM | ACID transactions for game statistics, type-safe queries, migration control. |
| **Design System** | Custom Token Engine, React Native SVG | 100% token-based, zero hardcoded values, strict zero-emoji policy for UI. |
| **Infrastructure**| Free-First Monolith Architecture | Starts on low-cost/free tier; designed for clean scaling to Redis & AWS/R2. |

---

## 🏛️ Architecture Overview

```
┌────────────────────────────────────────────────────────┐
│                   React Native Client                  │
│       (Expo SDK, TypeScript, Theme Engine, SVG)        │
└──────────────────────────┬─────────────────────────────┘
                           │
             HTTPS REST    │    WebSocket (Socket.IO)
                           │
┌──────────────────────────▼─────────────────────────────┐
│                 Node.js / Express Server               │
│  ├── REST API Controllers (Auth, Friends, Chat)        │
│  ├── Socket.IO Gateway (Presence, Chat, Lobbies)       │
│  ├── Server-Authoritative Game State Engines           │
│  └── Middleware (JWT, Rate Limiting, Validation)       │
└──────────────────────────┬─────────────────────────────┘
                           │
             Prisma ORM    │    Object Storage Layer
                           │
┌──────────────────────────▼─────────────────────────────┐
│                   PostgreSQL Database                  │
│   (Users, Profiles, Friendships, Messages, Rooms)      │
└────────────────────────────────────────────────────────┘
```

---

## 📂 Project Structure

```
game-app/
├── mobile/                      # Cross-Platform React Native App (Expo)
│   ├── app/                     # Screen router & entry
│   ├── components/              # Atomic UI components (atoms, molecules, organisms)
│   ├── screens/                 # Full feature views
│   ├── navigation/              # Navigation containers and tab bars
│   ├── features/                # Domain hooks & context (auth, chat, friends)
│   ├── games/                   # Client-side board renderers & animators
│   ├── theme/                   # 5-theme token engine & ThemeContext
│   ├── icons/                   # Centralized SVG icon registry (Zero Emojis)
│   └── assets/                  # Brand graphics & splash assets
│
├── server/                      # Node.js + Express + Socket.IO Backend
│   ├── src/
│   │   ├── config/              # Environment config & constants
│   │   ├── middleware/          # JWT auth, validation, rate limiting
│   │   ├── auth/                # Register, login, session validation
│   │   ├── friends/             # Friend requests & social graph
│   │   ├── chat/                # Direct messaging & receipts
│   │   ├── rooms/               # Game lobby & slot coordinator
│   │   ├── games/               # Server-authoritative game state machines
│   │   ├── sockets/             # Socket.IO event router
│   │   └── index.ts             # Server entry point
│   ├── prisma/
│   │   ├── schema.prisma        # PostgreSQL models & indexes
│   │   └── migrations/          # Version-controlled DB migrations
│   ├── package.json
│   └── tsconfig.json
│
├── shared/                      # Shared Types, Constants & Socket Events
│   ├── types/                   # Common domain entities
│   ├── game-types/              # Shared game actions and board models
│   └── socket-events/           # Strongly typed Socket.IO event dictionary
│
├── docs/                        # Complete project documentation system
├── README.md                    # Root project guide
└── .env.example                 # Root environment template
```

---

## 🎨 Design System & Themes

The visual presentation adapts the spacious, soft-layered aesthetics of the Sketch Marvie UI reference while projecting our own distinct social gaming identity.

### Strict Non-Negotiable Rules
- **ZERO Emojis as UI Icons**: All interface controls, buttons, and navigation items use vector SVG icons.
- **No Hardcoded Hex Values**: All components consume semantic tokens via `useTheme()`.
- **Deliberate Dual-Mode**: True Light and Dark variants designed individually (no blind color inversion).

### 5 Theme Families
1. **Marble / Coral**: Warm, inviting, radiant (`#CA2851`, `#FF6766`, `#FFB173`, `#FFE3B3`).
2. **Moon / Violet**: Nocturnal, mystical, regal (`#F5D5E0`, `#6667AB`, `#7B337E`, `#420D4B`, `#210635`).
3. **Violet Dusk**: Cozy twilight, intimate, poetic (`#502D55`, `#935073`, `#F6DBC0`, `#F8F4E9`).
4. **Midnight / Neutral**: Slate precision, minimalist, sleek (`#3D4D55`, `#A79E9C`, `#D3C3B9`, `#B58863`, `#161616`).
5. **Forest / Gold**: Lush botanical canopy, royal gold (`#6D9773`, `#0C3B2E`, `#B88A52`, `#FFBA00`).

---

## 🚀 Getting Started & Local Setup

### Prerequisites
- Node.js (v20+ or v24.x)
- npm (v10+ or v11.x)
- PostgreSQL 16+ running on `localhost:5432`

### 1. Database Setup
```powershell
# Create development database in PostgreSQL:
createdb -U postgres gameapp_dev
```

### 2. Backend Setup
```powershell
cd server
npm.cmd install
npx.cmd prisma db push
npm.cmd run dev
# Server listens on http://localhost:5000 (Healthcheck: http://localhost:5000/health)
```

### 3. Mobile Setup
```powershell
cd mobile
npm.cmd install
npm.cmd start
# Press 'a' for Android emulator, 'w' for web preview, or scan QR with Expo Go.
```

---

## ⚙️ Environment Variables

Copy `.env.example` to `server/.env`:
```env
PORT=5000
NODE_ENV=development
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/gameapp_dev?schema=public"
JWT_SECRET="super-secret-development-key-change-in-production-32chars"
JWT_EXPIRES_IN="7d"
CORS_ORIGIN="*"
```

---

## 🛡️ Multiplayer & Anti-Cheat

The mobile client is strictly a presentation terminal. The server authoritatively:
- Validates turns, moves, and action legality.
- Generates dice rolls using cryptographically secure random number generators.
- Manages 15s/20s turn timers.
- Manages 30-second disconnect grace windows before awarding forfeits.
- Computes game outcomes and updates stats in PostgreSQL.

---

## 🗺️ Development Phases & Roadmap

| Phase | Title | Focus | Status |
| :--- | :--- | :--- | :--- |
| **Phase 1** | Foundation | Monorepo layout, Express, Socket.IO, PostgreSQL + Prisma, Expo scaffold | **IN PROGRESS** |
| **Phase 2** | Design System | 5 Themes (Light/Dark), Tokens, SVG Icons, Reusable UI Kit | PLANNED |
| **Phase 3** | Authentication | Registration, Login, JWT verification, Secure storage | PLANNED |
| **Phase 4** | Profiles | User profiles, avatars, stats showcase, edit modal | PLANNED |
| **Phase 5** | Friends | User search, friend requests, presence, blocking | PLANNED |
| **Phase 6** | Chat | 1-on-1 real-time messaging, status ticks, in-chat game cards | PLANNED |
| **Phase 7** | Game Rooms | Room creation (6-char code), player slots, ready toggling | PLANNED |
| **Phase 8** | Tic-Tac-Toe | Server-authoritative 2-player multiplayer title | PLANNED |
| **Phase 9** | Ludo Arena | 2-4 player full board game with server dice & safe zones | PLANNED |
| **Phase 10** | Stories | 24-hour expiring media stories, viewer list, replies | PLANNED |
| **Phase 11** | Notifications | In-app alerts, real-time push groundwork | PLANNED |
| **Phase 12** | Leaderboards | Global & friend leaderboards, stats aggregation, achievements | PLANNED |
| **Phase 13** | Additional Games | Chess and Card game extensions | PLANNED |
| **Phase 14** | Security Audit | Penetration tests, rate limiting, anti-cheat validation | PLANNED |
| **Phase 15** | Performance Audit | 60 FPS mobile audit, memory profiling, list virtualization | PLANNED |
| **Phase 16** | Production | EAS Android build (AAB), Docker deployment, Play Store | PLANNED |

---

## 📖 Documentation Index

Complete specifications are maintained inside the [docs/](file:///c:/Users/anmol/OneDrive/Desktop/game%20app/docs/README.md) directory:
- [System Architecture](file:///c:/Users/anmol/OneDrive/Desktop/game%20app/docs/ARCHITECTURE/ARCHITECTURE.md)
- [Design System & Tokens](file:///c:/Users/anmol/OneDrive/Desktop/game%20app/docs/DESIGN/DESIGN_SYSTEM.md)
- [Database Schema (Prisma)](file:///c:/Users/anmol/OneDrive/Desktop/game%20app/docs/DATABASE/DATABASE_SCHEMA.md)
- [Socket.IO Events](file:///c:/Users/anmol/OneDrive/Desktop/game%20app/docs/REALTIME/SOCKET_EVENTS.md)
- [Current Project Status](file:///c:/Users/anmol/OneDrive/Desktop/game%20app/docs/CURRENT_STATUS.md)

---

## 📊 Current Status

- **Phase Active**: [Phase 1: Foundation](file:///c:/Users/anmol/OneDrive/Desktop/game%20app/docs/PHASES/PHASE_01_FOUNDATION.md)
- **Status Tracker**: [docs/CURRENT_STATUS.md](file:///c:/Users/anmol/OneDrive/Desktop/game%20app/docs/CURRENT_STATUS.md)
- **Latest Changes**: [docs/CHANGELOG.md](file:///c:/Users/anmol/OneDrive/Desktop/game%20app/docs/CHANGELOG.md)
