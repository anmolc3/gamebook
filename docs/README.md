# 📚 Project Documentation Hub

Welcome to the centralized documentation system for the **Social Multiplayer Gaming Platform**. This documentation serves as the authoritative architectural blueprint and single source of truth.

---

## 🗂️ Documentation Sitemap

### 1. Product & Vision
- [Product Overview](file:///c:/Users/anmol/OneDrive/Desktop/game%20app/docs/PRODUCT/PRODUCT_OVERVIEW.md): Vision, user persona, and core social-gaming loop.
- [Product Requirements](file:///c:/Users/anmol/OneDrive/Desktop/game%20app/docs/PRODUCT/PRODUCT_REQUIREMENTS.md): Functional and non-functional requirements (PRD).
- [Feature Matrix](file:///c:/Users/anmol/OneDrive/Desktop/game%20app/docs/PRODUCT/FEATURE_LIST.md): Complete 18-phase feature matrix and game ecosystem.
- [User Flows](file:///c:/Users/anmol/OneDrive/Desktop/game%20app/docs/PRODUCT/USER_FLOWS.md): Step-by-step social-to-game journeys.

### 2. Design & Aesthetics (Sketch UI Reference Adaptation)
- [Design System](file:///c:/Users/anmol/OneDrive/Desktop/game%20app/docs/DESIGN/DESIGN_SYSTEM.md): Core tokens, spacing grid, radii, and elevations.
- [Color System](file:///c:/Users/anmol/OneDrive/Desktop/game%20app/docs/DESIGN/COLOR_SYSTEM.md): Semantic roles, presence states, and text contrast.
- [The Five Themes](file:///c:/Users/anmol/OneDrive/Desktop/game%20app/docs/DESIGN/THEMES.md): Hex maps for Coral, Moon, Violet Dusk, Midnight, and Forest.
- [Light & Dark Mode](file:///c:/Users/anmol/OneDrive/Desktop/game%20app/docs/DESIGN/LIGHT_DARK_MODE.md): Deliberate dual-mode execution strategy.
- [Typography](file:///c:/Users/anmol/OneDrive/Desktop/game%20app/docs/DESIGN/TYPOGRAPHY.md): Type scales, weights, and line heights.
- [Icon System](file:///c:/Users/anmol/OneDrive/Desktop/game%20app/docs/DESIGN/ICON_SYSTEM.md): Strict Zero-Emoji policy and SVG icon manifest.
- [Component Catalog](file:///c:/Users/anmol/OneDrive/Desktop/game%20app/docs/DESIGN/COMPONENTS.md): Reusable atoms, molecules, and organisms.
- [UI/UX Guidelines](file:///c:/Users/anmol/OneDrive/Desktop/game%20app/docs/DESIGN/UI_UX_GUIDELINES.md): Mobile ergonomics and gameplay usability.

### 3. System Architecture
- [System Architecture](file:///c:/Users/anmol/OneDrive/Desktop/game%20app/docs/ARCHITECTURE/ARCHITECTURE.md): Multi-tier topology.
- [Project Structure](file:///c:/Users/anmol/OneDrive/Desktop/game%20app/docs/ARCHITECTURE/PROJECT_STRUCTURE.md): Monorepo directory map.
- [Frontend Architecture](file:///c:/Users/anmol/OneDrive/Desktop/game%20app/docs/ARCHITECTURE/FRONTEND_ARCHITECTURE.md): React Native + Expo design.
- [Backend Architecture](file:///c:/Users/anmol/OneDrive/Desktop/game%20app/docs/ARCHITECTURE/BACKEND_ARCHITECTURE.md): Express + Prisma service layer.
- [Database Architecture](file:///c:/Users/anmol/OneDrive/Desktop/game%20app/docs/ARCHITECTURE/DATABASE_ARCHITECTURE.md): PostgreSQL schema & indexing.
- [Real-Time Architecture](file:///c:/Users/anmol/OneDrive/Desktop/game%20app/docs/ARCHITECTURE/REALTIME_ARCHITECTURE.md): Socket.IO room mechanics & disconnect grace window.
- [Game Engine Architecture](file:///c:/Users/anmol/OneDrive/Desktop/game%20app/docs/ARCHITECTURE/GAME_ARCHITECTURE.md): Server-authoritative modular game architecture.
- [Security Architecture](file:///c:/Users/anmol/OneDrive/Desktop/game%20app/docs/ARCHITECTURE/SECURITY_ARCHITECTURE.md): Boundary guards and encryption.
- [Scalability Roadmap](file:///c:/Users/anmol/OneDrive/Desktop/game%20app/docs/ARCHITECTURE/SCALABILITY.md): Free-first to high-scale migration.

### 4. Database & Schemas
- [Database Schema](file:///c:/Users/anmol/OneDrive/Desktop/game%20app/docs/DATABASE/DATABASE_SCHEMA.md): Complete Prisma models.
- [Database Relationships](file:///c:/Users/anmol/OneDrive/Desktop/game%20app/docs/DATABASE/DATABASE_RELATIONSHIPS.md): Foreign keys and integrity rules.
- [Database Migrations](file:///c:/Users/anmol/OneDrive/Desktop/game%20app/docs/DATABASE/DATABASE_MIGRATIONS.md): Version-controlled migration protocol.

### 5. API Documentation
- [API Index](file:///c:/Users/anmol/OneDrive/Desktop/game%20app/docs/API/API_DOCUMENTATION.md): REST conventions, headers, and errors.
- [Auth API](file:///c:/Users/anmol/OneDrive/Desktop/game%20app/docs/API/AUTH_API.md): Registration, login, and sessions.
- [Profile API](file:///c:/Users/anmol/OneDrive/Desktop/game%20app/docs/API/PROFILE_API.md): Profile view, update, and lifetime stats.
- [Friend API](file:///c:/Users/anmol/OneDrive/Desktop/game%20app/docs/API/FRIEND_API.md): Social graph requests and blocks.
- [Chat API](file:///c:/Users/anmol/OneDrive/Desktop/game%20app/docs/API/CHAT_API.md): Direct messaging and in-chat game invites.
- [Room API](file:///c:/Users/anmol/OneDrive/Desktop/game%20app/docs/API/ROOM_API.md): Game-agnostic room creation and management.
- [Game API](file:///c:/Users/anmol/OneDrive/Desktop/game%20app/docs/API/GAME_API.md): Room lifecycle, moves, and results.

### 6. Real-Time & WebSockets
- [Socket Events](file:///c:/Users/anmol/OneDrive/Desktop/game%20app/docs/REALTIME/SOCKET_EVENTS.md): Event catalog and payload types.
- [Presence System](file:///c:/Users/anmol/OneDrive/Desktop/game%20app/docs/REALTIME/PRESENCE.md): Real-time online/in-game states.
- [Chat Real-Time](file:///c:/Users/anmol/OneDrive/Desktop/game%20app/docs/REALTIME/CHAT_REALTIME.md): Sent, delivered, read tracking.
- [Game Real-Time](file:///c:/Users/anmol/OneDrive/Desktop/game%20app/docs/REALTIME/GAME_REALTIME.md): Live move synchronization & room subscriptions.
- [Reconnection Protocol](file:///c:/Users/anmol/OneDrive/Desktop/game%20app/docs/REALTIME/RECONNECTION.md): 30-second disconnect grace window.

### 7. Game Modules & Categories (84+ Games)
- [Game Engine Subsystem](file:///c:/Users/anmol/OneDrive/Desktop/game%20app/docs/GAMES/GAME_SYSTEM.md): Common engine interface and registry.
- [Core Board Games](file:///c:/Users/anmol/OneDrive/Desktop/game%20app/docs/GAMES/BOARD_GAMES.md): 14 Titles (Tic-Tac-Toe, Ludo, Chess, Checkers, Connect 4, etc.).
- [Tic-Tac-Toe Specification](file:///c:/Users/anmol/OneDrive/Desktop/game%20app/docs/GAMES/TIC_TAC_TOE.md): 3x3 turn-based engine rules.
- [Ludo Arena Specification](file:///c:/Users/anmol/OneDrive/Desktop/game%20app/docs/GAMES/LUDO.md): 2–4 player token & dice rules.
- [Card Game Suite](file:///c:/Users/anmol/OneDrive/Desktop/game%20app/docs/GAMES/CARD_GAMES.md): 12 Titles (UNO-style, Spades, Rummy, Play-Money Blackjack & Poker).
- [Casual & Arcade Games](file:///c:/Users/anmol/OneDrive/Desktop/game%20app/docs/GAMES/CASUAL_GAMES.md): 12 Titles (8 Ball Pool, Mini Golf, Air Hockey, etc.).
- [Word & Puzzle Games](file:///c:/Users/anmol/OneDrive/Desktop/game%20app/docs/GAMES/WORD_AND_PUZZLE_GAMES.md): 22 Titles (Competitive Speed, Math, Sudoku, Wordle).
- [Party & Social Games](file:///c:/Users/anmol/OneDrive/Desktop/game%20app/docs/GAMES/PARTY_GAMES.md): 14 Titles (Would You Rather, Charades, Mafia, Imposter, etc.).
- [Future Research Games](file:///c:/Users/anmol/OneDrive/Desktop/game%20app/docs/GAMES/FUTURE_GAMES.md): 13 Advanced Titles (Racing, Battle Arena, Sports).

### 8. Security & Trust
- [Security Requirements](file:///c:/Users/anmol/OneDrive/Desktop/game%20app/docs/SECURITY/SECURITY_REQUIREMENTS.md): Core compliance rules.
- [Authentication](file:///c:/Users/anmol/OneDrive/Desktop/game%20app/docs/SECURITY/AUTHENTICATION.md): Token signing & hashing.
- [Authorization](file:///c:/Users/anmol/OneDrive/Desktop/game%20app/docs/SECURITY/AUTHORIZATION.md): Resource ownership gates.
- [Anti-Cheat](file:///c:/Users/anmol/OneDrive/Desktop/game%20app/docs/SECURITY/ANTI_CHEAT.md): Server authority safeguards.
- [Privacy](file:///c:/Users/anmol/OneDrive/Desktop/game%20app/docs/SECURITY/PRIVACY.md): User data protection.
- [Moderation](file:///c:/Users/anmol/OneDrive/Desktop/game%20app/docs/SECURITY/MODERATION.md): Blocking and report pipelines.

### 9. Deployment & Infrastructure
- [Development Setup](file:///c:/Users/anmol/OneDrive/Desktop/game%20app/docs/DEPLOYMENT/DEVELOPMENT.md): Local environment guide.
- [Free-First Infrastructure](file:///c:/Users/anmol/OneDrive/Desktop/game%20app/docs/DEPLOYMENT/FREE_INFRASTRUCTURE.md): Low-cost hosting blueprint.
- [Production Architecture](file:///c:/Users/anmol/OneDrive/Desktop/game%20app/docs/DEPLOYMENT/PRODUCTION.md): Scaled container architecture.
- [Database Deployment](file:///c:/Users/anmol/OneDrive/Desktop/game%20app/docs/DEPLOYMENT/DATABASE_DEPLOYMENT.md): Production PostgreSQL & backups.
- [Backend Deployment](file:///c:/Users/anmol/OneDrive/Desktop/game%20app/docs/DEPLOYMENT/BACKEND_DEPLOYMENT.md): Express service deployment.
- [Mobile Build](file:///c:/Users/anmol/OneDrive/Desktop/game%20app/docs/DEPLOYMENT/MOBILE_BUILD.md): EAS build configuration.
- [Play Store Release](file:///c:/Users/anmol/OneDrive/Desktop/game%20app/docs/DEPLOYMENT/PLAY_STORE.md): Android store submission checklist.

### 10. Testing & Quality Assurance
- [Testing Strategy](file:///c:/Users/anmol/OneDrive/Desktop/game%20app/docs/TESTING/TESTING_STRATEGY.md): Testing pyramid.
- [Test Cases](file:///c:/Users/anmol/OneDrive/Desktop/game%20app/docs/TESTING/TEST_CASES.md): End-to-end scenarios.
- [Multiplayer Testing](file:///c:/Users/anmol/OneDrive/Desktop/game%20app/docs/TESTING/MULTIPLAYER_TESTING.md): Concurrency test guides.
- [Device Testing](file:///c:/Users/anmol/OneDrive/Desktop/game%20app/docs/TESTING/DEVICE_TESTING.md): Android screen resolutions.
- [Security Testing](file:///c:/Users/anmol/OneDrive/Desktop/game%20app/docs/TESTING/SECURITY_TESTING.md): Penetration audit checklist.

---

## 🗺️ 18-Phase Execution Roadmap

| Phase | Title | Status | Scope |
|---|---|---|---|
| **Phase 01** | [Foundation](file:///c:/Users/anmol/OneDrive/Desktop/game%20app/docs/PHASES/PHASE_01_FOUNDATION.md) | **COMPLETED** | Monorepo, DB Schema, Server, Mobile App |
| **Phase 02** | [Design System](file:///c:/Users/anmol/OneDrive/Desktop/game%20app/docs/PHASES/PHASE_02_DESIGN_SYSTEM.md) | **COMPLETED** | 5 Dual Themes, 34 SVGs, Tokens, Components |
| **Phase 03** | [Authentication](file:///c:/Users/anmol/OneDrive/Desktop/game%20app/docs/PHASES/PHASE_03_AUTHENTICATION.md) | **COMPLETED** | Register, Login, JWT, Socket Auth, Mobile Screens |
| **Phase 04** | [Profiles](file:///c:/Users/anmol/OneDrive/Desktop/game%20app/docs/PHASES/PHASE_04_PROFILES.md) | **COMPLETED** | Avatar Presets, Stats, Profile Editing, Screens |
| **Phase 05** | [Friends & Social Graph](file:///c:/Users/anmol/OneDrive/Desktop/game%20app/docs/PHASES/PHASE_05_FRIENDS.md) | **COMPLETED** | User Search, Friend Requests, Live Presence |
| **Phase 06** | [Chat & In-Chat Invites](file:///c:/Users/anmol/OneDrive/Desktop/game%20app/docs/PHASES/PHASE_06_CHAT.md) | **COMPLETED** | 1-on-1 Real-time Messaging, In-Chat Game Invites |
| **Phase 07** | [Game Rooms & Lobbies](file:///c:/Users/anmol/OneDrive/Desktop/game%20app/docs/PHASES/PHASE_07_GAME_ROOMS.md) | **IN PROGRESS** | Game-Agnostic Rooms, Codes, Sockets, 30s Grace Window |
| **Phase 08** | [Tic-Tac-Toe](file:///c:/Users/anmol/OneDrive/Desktop/game%20app/docs/PHASES/PHASE_08_TIC_TAC_TOE.md) | **PLANNED** | Server-Authoritative 3x3 Engine, Rematch, History |
| **Phase 09** | [Ludo](file:///c:/Users/anmol/OneDrive/Desktop/game%20app/docs/PHASES/PHASE_09_LUDO.md) | **PLANNED** | Server Dice, Safe Cells, Captures, 4-Player Arena |
| **Phase 10** | [Board Games Expansion I](file:///c:/Users/anmol/OneDrive/Desktop/game%20app/docs/PHASES/PHASE_10_BOARD_GAMES_I.md) | **PLANNED** | Chess, Checkers, Connect 4, Gomoku, Reversi |
| **Phase 11** | [Board Games Expansion II](file:///c:/Users/anmol/OneDrive/Desktop/game%20app/docs/PHASES/PHASE_11_BOARD_GAMES_II.md) | **PLANNED** | Carrom, Snakes & Ladders, Battleship, Dominoes, etc. |
| **Phase 12** | [Casual & Arcade Games](file:///c:/Users/anmol/OneDrive/Desktop/game%20app/docs/PHASES/PHASE_12_CASUAL_GAMES.md) | **PLANNED** | 8 Ball Pool, Mini Golf, Air Hockey, Darts, Bowling |
| **Phase 13** | [Card Game Engine & Suite](file:///c:/Users/anmol/OneDrive/Desktop/game%20app/docs/PHASES/PHASE_13_CARD_GAMES.md) | **PLANNED** | Card Engine + 10 Games + Play-Money Blackjack & Poker |
| **Phase 14** | [Word, Quiz & Puzzle Games](file:///c:/Users/anmol/OneDrive/Desktop/game%20app/docs/PHASES/PHASE_14_WORD_PUZZLE_GAMES.md) | **PLANNED** | 22 Competitive Speed, Trivia, & Puzzle Titles |
| **Phase 15** | [Party & Social Games](file:///c:/Users/anmol/OneDrive/Desktop/game%20app/docs/PHASES/PHASE_15_PARTY_GAMES.md) | **PLANNED** | 14 Social Titles (Would You Rather, Mafia, Imposter) |
| **Phase 16** | [Game Platform Polish](file:///c:/Users/anmol/OneDrive/Desktop/game%20app/docs/PHASES/PHASE_16_PLATFORM_POLISH.md) | **PLANNED** | Discovery, Search, Leaderboards, Achievements, Stories |
| **Phase 17** | [Security & Anti-Cheat Audit](file:///c:/Users/anmol/OneDrive/Desktop/game%20app/docs/PHASES/PHASE_17_SECURITY_AUDIT.md) | **PLANNED** | Full Exploit Audit, Move Verification, CSPRNG |
| **Phase 18** | [Performance & Scalability Audit](file:///c:/Users/anmol/OneDrive/Desktop/game%20app/docs/PHASES/PHASE_18_PERFORMANCE_AUDIT.md) | **PLANNED** | Concurrency, Memory Leak Profiling, Redis Scaling |

---

### Project Status & History
- [Current Project Status](file:///c:/Users/anmol/OneDrive/Desktop/game%20app/docs/CURRENT_STATUS.md)
- [Project Changelog](file:///c:/Users/anmol/OneDrive/Desktop/game%20app/docs/CHANGELOG.md)
