# 📂 Project Structure & Module Organization

The project employs a clean monorepo architecture:

```
game-app/
├── mobile/                      # Cross-Platform React Native + Expo App
│   ├── app/                     # Screen routes & entry configuration
│   ├── components/              # Atomic UI components (atoms, molecules, organisms)
│   ├── screens/                 # Full feature screens
│   ├── navigation/              # Navigation containers and tab bars
│   ├── features/                # Feature-specific state and hooks (auth, chat, friends)
│   ├── games/                   # Client-side game renderers & boards
│   │   ├── core/                # Game canvas shell & base components
│   │   ├── tictactoe/           # Tic-Tac-Toe client board & animations
│   │   └── ludo/                # Ludo board, dice roll & token animators
│   ├── services/                # API client, Socket.IO client, local storage
│   ├── hooks/                   # Custom React hooks
│   ├── store/                   # Client state management
│   ├── utils/                   # Client helper utilities
│   ├── theme/                   # 5-theme token engine & ThemeContext
│   ├── icons/                   # Centralized SVG icon registry (Zero Emojis)
│   └── assets/                  # Static assets & brand graphics
│
├── server/                      # Node.js + Express + Socket.IO Backend
│   ├── src/
│   │   ├── config/              # Environment config & constants
│   │   ├── middleware/          # JWT auth, validation, rate limiting, error handling
│   │   ├── auth/                # Register, login, password hashing
│   │   ├── users/               # User search, profile lookup
│   │   ├── profiles/            # Profile mutations & media avatars
│   │   ├── friends/             # Friend requests, blocks, relations
│   │   ├── chat/                # Direct messaging, receipts, conversations
│   │   ├── stories/             # 24h stories, expiration, viewer lists
│   │   ├── notifications/       # In-app notifications
│   │   ├── rooms/               # Multiplayer room management
│   │   ├── games/               # Server-authoritative game state engines
│   │   │   ├── core/            # Base game engine abstract class
│   │   │   ├── tictactoe/       # Tic-Tac-Toe state & win logic
│   │   │   └── ludo/            # Ludo board coordinates, dice, rules
│   │   ├── leaderboard/         # Leaderboard aggregations
│   │   ├── statistics/          # Player stats calculation
│   │   ├── storage/             # Object storage abstraction layer
│   │   ├── sockets/             # Socket.IO handlers & room subscriptions
│   │   └── utils/               # Logger, security helpers
│   ├── prisma/
│   │   ├── schema.prisma        # PostgreSQL models & indexes
│   │   └── migrations/          # Version-controlled DB migrations
│   ├── package.json
│   └── tsconfig.json
│
├── shared/                      # Shared Types, Constants & Socket Events
│   ├── types/                   # Common domain entities (User, Profile, Game)
│   ├── constants/               # System limits, timeouts, error codes
│   ├── game-types/              # Shared game actions, moves, and board states
│   └── socket-events/           # Strongly typed Socket.IO event dictionary
│
├── docs/                        # Complete project documentation system
├── README.md                    # Root project guide
└── .env.example                 # Root environment template
```
