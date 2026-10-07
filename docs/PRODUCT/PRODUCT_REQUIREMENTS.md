# 📋 Product Requirements Document (PRD)

## 1. Functional Requirements

### 1.1 Authentication & Profile *(Phases 03 & 04 - COMPLETED)*
- **FR-1.1**: Secure user registration and login with bcrypt hashing, JWT issuance, and automatic profile creation.
- **FR-1.2**: User profiles with display name, bio, 6 curated SVG avatars, and lifetime match statistics.
- **FR-1.3**: Session persistence via client token storage and handshake authentication on Socket.IO connections.

### 1.2 Friend System & Social Graph *(Phase 05 - COMPLETED)*
- **FR-2.1**: Real-time user discovery with prefix and exact username searching.
- **FR-2.2**: Full friend request lifecycle: send, accept, decline, and cancel.
- **FR-2.3**: Bilateral relationship resolution (`NONE`, `REQUEST_SENT`, `REQUEST_RECEIVED`, `FRIENDS`, `BLOCKED`).
- **FR-2.4**: Real-time Socket.IO presence engine (`ONLINE`, `OFFLINE`, `AWAY`, `IN_GAME`).

### 1.3 Direct Messaging & In-Chat Invitations *(Phase 06 - COMPLETED)*
- **FR-3.1**: Real-time 1-on-1 private messaging with Socket.IO room subscriptions.
- **FR-3.2**: Three-stage delivery tracking: `SENT`, `DELIVERED`, and `READ` with dual SVG ticks.
- **FR-3.3**: Live typing indicators (`chat:user_typing`) with auto-dismiss timeouts.
- **FR-3.4**: Embedded interactive game invitation cards with short room codes and one-tap join triggers.

### 1.4 Multiplayer Rooms & Lobbies *(Phase 07 - IN PROGRESS)*
- **FR-4.1**: **Game-Agnostic Rooms**: Dynamic capacity and configuration driven by the central `GameRegistry`.
- **FR-4.2**: 6-character collision-resistant room codes (`ABCDEFGHJKLMNPQRSTUVWXYZ23456789`).
- **FR-4.3**: Host privilege management, player ready state toggles, and countdown initiation.
- **FR-4.4**: 30-second disconnect grace window with state recovery upon reconnection.
- **FR-4.5**: Public matchmaking queue and private passcode-protected lobbies.

### 1.5 Modular Game Ecosystem *(Phases 08–15 - PLANNED)*
- **FR-5.1**: **Modular Game Engine Architecture**: All games implement the standardized `GameEngine<TState, TAction, TResult>` contract.
- **FR-5.2**: **Server-Authoritative Authority**: Server validates all moves, generates CSPRNG dice/card shuffles, tracks timers, and calculates winners.
- **FR-5.3**: **Supported Game Categories**:
  - *Category A (Board Games)*: Tic-Tac-Toe, Ludo, Chess, Checkers, Connect Four, Gomoku, Reversi, etc.
  - *Category B (Card Games)*: UNO-style, Hearts, Spades, Rummy, Crazy Eights, War, Durak, President, plus strictly play-money Blackjack & Poker.
  - *Category C (Casual & Arcade)*: 8 Ball Pool, Mini Golf, Air Hockey, Darts, Bowling, Table Tennis, etc.
  - *Category D & E (Fast & Strategy/Puzzle)*: Reaction Test, Rock Paper Scissors, Speed Tap, Sudoku, Wordle Duel, Minesweeper Duel, etc.
  - *Category F (Party & Social)*: Would You Rather, Truth or Dare, Charades, Mafia, Imposter, Draw & Guess, etc.
- **FR-5.4**: **Zero Gambling Rule**: Absolute prohibition of real-money gambling, deposits, withdrawals, or cash wagering. All card and table games use virtual play tokens only.

### 1.6 Platform Polish & Social Features *(Phase 16 - PLANNED)*
- **FR-6.1**: Unified game discovery browser with categories, search, recently played, and favorites.
- **FR-6.2**: Competitive leaderboards (Global, Weekly, Friends) and tiered achievements.
- **FR-6.3**: Authoritative match history with instant rematch triggers.
- **FR-6.4**: 24-hour ephemeral stories with game win highlights and viewer tracking.

---

## 2. Non-Functional Requirements
- **NFR-1: Performance**: Sustained 60 FPS UI rendering and animations on mid-range Android devices.
- **NFR-2: Real-Time Latency**: Sub-50ms WebSocket event delivery for domestic connections; sub-150ms globally.
- **NFR-3: Strict Server Authority**: 100% of game state transitions and results validated on the backend.
- **NFR-4: Design Consistency**: Strict adherence to the 5 dual-mode themes, zero emoji in UI icons, and SVG-first asset delivery.
- **NFR-5: Resilient State**: Seamless recovery for clients reconnecting within the 30-second disconnect buffer.
