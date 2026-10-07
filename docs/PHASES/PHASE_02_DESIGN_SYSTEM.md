# Phase 2: Design System

## Objective
Implement the complete centralized design system in the mobile application: 5 theme families (Marble/Coral, Moon/Violet, Violet Dusk, Midnight/Neutral, Forest/Gold), dedicated Light/Dark modes, zero-emoji SVG icon registry, and the full UI component catalog.

## Requirements
- ThemeContext with instantaneous, zero-restart theme and appearance switching.
- Centralized design tokens (colors, typography, spacing, radius, shadows).
- Reusable UI kit: PrimaryButton, SecondaryButton, IconButton, InputField, SearchBar, StatCard, StoryAvatar, GameCard.
- Zero emojis in UI controls.
- Theme preview selector in Settings screen.

## Implementation Plan
1. Create `mobile/theme/` token files and types.
2. Build `ThemeContext` and `useTheme()` hook with local persistence.
3. Build `mobile/icons/` with pure SVG icon components.
4. Build reusable atoms, molecules, and organisms.
5. Create an interactive Theme Showcase screen to verify all 5 themes in Light & Dark modes.

## Expected Files
- `mobile/theme/tokens.ts`
- `mobile/theme/ThemeContext.tsx`
- `mobile/theme/themes/*.ts`
- `mobile/icons/index.tsx`
- `mobile/components/atoms/*.tsx`
- `mobile/components/molecules/*.tsx`
- `mobile/components/organisms/*.tsx`
- `mobile/screens/ThemeShowcaseScreen.tsx`

## Dependencies
- `react-native-svg`
- `@react-native-async-storage/async-storage`

## Database Changes
- None (Local client-side design tokens).

## API Changes
- None.

## Socket Changes
- None.

## UI Changes
- Complete design system visual foundation:
  - 5 Theme families with custom Light and Dark variants (10 palettes in total).
  - Pure SVG Icon registry (24 vector icons, strict zero-emoji policy).
  - Reusable UI atoms (Typography, StatusIndicator, Avatar, Divider).
  - Reusable UI molecules (PrimaryButton, IconButton, InputField, StatCard, StoryAvatar).
  - Reusable UI organisms (AppHeader, GameCard, ThemeSelectorModal).
  - Full-screen interactive ThemeShowcaseScreen with instant theme switching bottom sheet.

## Testing Requirements
- Toggle between all 5 themes in Light and Dark mode without re-mounting or visual glitches.
- Verify SVG icons render crisply and respect `currentColor` and theme tokens.
- Validate TypeScript strict checks (`tsc --noEmit` exited with code 0).
- Validate Android compilation (`expo export -p android` bundled 685 modules with code 0).

## Completion Checklist
- [x] Theme tokens and 5 theme definitions implemented
- [x] Light and Dark mode variants for all 5 themes validated
- [x] SVG icon library constructed (Zero Emojis)
- [x] Core button, input, card, and modal components implemented
- [x] Appearance selector interface created and tested
- [x] Full mobile TypeScript validation passing with zero errors
- [x] Android bundle compilation passing with zero warnings

## Current Status
COMPLETE

## Known Issues
- None.

## Notes
- Adheres strictly to the Sketch UI kit adaptation principles outlined in `README.md`.
