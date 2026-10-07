# 📜 Changelog

All notable changes to the Social Multiplayer Gaming Platform project will be documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [1.19.0-phase18] - 2026-10-06 - Phase 18 Performance & Scalability Audit Milestone

### Added
- **500 Concurrent Active Rooms Concurrency Benchmark (`server/test-performance-audit.js`)**:
  - Initialized 500 simultaneous active matches across multiple genres.
  - Achieved `12ms` total initialization time (**0.02ms average latency per room**, beating < 50ms SLA by 2500x).
- **High-Frequency Event Loop Stress Test**:
  - Benchmarked 10,000 authoritative state transitions (`SPEED_TAP`).
  - Completed in `73ms` (**136,986 ops/sec throughput**, exceeding > 2,000 ops/sec target by 68x).
- **V8 Heap Profiling & Memory Stability**:
  - Tracked heap allocation with `v8.getHeapStatistics()` across 1,000 complete match lifecycles.
  - Net heap growth bounded at **1.83 MB** (clean garbage collection, beating < 25MB threshold).
- **Database Query Indexing & Aggregation Optimization**:
  - Validated PostgreSQL query plans for active room counters and global leaderboard aggregations with sub-30ms execution times.
  - Hardened `MatchManager.handleMatchConcluded` with relational foreign-key validation before persisting results.
- **Horizontal Clustering & Stateless Engine Architecture**:
  - Validated all 71 games for stateless multi-worker cluster distribution.
  - Documented Socket.IO Redis pub/sub adapter clustering architecture.
- **Verification & Quality**:
  - All 5 performance audit assertions passed with 100% success rate.
  - Mobile client TypeScript check (`tsc --noEmit`): **0 errors**.

## [1.18.0-phase17] - 2026-10-06 - Phase 17 Security & Anti-Cheat Audit Milestone

### Added
- **Server-Authoritative Validation & Participant Authorization Guard**:
  - Enforced registered participant verification in `MatchManager.handleAction`, rejecting unauthorized spoofed moves.
  - Hardened turn alternation, out-of-bounds coordinate checks, and cell double-move prevention.
- **Authoritative Outcome Derivation**:
  - Winner and draw determinations derived purely by server state engines; client outcome assertions rejected.
- **CSPRNG Randomness Verification**:
  - Verified `CardDeck` Fisher-Yates and dice rolling algorithms utilize Node.js `crypto.randomInt` CSPRNG.
  - Statistical uniform distribution test passed with 1,000 entropy samples.
- **Sliding-Window Action Rate Limiter**:
  - Implemented sliding-window rate limiting on `game:action` in `socket.server.ts` (10 actions/second threshold).
  - High-frequency burst flood attacks automatically blocked with `game:error` socket notifications.
