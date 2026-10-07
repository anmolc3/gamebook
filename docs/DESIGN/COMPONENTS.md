# 🧩 Component Specifications & Props Contracts

Every component is modular, accessible, strictly typed in TypeScript, and consumes theme tokens.

---

## 1. Atoms

### `SvgIcon`
- **Props**: `name: IconName`, `size?: number` (default 24), `color?: string` (default `tokens.colors.textPrimary`), `strokeWidth?: number` (default 2).
- **Behavior**: Uses `currentColor` or explicit theme token; vector-only.

### `Avatar`
- **Props**: `uri?: string`, `size?: 'sm' (32) | 'md' (44) | 'lg' (64) | 'xl' (96)`, `status?: 'online' | 'offline' | 'inGame' | 'away'`, `fallbackText?: string`.
- **Styling**: Rounded full circle, subtle 1.5px border matching container background to create clean detachment from overlapping content.

### `StatusIndicator`
- **Props**: `status: PresenceStatus`, `size?: number` (default 10), `showLabel?: boolean`.
- **Accessibility**: Includes shape/ring distinction or accessible label for non-color-only compliance.

---

## 2. Molecules

### `PrimaryButton`
- **Props**: `label: string`, `icon?: IconName`, `onPress: () => void`, `loading?: boolean`, `disabled?: boolean`, `variant?: 'filled' | 'tinted' | 'outline' | 'danger'`.
- **Specifications**: Height 52px, radius `tokens.radius.lg` (16px), active scale press down (`0.97`).

### `InputField`
- **Props**: `label?: string`, `placeholder: string`, `value: string`, `onChangeText: (v: string) => void`, `error?: string`, `leftIcon?: IconName`, `secureTextEntry?: boolean`.
- **Specifications**: Height 52px, radius 14px, background `tokens.colors.surface`, border 1px `tokens.colors.border`, active border `tokens.colors.primary`.

### `SearchBar`
- **Props**: `query: string`, `onChangeText: (v: string) => void`, `onClear: () => void`, `placeholder?: string`.
- **Specifications**: Height 44px, radius `tokens.radius.full`, left search icon, right clear icon button when non-empty.

---

## 3. Organisms

### `AppHeader`
- **Structure**:
  - Left slot: Back arrow OR Current user avatar with presence indicator.
  - Title slot: Center or left-aligned title + optional subtitle.
  - Right slot: Action icon buttons (Notification bell, Theme toggle, Settings).

### `StoryCard` / `StoryAvatar`
- **States**:
  - `unviewed`: Animated multi-stop gradient border ring matching theme primary/accent.
  - `viewed`: Subdued translucent grey border ring.
  - `addStory`: Dashed or themed plus icon overlay.

### `GameCard`
- **Usage**: Featured Ludo & Tic-Tac-Toe tiles.
- **Specifications**: Radius 24px, subtle gradient wash or elevated surface, game illustration/vector banner, player count pill, and "Play Now" action trigger.

### `ChatMessageBubble`
- **Outbound**:
  - Alignment: Right.
  - Background: `tokens.colors.primary`.
  - Text: High-contrast `tokens.colors.textOnPrimary`.
  - Radius: Top-left, top-right, bottom-left 18px; bottom-right 4px.
  - Status: Double checkmarks (grey -> primary/blue on read).
- **Inbound**:
  - Alignment: Left.
  - Background: `tokens.colors.surfaceElevated`.
  - Text: `tokens.colors.textPrimary`.
  - Radius: Top-left 4px; top-right, bottom-left, bottom-right 18px.

### `GameRoomCard`
- **Lobby Item**:
  - Host avatar and room title.
  - Player slots representation (e.g., `2/4 Ready`).
  - Lock icon for password-protected rooms.
  - Direct "Join" button.
