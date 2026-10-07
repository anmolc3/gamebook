# Phase 13: Card Game Engine & Suite

## Objective
Build a reusable, server-authoritative Card Game Engine (`Deck`, `Shuffle`, `Hand`, `Draw`, `Discard`, `Melds`, `Trick Taking`, `Evaluator`) and implement 12 virtual card games with strict **Zero Real-Money Gambling**.

---

## Strict Non-Gambling Policy
> [!IMPORTANT]
> Zero real-money deposits, withdrawals, or gambling mechanics. All games use virtual/play-money chips or recreational points only.

---

## Game Modules & Implementations
1. **Color Match Clash (`UNO_STYLE`)**: 108 cards (4 colors + Skip, Reverse, Draw 2, Wild, Wild Draw 4), color matching, draw penalties, last card Uno call.
2. **Hearts (`HEARTS`)**: 4 players, 13 tricks, 2♣ opening lead, penalty scoring (Hearts = 1, Q♠ = 13), shoot-the-moon (26 pts swap).
3. **Spades (`SPADES`)**: Contract bidding (0..13 tricks / nil), permanent Spades trump, bag penalties (10 bags = -100).
4. **Indian Rummy (`RUMMY`)**: 13-card hand, pure sequences, sets/runs, joker wildcards, declare validation.
5. **Gin Rummy (`GIN_RUMMY`)**: 10-card duel, stock/discard draw, deadwood calculation, knock & gin, undercut bonus.
6. **Crazy Eights (`CRAZY_EIGHTS`)**: Rank/suit shedding, 8s wild suit changers, draw penalties.
7. **Go Fish (`GO_FISH`)**: Rank requests, 4-of-a-kind books, ocean stock drawing.
8. **War Card Duel (`WAR`)**: Simultaneous card battle, 3-card tie-breaker war chest.
9. **Durak (`DURAK`)**: 36-card Russian card classic, attack/defend rounds, trump suit, "fool" resolution.
10. **President / Scum (`PRESIDENT`)**: Trick climbing (singles/pairs/triples), clear on 2s, role assignments (President to Scum).
11. **Blackjack (`BLACKJACK`)**: Play-money chips against dealer, hit/stand/double down, 3:2 natural 21 (zero gambling).
12. **Texas Hold’em Social (`POKER`)**: Play-money chips, pre-flop/flop/turn/river/showdown, 7-card best 5 hand evaluator (zero gambling).

---

## Core Card Engine Architecture
- **CSPRNG Deck Shuffling (`CardDeck.ts`)**: Cryptographically secure Fisher-Yates array shuffle using `crypto.randomInt`. Generates Standard 52, Durak 36, and Uno 108 card decks.
- **Card Evaluators (`CardEvaluator.ts`)**:
  - `evaluateBlackjack`: Soft vs Hard Ace handling (11 $\rightarrow$ 1), natural 21, bust detection.
  - `evaluateTrick`: Lead suit tracking, trump card priority, high-rank resolution.
  - `isPureSequence` & `isSet`: Meld validation for Indian Rummy and Gin Rummy.
  - `evaluatePokerHand`: 7-card evaluator detecting Royal Flush, Straight Flush, Four of a Kind, Full House, Flush, Straight, Three of a Kind, Two Pair, One Pair, and High Card.

---

## Mobile Client UX (`CardGameScreen.tsx`)
- Pure vector SVG playing cards (suits ♥, ♦, ♣, ♠ and Uno colors/actions).
- Interactive card fan with elevation on selection.
- Deep green felt poker/tabletop stage with dynamic game-specific renderers (Discard piles, Trick circles, Dealer table, Community card layout, Ocean pond).
- Context-sensitive action dock (Draw, Uno, Play, Bid, Discard, Declare, Knock, Attack, Defend, Hit, Stand, Double, Check, Call, Raise, Fold).
- Zero Real-Money Gambling badge ("Recreational Play Money Tokens • Zero Real Money Stakes").
- Seamless Socket.IO real-time multiplayer synchronization.

---

## Test Verification (`server/test-card-games.js`)
- **24 of 24 Tests Passing (100% Pass Rate)**:
  - Deck generation and CSPRNG shuffle
  - Trick evaluator and trump resolution
  - Blackjack soft ace and dealer resolution
  - Indian Rummy pure sequence and set validation
  - Texas Hold'em Royal Flush evaluation
  - All 12 card game engines verified through MatchManager
- Full regression across all suites: 251+ automated tests passing with zero errors.
- Mobile TypeScript check: 0 errors.
- Android production bytecode export: Clean.

---

## Current Status
**COMPLETED** (Phase 13 fully delivered and verified)