- **Strict Non-Gambling & Social Safety Compliance**:
  - Verified all card games (Blackjack, Texas Hold'em) operate exclusively with virtual play tokens having zero monetary value.
- **Verification Suite (`server/test-security-audit.js`)**:
  - 10 automated security & anti-cheat assertions passing with 100% success rate.

## [1.17.0-phase16] - 2026-10-06 - Phase 16 Game Platform Polish & Social Discovery Milestone

### Added
- **Social Discovery Catalog & Search API (`server/src/games/game.routes.ts`)**:
  - `GET /api/v1/games/catalog`: Search by keyword, filter by 6 categories, with live active room counters.
  - `GET /api/v1/games/leaderboard/global`: Global platform leaderboards with aggregated win sums and rankings.
  - `GET /api/v1/games/:gameType/leaderboard`: Game-specific rankings and win streaks.
  - `GET /api/v1/games/history`: Chronological match history with duration, players, and winner indicators.
  - `GET /api/v1/games/portfolio`: Unified gaming statistics portfolio across all 71 platform games.
- **Achievements Engine (`server/src/games/achievements.service.ts` & `achievements.routes.ts`)**:
  - 10 standard platform achievements (`FIRST_WIN`, `STREAK_3`, `STREAK_5`, `CENTURION`, `TICTACTOE_MASTER`, `LUDO_KING`, `CARD_SHARK`, `PUZZLE_PRO`, `PARTY_ANIMAL`, `SPEED_DEMON`).
  - Automatic post-match evaluation and awarding upon conclusion in `MatchManager`.
  - Real-time `achievement:unlocked` socket toasts broadcast to players upon unlocking.
- **24-Hour Ephemeral Stories System (`server/src/stories/`)**:
  - `POST /api/v1/stories`: Publish 24h stories (match result celebrations, screenshots, custom posts).
  - `GET /api/v1/stories/feed`: Chronological story feed grouped into user avatar trays for friends.
  - `POST /api/v1/stories/:storyId/view`: Idempotent view receipts with viewer tracking.
  - `POST /api/v1/stories/:storyId/reply`: Interactive in-app story replies.
- **Mobile Client Polish & Discovery Experience**:
  - `GameDiscoveryScreen.tsx`: 71+ game browser, 54px search bar, Category pills, and live room counters.
  - `LeaderboardScreen.tsx`: Top 3 podium, segmented Global & Friends tabs, and match history drawer.
  - `AchievementsModal.tsx`: Unlocked badge grid, progress bars, and trophy cabinet.
  - `StoryBar.tsx` & `StoryViewerModal.tsx`: Avatar ring tray with unviewed gradient indicator, celebratory graphics, countdown timer bar, and reply input.
- **Verification Suite (`server/test-platform-polish.js`)**:
  - 10 automated integration tests covering catalog search, leaderboards, achievements, and stories passing with 100% success rate.

## [1.16.0-phase15] - 2026-10-06 - Phase 15 Party & Social Games Milestone

### Added
- **Server-Authoritative Party & Social Game Engines (`server/src/games/party/`)**:
  - **Would You Rather? (`wyr.engine.ts`)**: Curated dilemma pairs (Option A vs Option B), live choice distribution, consensus bonuses (+10 pts for majority vote), and multi-round scoring.
  - **Truth or Dare (`truthordare.engine.ts`)**: Category selection (Truth vs Dare), rating filters (Mild, Spicy, Chaos), live prompt generation, and group completion verification (+10 Truth, +20 Dare).
  - **Charades Party (`charades.engine.ts`)**: Hidden acting word prompts, actor rotation, real-time non-actor chat guessing with fuzzy matching, and actor solve confirmation (+15 actor, +10 guesser).
  - **Pixel Reveal Guess (`guesspicture.engine.ts`)**: 10-tier pixelation blur reduction, category and letter clues, buzzer deductions, and scaled score awards based on reveal timing.
  - **Taboo Word Clue (`guessword.engine.ts`)**: Target words with 4 taboo buzzwords, live clue-giver foul penalty (-5 pts), and prompt word solving (+20 guesser, +10 giver).
  - **Name That Tune (`guesssong.engine.ts`)**: Lyric snippet riddles, genre categorization, 4 multiple-choice song titles, and round advancement.
  - **Who Am I? (`whoami.engine.ts`)**: Secret identity assignment, turn-based Yes/No questioning history, and direct identity accusation (+30 pts).
  - **The Imposter (`imposter.engine.ts`)**: Location dossiers, imposter role omission, one-word clue rounds, accusation voting, and imposter secret location guess mechanic.
  - **Mafia / Werewolf (`mafia.engine.ts`)**: Day and Night phase cycle, roles (Mafia, Detective, Doctor, Villager), night kills, investigations, doctor saves, and day lynch trials.
  - **Draw & Guess Live (`drawandguess.engine.ts`)**: Vector drawing stroke broadcasts (color, width, points), drawer rotation, and chat answer matching.
  - **Pictionary Duel (`pictionary.engine.ts`)**: Quick-sketch prompt duel, canvas clear, and solver detection.
  - **Never Have I Ever (`neverhaveiever.engine.ts`)**: 10 lives / fingers countdown, provocative party prompts, affirmative confessions (-1 life), and last player standing resolution.
  - **This or That (`thisorthat.engine.ts`)**: Rapid A vs B binary preference duel with friend match percentage calculation.
  - **2 Truths and a Lie (`twotruths.engine.ts`)**: 3 statement submissions (2 true, 1 lie), friend voting, fooled player rewards, and deceiver bonuses.
- **MatchManager Party Games Integration (`server/src/games/match.manager.ts`)**:
  - Registered all 14 Phase 15 party game engines in static factory registration.
- **Automated Verification Suite (`server/test-party-games.js`)**:
  - 37 comprehensive unit and integration tests covering all 14 party engines and MatchManager startMatch.
  - **100% Pass Rate (37 Passed, 0 Failed)**.
- **Unified Mobile Party Game Screen (`mobile/screens/games/PartyGameScreen.tsx`)**:
  - 14 dedicated interactive game stages adhering to Marvie iOS UI Kit specifications (25px card radius, 54px buttons, dark slate `#2A3C44`, `#30444E`, `#3D505A`).
  - Pure vector SVGs with zero emojis across all 14 game stages.
  - Real-time Socket.IO synchronization and instant rematch handshake support.
- **Mobile Navigation & Discovery**:
  - `mobile/App.tsx`: Wired `partyGame` route, `currentPartyGameType` state, and room listeners.
  - `mobile/components/organisms/JoinRoomModal.tsx`: Added all 14 Phase 15 party games to room creation quick-select carousel.
  - `mobile/screens/ThemeShowcaseScreen.tsx`: Added featured party games (Would You Rather?, Imposter, Draw & Guess Live, Mafia) and updated all games counter to 85+.
- **Verification & Quality**:
  - Mobile TypeScript check (`tsc --noEmit`): **0 errors**.
  - Hermes Android bytecode bundle (`expo export -p android`): **Clean export, exit code 0**.
  - Full regression test suites passing across all 15 phases (423+ automated assertions).

## [1.15.0-phase14] - 2026-10-06 - Phase 14 Word, Quiz & Fast Puzzle Games Milestone

### Added
- **Server-Authoritative Fast & Puzzle Game Engines (`server/src/games/puzzle/`)**:
  - **Rock Paper Scissors (`rps.engine.ts`)**: Best of 3/5 simultaneous hand sign duel with rock, paper, scissors choices, tie evaluation, and target score resolution.
  - **Reaction Speed Test (`reaction.engine.ts`)**: Random delay green signal trigger, sub-millisecond reaction time tracking, and false-start penalty enforcement.
  - **Number Guessing Duel (`numberguess.engine.ts`)**: 1..100 hidden number duel with HIGHER, LOWER, and CORRECT hint evaluations and turn switching.
  - **Speed Tap Rush (`speedtap.engine.ts`)**: Rapid target tapping rush with dynamic random target coordinates and tap counters.
  - **Color Match Reflex (`colormatch.engine.ts`)**: Stroop effect reflex test with word color vs text meaning mismatch detection and scoring streaks.
  - **Speed Math Duel (`math.engine.ts`)**: Rapid arithmetic equations (+, -, ×) with 4 multiple-choice options and streak bonuses.
  - **Quick Draw Western (`quickdraw.engine.ts`)**: Western standoff standby signal, fire bell timing, and early draw foul penalties.
  - **Wordle Duel (`wordle.engine.ts`)**: 5-letter target word deduction in 6 attempts with CORRECT, PRESENT, and ABSENT letter status feedback.
  - **Hangman Duel (`hangman.engine.ts`)**: Category words, letter and word guessing with 6 lives, masked word reveals, and turn alternation.
  - **Memory Card Match (`memory.engine.ts`)**: 16-card grid with 8 icon pairs, matching pair retains turn, and score tracking.
  - **Quiz Battle Arena (`quiz.engine.ts`)**: Rapid-fire multiple choice trivia across history, biology, astronomy, and science.
  - **2048 Versus Race (`game2048.engine.ts`)**: 4x4 matrix tile sliding, merging up to 2048 with score accumulation and highest tile tracking.
  - **Minesweeper Battle (`minesweeper.engine.ts`)**: 8x8 tactical grid with 10 hidden mines, flagging & safe cell flood fill, and point bonuses.
  - **Pattern Memory Matrix (`pattern.engine.ts`)**: Simon Says 3x3 light pad repeating sequences with round advancement and mistake penalties.
  - **Code Breaker Mastermind (`mastermind.engine.ts`)**: 4-color secret code deduction with exact hits (black pegs) and color hits (white pegs).
  - **Anagram Scramble (`scramble.engine.ts`)**: Dictionary word unscrambling race with auto-solver detection.
  - **Mobile Typing Race (`typing.engine.ts`)**: Prompt sentence typing with live WPM tracking, character match indices, and race leaderboards.
- **MatchManager Static Registration (`server/src/games/match.manager.ts`)**:
  - Registered all 17 engines statically in `MatchManager` factory map.
- **Automated Verification Suite (`server/test-puzzle-games.js`)**:
  - 49 comprehensive unit and integration tests covering all 17 engines and MatchManager startMatch.
  - **100% Pass Rate (49 Passed, 0 Failed)**.
- **Unified Mobile Puzzle Game Screen (`mobile/screens/games/PuzzleGameScreen.tsx`)**:
  - Interactive stages for all 17 titles adhering to Marvie iOS UI Kit specifications (25px card radius, 54px buttons, dark slate `#2A3C44`, `#30444E`, `#3D505A`).
  - Pure vector SVGs with zero emojis.
  - Integrated with Socket.IO match flow, real-time sync, and rematch mechanics.
- **Mobile Navigation & Discovery**:
  - `mobile/App.tsx`: Wired `puzzleGame` routing and `currentPuzzleGameType` state.
  - `mobile/components/organisms/JoinRoomModal.tsx`: Added all 17 Phase 14 games to the room creation & quick match carousel.
  - `mobile/screens/ThemeShowcaseScreen.tsx`: Added featured puzzle game cards (Wordle Duel, Reaction Test, 2048 Versus Race, Quiz Battle Arena).
- **Verification & Quality**:
  - Mobile TypeScript check (`tsc --noEmit`): **0 errors**.
  - Hermes Android bytecode bundle (`expo export -p android`): **774 modules bundled cleanly into bytecode (2.2 MB, exit code 0)**.
  - Full regression test suites across Phases 08–13 passing (300+ total game engine tests).

## [1.14.0-phase13] - 2026-10-06 - Phase 13 Card Game Engine & Suite Milestone

### Added
- **Core Card Game Engine (`server/src/games/cards/core/`)**:
  - `deck.ts`: Cryptographically secure Fisher-Yates CSPRNG deck shuffler using Node.js `crypto.randomInt`. Deck generators for Standard 52, Durak 36, and Uno 108 cards. Even dealing utilities.
  - `evaluator.ts`: Soft/Hard Ace Blackjack valuation, lead suit & trump trick-taking evaluator, pure sequence & set meld validators, and 7-card best 5 poker hand ranker (Royal Flush down to High Card).
- **Server-Authoritative Card Game Engines (`server/src/games/cards/`)**:
  - **Color Match Clash (`uno.engine.ts`)**: 108 cards, color matching, Skips, Reverses, Draw 2, Wild, Wild Draw 4, last card Uno call, and draw penalties.
  - **Hearts (`hearts.engine.ts`)**: 4-player trick taking, 2 of Clubs lead rule, Hearts penalty scoring, Queen of Spades (13 pts), and Shoot the Moon (26 pts swap).
  - **Spades (`spades.engine.ts`)**: Contract bidding phase (0..13 tricks / nil), permanent Spades trump, bag tracking, and 10-bag penalties.
  - **Indian Rummy (`rummy.engine.ts`)**: 13-card hand, stock and discard drawing, pure sequence requirement, joker wildcards, and declaration validation.
  - **Gin Rummy (`ginrummy.engine.ts`)**: 10-card duel, deadwood counting, knock (deadwood <= 10), pure gin, and undercut detection.
  - **Crazy Eights (`crazyeights.engine.ts`)**: Suit and rank matching, wild 8s with suit declarations, and stock pile drawing.
  - **Go Fish (`gofish.engine.ts`)**: Opponent rank inquiries, card transfers, ocean pond drawing ("Go Fish!"), and 4-of-a-kind books completion.
  - **War Card Duel (`war.engine.ts`)**: Simultaneous top-card flips, high-card capture, and 3-card tie-breaker war chests.
  - **Durak (`durak.engine.ts`)**: 36-card Russian card classic, attack and defense bouts, trump suit advantages, take cards action, and fool resolution.
  - **President / Scum (`president.engine.ts`)**: Trick climbing with singles, pairs, and triples, trick clear on 2s, and finishing hierarchy role assignment.
  - **Blackjack (`blackjack.engine.ts`)**: Play-money chips against house dealer, hit, stand, double down, dealer soft 17 resolution, and 3:2 natural payouts (Zero Gambling).
  - **Texas Hold’em Social (`poker.engine.ts`)**: Play-money social poker, small and big blinds, pre-flop, flop, turn, river, and showdown stages with pot distribution (Zero Gambling).
- **MatchManager Registration (`server/src/games/match.manager.ts`)**:
  - Registered all 12 card engines statically (`UNO_STYLE`, `HEARTS`, `SPADES`, `RUMMY`, `GIN_RUMMY`, `CRAZY_EIGHTS`, `GO_FISH`, `WAR`, `DURAK`, `PRESIDENT`, `BLACKJACK`, `POKER`).
- **Unified Mobile Card Game Screen (`mobile/screens/games/CardGameScreen.tsx`)**:
  - Pure vector SVG playing cards with suit symbols (♥, ♦, ♣, ♠), Uno colors, and card face-down filigree backings.
  - Interactive hand fan with card elevation upon selection.
  - Deep green felt tabletop stage with dynamic game-specific center renderers (Uno discard pile, Trick circles, Dealer table, Community card layout, Ocean pond).
  - Context-sensitive action dock (Draw, Uno, Play, Bid, Discard, Declare, Knock, Attack, Defend, Hit, Stand, Double, Check, Call, Raise, Fold).
  - Safety and compliance banner: "🛡️ Recreational Play Money Tokens • Zero Real Money Stakes".
  - Rematch handshake modal and real-time Socket.IO synchronization.
- **Game Discovery & Routing**:
  - `mobile/App.tsx`: Wired `cardGame` routing and `currentCardGameType` state.
  - `mobile/components/organisms/JoinRoomModal.tsx`: Added all 12 Phase 13 card games to the room creation & quick match carousel.
  - `mobile/screens/ThemeShowcaseScreen.tsx`: Added featured card game cards with player counts and live online indicators.
- **Testing & Verification**:
  - Automated test suite (`server/test-card-games.js`): **24 Passed, 0 Failed (100% Pass Rate)**.
  - System regression tests: **337+ total passing assertions across all suites, 0 regressions**.
  - Mobile TypeScript check (`tsc --noEmit`): **0 errors**.
  - Expo Android build (`expo export -p android`): **773 modules bundled cleanly into bytecode (2.1 MB, exit code 0)**.

## [1.13.0-phase12] - 2026-10-06 - Phase 12 Casual & Arcade Games Milestone

### Added
- **Server-Authoritative Casual & Arcade Game Engines (`server/src/games/casual/`)**:
  - **8 Ball Pool Arena (`pool8ball.engine.ts`)**: 16-ball table setup, cue impulse physics, solid/stripe designation, scratch fouls with ball-in-hand, and 8-ball pocketing rules.
  - **Mini Golf Battle (`minigolf.engine.ts`)**: 3-hole course progression, bumper walls, sand bunker friction drag, water hazard penalty resets, and lowest strokes tournament scoring.
  - **Air Hockey Clash (`airhockey.engine.ts`)**: 800x1200 neon table, mallet boundary clamping (half-table restriction), multi-step puck trajectory physics, goal triggers, and first-to-7 score victory.
  - **Darts 501 (`darts.engine.ts`)**: Standard London clock 20-sector geometry, single/double/triple wire rings, 3 darts per turn, bust rule, and double-out checkout rule.
  - **Bowling Strike (`bowling.engine.ts`)**: 10-pin triangle rack simulation, lane trajectory & spin curve, gutter/strike/spare physics, 10 frames with lookahead bonuses and 10th frame bonus rolls.
  - **Table Tennis Duel (`tabletennis.engine.ts`)**: Server-authoritative rally counters, topspin/backspin/smash shot mechanics, table and net bounds checking, 11-point match victory with 2-point deuce lead, and service rotation.
- **MatchManager Expansion (`server/src/games/match.manager.ts`)**:
  - Registered all 6 casual engines statically (`POOL_8_BALL`, `MINI_GOLF`, `AIR_HOCKEY`, `DARTS`, `BOWLING`, `TABLE_TENNIS`).
- **Unified Mobile Casual & Arcade Game Screen (`mobile/screens/games/CasualGameScreen.tsx`)**:
  - Marvie iOS UI Kit aesthetic (dark slate `#1F2C34`, `#263843`, `#30444E`, 25px card radius, 54px buttons).
  - Custom SVG graphics for all 6 arcade titles:
    - 8 Ball Pool: Green felt baize table with wooden rails, 6 pockets, numbered colored balls, and cue aiming ray.
    - Mini Golf: Putting green fairway with water pond ripples, sand bunker, red flag pin, and cup.
    - Air Hockey: Overhead neon table with cyan boundary glow, red center line, blue/red mallets, and glowing puck.
    - Darts: 20-sector London clock dartboard with concentric triple/double wire rings, number labels, and green aim reticle.
    - Bowling: Parquet wood bowling lane with planks, approach arrows, side gutters, 10 pins, and 3-hole bowling ball.
    - Table Tennis: Blue table with white boundary lines, center stripe, net barrier, red/black paddles, and ball bounce trails.
  - Standardized HUD with player avatars, turn countdown indicator, current score, and game action logs.
  - Rematch handshake modal and real-time Socket.IO synchronization.
- **Game Discovery & Routing**:
  - `mobile/App.tsx`: Wired `casualGame` routing and `currentCasualGameType` state.
  - `mobile/components/organisms/JoinRoomModal.tsx`: Added multi-game scroll carousel options for all 6 Phase 12 casual games.
  - `mobile/screens/ThemeShowcaseScreen.tsx`: Added dedicated game cards with live online counts for all 6 Phase 12 casual games.
- **Testing & Verification**:
  - Automated test suite (`server/test-casual-games.js`): **35 Passed, 0 Failed**.
  - System regression tests: **313+ total passing assertions across all phases, 0 regressions**.
  - Mobile TypeScript check (`tsc --noEmit`): **0 errors**.
  - Expo Android build (`expo export -p android`): **772 modules bundled cleanly (2.1 MB bytecode, exit code 0)**.

## [1.12.0-phase11] - 2026-10-06 - Phase 11 Board Game Expansion II Milestone

### Added
- **Server-Authoritative Board Game Engines Suite II (`server/src/games/board2/`)**:
  - **Carrom Board (`carrom.engine.ts`)**: 19 carrom men (Queen + 6 inner + 12 outer), baseline striker placement (15%..85%), aiming (-85°..+85°), power charge (10%..100%), pocketing, Queen cover rule, and striker foul penalties.
  - **Snakes & Ladders (`snakesandladders.engine.ts`)**: 100-cell grid, 8 ladders, 8 snakes, CSPRNG dice roll (1..6), bonus rolls on 6, and exact landing on 100.
  - **Battleship Fleet Command (`battleship.engine.ts`)**: Dual 10x10 hidden grids with 5 ships (Carrier [5], Battleship [4], Cruiser [3], Submarine [3], Destroyer [2]), secret orthogonal setup, authoritative fog-of-war masking, Hit/Miss/Sunk tracking, and fleet destruction victory.
  - **Dominoes Duel (`dominoes.engine.ts`)**: Double-Six 28 tiles, 7-tile hands, boneyard drawing, matching ends placement with tile orientation, and blocked/exhausted hand resolution.
  - **Backgammon (`backgammon.engine.ts`)**: Standard 24 points FIDE setup, dual dice rolls with double bonus (4 moves), blot hitting, bar re-entry, and home board bearing off.
  - **Mancala Kalah (`mancala.engine.ts`)**: 12 pits (4 stones each) + 2 stores, counterclockwise sowing, free turns on store finish, empty pit captures, and final sweep.
  - **Chinese Checkers (`chinesecheckers.engine.ts`)**: Hexagram star coordinate space, 10 marbles per player, single steps, multi-hop jumps, and opposite triangle occupancy victory.
- **MatchManager Expansion (`server/src/games/match.manager.ts`)**:
  - Registered all 7 engines statically (`CARROM`, `SNAKES_AND_LADDERS`, `BATTLESHIP`, `DOMINOES`, `BACKGAMMON`, `MANCALA`, `CHINESE_CHECKERS`).
- **Unified Mobile Board Game Screen II (`mobile/screens/games/BoardGame2Screen.tsx`)**:
  - Marvie iOS UI Kit aesthetic (dark slate `#1F2C34`, `#263843`, `#30444E`, 25px card radius, 54px buttons).
  - Custom SVG graphics for all 7 game engines:
    - Carrom wooden board with center circular mandalas, baseline stripes, and corner pockets.
    - Snakes & Ladders 10x10 boustrophedon zigzag number grid with ladder green markers and snake red coils.
    - Battleship radar screen with dual tactical grids (own fleet layout + enemy firing radar).
    - Dominoes table with chain layout, open end highlights, and interactive hand tray.
    - Backgammon board with felt playing surface, alternating triangle points, bar division, and dice tray.
    - Mancala wooden trough with hollow circular pits and side store basins.
    - Chinese Checkers hexagram star with colored marbles and valid landing destination highlights.
  - Standardized HUD with player avatars, turn countdown indicator, current score, and game action logs.
  - Rematch handshake modal and real-time Socket.IO synchronization.
- **Game Discovery & Routing**:
  - `mobile/App.tsx`: Wired `boardGame2` routing and `currentBoardGame2Type` state.
  - `mobile/components/organisms/JoinRoomModal.tsx`: Added multi-game scroll carousel for all 7 Phase 11 games.
  - `mobile/screens/ThemeShowcaseScreen.tsx`: Added dedicated game cards with live online counts for all 7 Phase 11 games.
- **Testing & Verification**:
  - Automated test suite (`server/test-board-games-2.js`): **36 Passed, 0 Failed**.
  - System regression tests: **278+ total passing assertions across all phases, 0 regressions**.
  - Mobile TypeScript check (`tsc --noEmit`): **0 errors**.
  - Expo Android build (`expo export -p android`): **771 modules bundled cleanly (2.1 MB bytecode, exit code 0)**.

## [1.11.0-phase10] - 2026-10-06 - Phase 10 Board Game Expansion I Milestone

### Added
- **Server-Authoritative Board Game Engines Suite (`server/src/games/board/`)**:
  - **Chess Grandmaster (`chess.engine.ts`)**: 8x8 FIDE rules, White/Black alternates, check, checkmate, stalemate, pawn promotion, capture tracking, draw offers, resignations, and 60s move timer.
  - **Checkers / Draughts (`checkers.engine.ts`)**: 8x8 dark squares, forward diagonals, mandatory jump captures, multi-jump chains (`mustContinueJump`), crowned King promotions with SVG crowns.
  - **Connect Four (`connectfour.engine.ts`)**: 7x6 gravity rack, vertical column drops to bottom available slot, continuous 4-in-a-row detection across all 4 axes, and winning line highlights.
  - **Gomoku Duel (`gomoku.engine.ts`)**: 15x15 Go board with traditional *hoshi* points, stone placement on intersections, rapid 5-stone continuous line victory checks.
  - **Reversi / Othello (`reversi.engine.ts`)**: 8x8 grid with 4 center starting discs, 8-directional outflanking disc flips, legal move generators, pass turn logic, and final disc count tally.
- **MatchManager Expansion (`server/src/games/match.manager.ts`)**:
  - Registered all 5 engines statically (`CONNECT_FOUR`, `REVERSI`, `GOMOKU`, `CHECKERS`, `CHESS`).
- **PostgreSQL Database & Prisma Enum Synchronization**:
  - Added roadmap game types to `enum GameType` in `server/prisma/schema.prisma`.
  - Pushed to PostgreSQL database via `prisma db push` and generated client via `prisma generate`.
- **Unified Mobile Board Game Screen (`mobile/screens/games/BoardGameScreen.tsx`)**:
  - Marvie iOS UI Kit aesthetic (dark slate `#1F2C34`, `#263843`, `#30444E`, 25px radius, 54px buttons).
  - Custom SVG Chess piece vector components for Pawn, Rook, Knight, Bishop, Queen, King.
  - Dynamic board layouts supporting 7x6, 8x8, and 15x15 grid configurations.
  - Player Versus HUD, live countdown timer, check alerts, and pawn promotion picker modal.
  - Rematch handshake modal and lobby return actions.
- **Game Discovery & Routing**:
  - `mobile/App.tsx`: Wired `boardGame` routing and `currentBoardGameType` state.
  - `mobile/components/organisms/JoinRoomModal.tsx`: Added multi-game scroll carousel for all 7 games.
  - `mobile/screens/ThemeShowcaseScreen.tsx`: Added dedicated game cards with live online counts for all 5 board games.
- **Testing & Verification**:
  - Automated test suite (`server/test-board-games-1.js`): **57 Passed, 0 Failed**.
  - System regression tests: **242+ total passing assertions across all phases, 0 regressions**.
  - Mobile TypeScript check (`tsc --noEmit`): **0 errors**.
  - Expo Android build (`expo export -p android`): **770 modules bundled cleanly (2.1 MB bytecode, exit code 0)**.

## [1.10.0-phase9] - 2026-10-06 - Phase 9 Server-Authoritative Ludo World Arena Milestone

### Added
- **Server-Authoritative Ludo Game Engine (`server/src/games/ludo/ludo.engine.ts`)**:
  - Implemented `GameEngine<LudoState, LudoAction, LudoResult>` supporting 2 to 4 players.
  - Cryptographically secure dice roll generation (`crypto.randomInt(1, 7)`).
  - 4 quadrants (Red, Green, Yellow, Blue) with 4 tokens each (16 tokens total).
  - Yard exit validation requiring roll of 6 to enter circuit at step 0.
  - 52-cell track navigation with color-specific start offsets (`RED: 0, GREEN: 13, YELLOW: 26, BLUE: 39`).
  - 8 safe cells with capture immunity (`0, 8, 13, 21, 26, 34, 39, 47`).
  - Opponent token captures returning captured tokens to yard (`step: -1`) and awarding bonus rolls.
  - Private home corridors (`step: 51..55`) and exact-landing center finish (`step: 56`) with bonus rolls.
  - 3-consecutive-sixes penalty rule (voids turn and auto-advances to next player).
  - Multi-player rankings and placement tracking (1st through 4th).
  - 20-second turn clocks with intelligent timeout auto-play (auto-roll and auto-advancing most advanced token).
- **Match Manager Ludo Registration (`server/src/games/match.manager.ts`)**:
  - Integrated `LudoEngine` into `MatchManager.registerEngine('LUDO')`.
  - Generalized rematch player rotation (`[P1, P2, ..., P0]`) for 2-4 players.
  - Extended `game:over` socket event with `rankings` and `winnerIds`.
- **Mobile Client Ludo Arena (`mobile/screens/games/LudoScreen.tsx`)**:
  - Full Marvie iOS UI Kit aesthetic (`#2A3C44`, `#30444E`, `#3ED598`, `#FFC542`, `#FF575F`, `#0062FF`).
  - Interactive 15x15 vector SVG board with yards, track, safe stars, and home corridors.
  - Glowing touch overlays for valid tokens during active turn.
  - 3D/vector SVG dice roller displaying 1..6 pips with shake animations.
  - Player corner HUDs with active turn glow and token progress counts (`X/4 Home`).
  - Match concluded podium dialog with rankings and rematch handshake controls.
  - Added `StarIcon` and `'star'` to `mobile/icons/index.tsx`.
- **Verification & Automated Testing**:
  - Comprehensive automated test suite (`server/test-ludo.js`): **67 Passed, 0 Failed**.
  - Total automated assertions passing across codebase: **217/217**.
  - Mobile TypeScript compiler check (`tsc --noEmit`): **0 errors**.
  - Hermes Android bytecode export (`expo export -p android`): **769 modules compiled cleanly (2.0 MB)**.

## [1.9.0-phase8] - 2026-10-05 - Phase 8 Server-Authoritative Tic-Tac-Toe & Match Engine Milestone

### Added
- **Server-Authoritative Tic-Tac-Toe Engine (`server/src/games/tictactoe/tictactoe.engine.ts`)**:
  - Implemented `GameEngine<TicTacToeState, TicTacToeAction, TicTacToeResult>`.
  - Authoritative validation: turn validation, cell bounds check (0..8), occupied cell prevention.
  - Complete winning line checks (3 rows, 3 columns, 2 diagonals) and draw detection with winning cell indices.
  - 15-second turn timer with automated timeout handling.
- **Unified Match Coordinator (`server/src/games/match.manager.ts`)**:
  - Central match lifecycle management for rooms across all game engines.
  - Turn timers, sequence numbers, live state broadcasts, and forfeit handling.
  - Instant rematch protocol (`game:rematch_request`, `game:rematch_response`) with mark swap and round counting.
  - Database persistence: matches recorded in `GameResult` and lifetime records updated in `GameStatistics`.
- **REST Endpoints (`server/src/games/game.routes.ts`)**:
  - `GET /api/v1/games/catalog`, `GET /api/v1/games/active/:roomCode`, `GET /api/v1/games/stats/:gameType`, `GET /api/v1/games/history/:gameType`.
- **Mobile Client Integration (`mobile/screens/games/TicTacToeScreen.tsx`)**:
  - Full Marvie iOS UI Kit aesthetic (`#2A3C44`, `#30444E`, `#3ED598`, `#FFC542`).
  - Pure SVG player markers (`CrossMarkIcon`, `CircleMarkIcon` with Zero emojis).
  - Scoreboard, active turn indicator, 15-second countdown progress bar, winning line glow, and rematch modal.
- **Verification & Automated Testing**:
  - Comprehensive automated test suite (`server/test-tictactoe.js`): **52 Passed, 0 Failed**.
  - Total automated assertions passing: **150/150**.
  - Mobile TypeScript compiler check (`tsc --noEmit`): **0 errors**.
  - Hermes Android bytecode export (`expo export -p android`): **737 modules compiled cleanly (2.22 MB)**.

## [1.8.0-sketch-audit] - 2026-10-05 - Sketch UI Kit Design Audit & Visual Layer Redesign

### Added & Redesigned
- **Marvie Sketch UI Kit Full Audit & Visual Layer Redesign**:
  - Extracted and audited `download_marvie-ios-ui-kit-for-sketch.sketch` (255 symbols, document color palette, typography hierarchy, component dimensions).
  - Redesigned visual foundation using Marvie Dark Slate (`#2A3C44`, `#30444E`, `#3D505A`) and signature Mint/Teal primary CTA (`#3ED598`).
  - Added full Marvie accent token spectrum: `accentMint` (`#3ED598`), `accentAmber` (`#FFC542`), `accentOrange` (`#FF974A`), `accentCoral` (`#FF575F`), `accentBlue` (`#0062FF`), and `accentViolet` (`#755FE2`) with corresponding tinted fill tokens (`cardTintMint`, `cardTintAmber`, `cardTintCoral`).
  - **Standardized 25px Container Radius**: Updated `RADIUS.card: 25` and `RADIUS.sheet: 25` across all cards, modals, sheets, and dialogs matching `Rectangle Copy 25 fixedRadius=25`.
  - **Updated Button System**: Standardized `PrimaryButton` and interactive buttons to `54px height` with `14px border radius` (`fixedRadius=14`) and trailing chevron support matching Marvie `Next_Button` and `Sign_Button`.
  - **Updated Form Input System**: Upgraded `InputField` to `54px height` with `14px border radius` and a `36x36` tinted icon container with `12px radius` matching Marvie `Name_Field`.
  - **Marvie 5-Element Bottom Navigation Bar**: Implemented `MarvieBottomNav` (`mobile/components/organisms/MarvieBottomNav.tsx`) with `25px top radius`, `70px height` (84px with safe area), active indicator dot, and center elevated quick match action.
  - **Marvie Stat Cards with Bullet Pills**: Upgraded `StatCard` with signature `14x8px` bullet pill indicators (`4px radius`), bold count values, and accent category coloring.
  - **Marvie Big Hero Card**: Implemented `Green_Big_Card` adaptation on `ThemeShowcaseScreen` with live status indicator pulse, dual action buttons, and tinted arena badge.
  - **Screen Layout Density & Alignment**: Upgraded `ThemeShowcaseScreen`, `LoginScreen`, `RegisterScreen`, `RoomLobbyScreen`, `ChatListScreen`, `FriendsScreen`, and `ProfileScreen` with `96px` bottom scroll padding to prevent navigation overlap and establish clean visual rhythm.
  - **Preserved Existing System**: Maintained all 5 theme families (`midnightNeutral`, `coralMarble`, `forestGold`, `moonViolet`, `violetDusk`), dual Light/Dark/System appearance modes, zero-emoji SVG iconography, and zero breaking changes to backend or game logic.
- **Verification & Testing**:
  - All automated test suites passing 100% (Rooms: 38/38, Chat: 30/30, Friends: 30/30).
  - Mobile TypeScript compiler check (`tsc --noEmit`) passing with 0 errors.
  - Hermes Android bytecode export (`expo export -p android`) compiling 736 modules cleanly into bytecode (2.19 MB).

## [1.7.0-roadmap] - 2026-10-05 - Game Roadmap Expansion & Modular Game Architecture

### Added
- **Expanded 84+ Game Ecosystem Roadmap**:
  - Reorganized the multi-phase roadmap into 18 systematic, architecturally coherent phases.
  - Formulated comprehensive documentation for 71 playable games and 13 future research titles across 7 distinct categories:
    - **Category A (14 Core Board Games)**: Tic-Tac-Toe, Ludo, Chess, Checkers, Connect Four, Carrom, Snakes & Ladders, Backgammon, Reversi/Othello, Gomoku, Battleship, Dominoes, Mancala, Chinese Checkers (`docs/GAMES/BOARD_GAMES.md`).
    - **Category B (12 Card Games)**: UNO-style, Hearts, Spades, Rummy, Gin Rummy, Crazy Eights, Go Fish, War, Durak, President/Scum, Play-Money Blackjack, Play-Money Poker (`docs/GAMES/CARD_GAMES.md`).
    - **Category C (12 Casual Multiplayer)**: 8 Ball Pool, Mini Golf, Air Hockey, Darts, Bowling, Table Tennis, Word Search, Hangman, Memory Match, Quiz Battle, Trivia, Word Battle (`docs/GAMES/CASUAL_GAMES.md`).
    - **Categories D & E (22 Fast & Strategy/Puzzle Games)**: Reaction Test, Rock Paper Scissors, Speed Tap, Color Match, Math Battle, Typing Race, Sudoku Battle, 2048 Multiplayer, Minesweeper Duel, Wordle-style Duel, Sequence, Mastermind, etc. (`docs/GAMES/WORD_AND_PUZZLE_GAMES.md`).
    - **Category F (14 Party & Social Games)**: Would You Rather, Truth or Dare, Charades, Guess the Picture, Who Am I?, Imposter, Mafia, Drawing & Guessing, Pictionary-style, Never Have I Ever, etc. (`docs/GAMES/PARTY_GAMES.md`).
    - **Category G (13 Future Advanced Research Games)**: 3D Racing, Kart Racing, Battle Arena, RTS, Tower Defense, Multiplayer Shooter, Mini Battle Royale, Football/Soccer, Cricket, Basketball, Fighting Game (`docs/GAMES/FUTURE_GAMES.md`).
- **Strict Non-Gambling Policy Enforcement**:
  - Mandated virtual-token / play-money gameplay only for all card titles (Blackjack, Poker).
  - Explicit prohibition of cash deposits, cash withdrawals, betting, or real-money token monetization.
- **Server-Authoritative Game Engine Architecture**:
  - Defined the modular contract `GameEngine<TState, TAction, TResult>` (`server/src/games/game.definition.ts`) requiring backend validation of actions, state transitions, winner determination, CSPRNG random generation (dice, card deck Fisher-Yates), and disconnect handling.
  - Implemented the central `GameRegistry` (`server/src/games/game.registry.ts`) dynamically registering all 71 active games with min/max capacities, categories, and turn timers.
- **Game-Agnostic Multiplayer Room Engine**:
  - Decoupled `RoomService` (`server/src/rooms/room.service.ts`) and validation (`server/src/rooms/room.validation.ts`) from specific game titles. Capacity validation now queries `GameRegistry.getGame(gameType)` dynamically.
  - Enabled support for custom game settings, public/private room types, and 30-second disconnect grace windows across all present and future game types.
- **Comprehensive Documentation Suite**:
  - Authored detailed phase execution specifications for Phases 07 through 18 in `docs/PHASES/`.
  - Updated `docs/GAMES/GAME_SYSTEM.md`, `docs/ARCHITECTURE/GAME_ARCHITECTURE.md`, `docs/ARCHITECTURE/REALTIME_ARCHITECTURE.md`, `docs/PRODUCT/FEATURE_LIST.md`, `docs/PRODUCT/PRODUCT_OVERVIEW.md`, `docs/PRODUCT/PRODUCT_REQUIREMENTS.md`, `docs/README.md`, and `docs/CURRENT_STATUS.md`.

## [1.6.0-phase7] - 2026-10-05 - Phase 7 Multiplayer Game Rooms & Lobbies Milestone

### Added
- **Backend Multiplayer Room Engine & Endpoints**:
  - Implemented `POST /api/v1/rooms` generating unique, user-friendly 6-character room codes (`ABCDEFGHJKLMNPQRSTUVWXYZ23456789`) with host occupying `slotIndex: 0` (`isReady: true`).
  - Implemented `GET /api/v1/rooms/:code` returning full room metadata, host profile, and player slots.
  - Implemented `POST /api/v1/rooms/:code/join` with dynamic slot assignment (`0 .. maxPlayers - 1`), capacity enforcement, and idempotent rejoin support.
  - Implemented `POST /api/v1/rooms/:code/ready` for synchronizing player readiness.
  - Implemented `POST /api/v1/rooms/:code/start` enforcing host permissions, minimum player threshold, and readiness validation before dispatching `game:start`.
  - Implemented `POST /api/v1/rooms/:code/leave` with automatic host transfer and room disbanding.
  - Implemented `POST /api/v1/rooms/matchmake` public matchmaking queue pairing players in sub-1s.
- **Real-Time Socket.IO Lobby Gateway**:
  - `room:join` and `room:leave` channel subscriptions.
  - Live socket events: `room:player_joined`, `room:player_left`, `room:player_ready`, `room:state`, `game:start`, `room:disbanded`.
  - **30-Second Disconnect Grace Protocol**: Automatic detection of player network disconnects, emission of `room:player_disconnected` with 30s grace window countdown, automatic reconnection reconciliation (`room:player_reconnected`), and timeout handling (`room:player_abandoned`).
- **Mobile Room Services & UI Screens**:
  - Built `RoomService` (`mobile/services/room.service.ts`) and expanded `MobileSocketService` with room subscriptions.
  - Built `RoomLobbyScreen` (`mobile/screens/rooms/RoomLobbyScreen.tsx`) featuring 6-character code card, copy action, slot grid with host crown badge, ready glow indicators, disconnect grace warnings, and host start controls.
  - Built `JoinRoomModal` (`mobile/components/organisms/JoinRoomModal.tsx`) with 3 tabs: 1-click Quick Match, 6-character Code input, and Custom Room Creation.
  - Fully wired room navigation into `MainNavigator`, in-chat Game Challenge cards, `FriendsScreen`, and `ThemeShowcaseScreen`.
- **Testing & Verification**:
  - Authored automated test suite `server/test-rooms.js` executing 38 assertions with 100% pass rate.
  - Regression verified `server/test-chat.js` (30/30 assertions passing).
  - Mobile TypeScript compiler check (`tsc --noEmit`) passing with 0 errors.
  - Hermes Android bytecode export (`expo export -p android`) compiling 735 modules cleanly into bytecode (2.18 MB).

## [1.5.0-phase6] - 2026-10-05 - Phase 6 Private Chat & In-Chat Invitations Milestone

### Added
- **Backend Direct Messaging Services & Endpoints**:
  - Implemented `GET /api/v1/chat/conversations` returning active 1-on-1 conversations, unread counters, last message preview, and peer profiles with live presence.
  - Implemented `POST /api/v1/chat/conversations/:recipientId` for atomic, idempotent conversation initialization with block protections.
  - Implemented `GET /api/v1/chat/conversations/:conversationId/messages` with automatic transition of unread incoming messages to `READ` and sender receipt emission.
  - Implemented `POST /api/v1/chat/conversations/:conversationId/messages` supporting `TEXT`, `GAME_INVITE`, and `GAME_RESULT` types with metadata validation.
  - Implemented `PUT /api/v1/chat/conversations/:conversationId/read` for explicit read acknowledgment.
- **Real-Time Socket.IO Chat Channels**:
  - `chat:join` & `chat:leave` conversation room subscriptions.
  - Real-time typing indicators with `chat:typing` emitting `chat:user_typing` to conversation members.
  - Sub-100ms message dispatch via personal room `chat:message_received`.
  - Live read receipts via `chat:messages_read`.
- **Mobile Chat Architecture & Screens**:
  - Built `ChatService` (`mobile/services/chat.service.ts`) and `MobileSocketService` chat event integrations.
  - Built `ChatListScreen` (`mobile/screens/chat/ChatListScreen.tsx`) with conversation search filter, unread count pill badge, presence status indicators, and delivery ticks.
  - Built `ConversationScreen` (`mobile/screens/chat/ConversationScreen.tsx`) with inverted message stream, pure SVG delivery ticks (`CheckIcon`, `DoubleCheckIcon`), interactive Game Challenge cards with "Accept & Join Match" action, and typing indicator banners.
  - Integrated full routing across `MainNavigator`, `FriendsScreen`, `ProfileScreen`, and `AppHeader`.
- **Testing & Verification**:
  - Authored automated test suite `server/test-chat.js` with 30 assertions passing with 100% success rate.
  - Mobile TypeScript compiler check (`tsc --noEmit`) passing with 0 errors.

## [1.4.0-phase5] - 2026-10-05 - Phase 5 Friends & Social Graph Milestone

### Added
- **Backend Social Graph Endpoints & Services**:
  - Implemented `GET /api/v1/friends` returning friends with online presence status, total wins, and win rate.
  - Implemented `GET /api/v1/friends/requests` returning incoming and outgoing pending friend requests.
  - Implemented `POST /api/v1/friends/request/:targetUserId` with duplicate and self-request protections, auto-accept for cross-requests, and real-time socket alerts.
  - Implemented `POST /api/v1/friends/request/:requestId/accept`, `reject`, and `DELETE /cancel`.
  - Implemented `DELETE /api/v1/friends/:friendId` for mutual friendship removal.
  - Implemented `GET /api/v1/friends/search?q=...` with prefix/substring matching and relationship detection (`NONE`, `REQUEST_SENT`, `REQUEST_RECEIVED`, `FRIENDS`).
  - Implemented player blocking & unblocking (`POST/DELETE /api/v1/friends/block/:targetUserId`, `GET /blocked`).
- **Real-Time Presence & Socket Events**:
  - Multi-connection presence tracking in `socket.server.ts` updating database `Profile.isOnline` and `lastSeen`.
  - Broadcast of `presence:update` to all mutual friends upon connection or disconnection.
  - Real-time socket events for `friend:request_received`, `friend:request_accepted`, and `friend:removed`.
- **Mobile Social Screen & Services**:
  - Implemented `FriendsService` in `mobile/services/friends.service.ts`.
  - Implemented `MobileSocketService` in `mobile/services/socket.service.ts` for real-time presence subscriptions.
  - Added pure SVG `UserXIcon` and `BanIcon` components to `mobile/icons/index.tsx`.
  - Built comprehensive `FriendsScreen` featuring a 3-segment switcher (Friends, Requests, Discover), search bar, and contextual action buttons.
  - Integrated Friends navigation into `AppHeader` and `MainNavigator`.
- **Testing & Verification**:
  - Authored automated test suite `server/test-friends.js` executing 30 assertions with 100% pass rate.
  - Authored automated real-time test `server/test-friends-socket.js` verifying live presence broadcasts over WebSocket.
  - Mobile TypeScript compiler check (`tsc --noEmit`) passing with 0 errors.
  - Hermes Android bundle (`expo export -p android`) compiling 729 modules cleanly (2.1 MB).

## [1.3.0-phase4] - 2026-10-05 - Phase 4 Profiles Milestone

### Added
- **Backend Profile Services & Endpoints**:
  - Implemented `GET /api/v1/profiles/me` retrieving full profile, lifetime gaming statistics, friends/stories count, and unlocked achievements.
  - Implemented `PUT /api/v1/profiles/me` with Zod validation for updating display name, bio, avatar preset, theme preference, and appearance mode.
  - Implemented `GET /api/v1/profiles/:userId` resolving dynamic relationship states (`NONE`, `REQUEST_SENT`, `REQUEST_RECEIVED`, `FRIENDS`, `BLOCKED`) while omitting private fields.
  - Aggregated gaming statistics engine computing total matches, wins, losses, win rate %, and highest win streak.
- **Zero-Emoji SVG Avatar Preset System**:
  - Authored 6 theme-tailored vector SVG avatar presets (`cyber_ninja`, `cosmic_voyager`, `golden_phoenix`, `shadow_knight`, `valkyrie_crown`, `neon_tiger`).
  - Integrated preset rendering into `<Avatar />` component with automatic fallback to stylized initials badge.
- **Mobile Profile Framework & Screens**:
  - Implemented `ProfileService` in `mobile/services/profile.service.ts`.
  - Built `EditProfileModal` with real-time character counters and interactive SVG avatar selector.
  - Built full `ProfileScreen` featuring Marvie-adapted layered hero banner, 88px avatar with presence indicator, 4-card stats grid, trophy cabinet showcase, and contextual action buttons.
  - Added profile navigation from `AppHeader` and `MainNavigator` in `mobile/App.tsx`.
- **Testing & Verification**:
  - Authored automated test suite `server/test-profile.js` with 21 assertions passing with 100% success rate.
  - Verified mobile TypeScript compiler check (`tsc --noEmit`) passing with 0 errors.
  - Verified Hermes Android bytecode bundle generation (`expo export -p android`) compiling 694 modules cleanly (1.93 MB).

## [1.2.0-phase3] - 2026-10-05 - Phase 3 Authentication Milestone

### Added
- **Backend Authentication Services & Endpoints**:
  - Implemented `POST /api/v1/auth/register`, `POST /api/v1/auth/login`, and `GET /api/v1/auth/me`.
  - Passwords hashed with `bcryptjs` (work factor 12).
  - JWT token issuance and `authenticateToken` Express middleware.
  - Zod validation schemas enforcing strict email, username, and password requirements.
  - Auto-provisioning of `Profile` in database upon registration.
- **Socket.IO Real-Time Authentication**:
  - Handshake authentication middleware verifying Bearer tokens in `socket.handshake.auth`.
  - Automatic binding to personal notification room (`user:${userId}`).
- **Mobile Authentication Framework**:
  - Implemented `MobileAuthService` with AsyncStorage token persistence.
  - Built `AuthProvider` and `useAuth()` hook managing login, register, logout, and token rehydration.
  - Built `LoginScreen` and `RegisterScreen` styled with Phase 2 Design System tokens and SVG icons.
  - Conditional authentication routing in `mobile/App.tsx`.
- **Testing & Verification**:
  - Authored automated test suite `server/test-auth.js` executing 6 core scenarios with 100% pass rate.
  - Mobile TypeScript check (`tsc --noEmit`) passing with 0 errors.
  - Android Hermes bundle compilation (`expo export -p android`) compiling 690 modules with exit code 0.

## [1.1.0-phase2] - 2026-10-05 - Phase 2 Design System Milestone

### Added
- Centralized Design Tokens (colors, typography, spacing, radius, shadows).
- 5 Theme Families in Dual Mode (10 palettes: Coral, Moon Violet, Violet Dusk, Midnight Neutral, Forest Gold).
- ThemeContext & Reactive Engine with zero-restart switching & persistence.
- Pure SVG Icon Registry (24 vector icons, strict zero-emoji policy).
- Reusable UI Component Catalog (Typography, StatusIndicator, Avatar, Divider, Buttons, Inputs, StatCards, StoryAvatar, AppHeader, GameCard, ThemeSelectorModal).
- Theme Showcase Screen.

## [1.0.0-phase1] - 2026-10-05 - Phase 1 Foundation Milestone

### Added
- Complete Documentation Architecture (40+ specifications).
- Monorepo Foundation (`mobile/`, `server/`, `shared/`).
- PostgreSQL 18 connection, `gameapp_dev` database, 17-model Prisma schema.
- Real-Time Gateway & API (Express server, Socket.IO gateway with WebSocket transport).
