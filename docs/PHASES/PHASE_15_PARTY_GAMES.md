# Phase 15: Party & Social Games (Category F)

## Objective
Implement 14 interactive party and social multiplayer titles with server-authoritative game engines, comprehensive test suites, and Marvie iOS UI Kit client screens.

---

## Current Status: COMPLETED ✅

### Implemented Engines (14 Titles)
1. **Would You Rather? (`WOULD_YOU_RATHER`)**: Compelling A/B dilemmas with real-time voting and percentage consensus comparisons.
2. **Truth or Dare Social (`TRUTH_OR_DARE`)**: Truth questions and Dare challenges with player completion verification.
3. **Charades Party (`CHARADES`)**: Secret acting prompt with timer, actor confirm, and live guess chat.
4. **Pixel Reveal Guess (`GUESS_PICTURE`)**: Clue hint with 10-level pixelation reveal buzzer guessing.
5. **Taboo Word Clue (`GUESS_WORD`)**: Target word with forbidden taboo words and clue giver penalty detection.
6. **Name That Tune (`GUESS_SONG`)**: Lyric snippet/riddle with 4 multiple-choice song title options.
7. **Who Am I? (`WHO_AM_I`)**: Celebrity / character deduction using Yes/No questions and identity guessing.
8. **The Imposter (`IMPOSTER`)**: Secret location given to all players except one hidden imposter; clue sharing and voting.
9. **Mafia / Werewolf (`MAFIA`)**: Day/Night cycle, roles (Mafia, Detective, Doctor, Villager), night actions, and day lynch voting.
10. **Draw & Guess Live (`DRAW_AND_GUESS`)**: Live vector stroke drawing canvas with real-time chat guessing and scoring.
11. **Pictionary Duel (`PICTIONARY`)**: Word prompt drawing duel with brush strokes and instant solver detection.
12. **Never Have I Ever (`NEVER_HAVE_I_EVER`)**: 10 fingers/lives rule, prompt statements, and "I HAVE" confessions.
13. **This or That (`THIS_OR_THAT`)**: Fast-paced rapid-fire A vs B preference duel with match percentage comparison.
14. **2 Truths and a Lie (`TWO_TRUTHS_AND_A_LIE`)**: Player submits 3 statements (2 true, 1 lie), others vote to spot the lie.

---

## Architectural Deliverables

1. **Shared Types (`shared/game-types/index.ts`)**:
   - Defined states, actions, results, and payloads for all 14 party game titles.
2. **Backend Game Engines (`server/src/games/party/`)**:
   - Created all 14 authoritative game engines implementing `GameEngine<TState, TAction, TResult>`.
   - Registered all engines in `MatchManager` (`server/src/games/match.manager.ts`).
3. **Automated Verification Suite (`server/test-party-games.js`)**:
   - 37 unit and integration tests covering all 14 engines and `MatchManager.startMatch`.
   - **100% Pass Rate (37 Passed, 0 Failed)**.
4. **Mobile Client Screen (`mobile/screens/games/PartyGameScreen.tsx`)**:
   - Implemented dynamic stage renderers for all 14 party games.
   - Strictly adherent to Marvie iOS UI Kit specifications (25px radius, 54px buttons, dark slate `#2A3C44`, `#30444E`, `#3D505A`).
   - Pure vector SVGs with zero emojis.
   - Integrated with Socket.IO match flow, real-time sync, and rematch mechanics.
5. **Mobile Navigation & Discovery**:
   - Routed `partyGame` in `mobile/App.tsx`.
   - Added all 14 party games to `JoinRoomModal.tsx` selection chips.
   - Added featured showcase game cards in `ThemeShowcaseScreen.tsx`.
6. **Zero Regressions**:
   - `tsc --noEmit` on mobile: **0 errors**.
   - `npx expo export -p android`: **Clean Hermes bytecode export (AppEntry .hbc, 2.2MB)**.
   - Full regression test suites across Phases 08–14 passing (350+ total game engine tests).
