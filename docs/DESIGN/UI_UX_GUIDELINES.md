# 📱 UI / UX Guidelines & Interaction Patterns

## 1. Ergonomics & Reachability
- **Thumb Zone**: Primary actions (Dice Roll in Ludo, Send in Chat, Ready in Lobby, Tab Switcher) live in the lower half of the screen.
- **Top Bar**: Reserved for contextual navigation, profile access, and non-blocking notification status.

## 2. Dynamic States & Micro-interactions
- **Touch Feedback**: Every pressable element provides immediate tactile feedback:
  - Down-press: Instant scale to `0.97` or subtle opacity reduction (`0.85`).
  - Release: Crisp spring return.
- **Loading States**:
  - Never display blank screens.
  - Employ shimmer skeletons that follow the exact card layout of the content being loaded.
- **Empty States**:
  - Beautiful centered illustration/SVG icon.
  - Clear message ("No active game invitations").
  - Primary CTA ("Start a Match", "Find Friends").

## 3. Game UX Guidelines

### Ludo Arena Usability
- **Board Clarity Above Decoration**: While the board reflects active theme accents, player paths must remain immediately distinguishable.
- **Active Turn Indicator**: The current player’s pod glows with an animated theme-colored border pulse and timer bar.
- **Valid Move Highlighting**: Only tokens with valid moves highlight and bounce subtly to reduce user cognitive load.

### Tic-Tac-Toe Arena Usability
- **Instant Recognition**: Player marks (X and O) must have high contrast against cell surfaces.
- **Winning Line Animation**: Vector SVG stroke animates smoothly across the 3 winning cells upon completion.
- **Immediate Rematch**: Post-game modal slides from bottom with one-tap "Rematch" or "Return to Lobby".

## 4. Chat & Social Interaction
- **Embedded Interactive Cards**: Game invitations inside chat are actionable components, not plain text links.
- **Optimistic UI**: Messages render in the transcript immediately with a clock/single tick indicator before server roundtrip confirmation.
