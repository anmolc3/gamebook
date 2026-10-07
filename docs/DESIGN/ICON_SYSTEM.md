# 🛡️ Icon System Architecture

## Strict Policy: Zero Emojis in Interface Controls
Interface actions, buttons, list headers, and navigation bars must **never** use Unicode emoji characters as UI icons. Every visual symbol is an SVG vector asset drawn from the centralized icon registry.

## Technical Rules
1. **Color Inheritance**: SVG icons must default to `stroke="currentColor"` or `fill="currentColor"` so they naturally inherit parent button and text colors.
2. **Stroke Consistency**: Standard icons utilize a `2px` stroke weight (calibrated on a 24x24 viewBox).
3. **Touch Targets**: While icon vectors are 20px–24px, all parent `IconButton` pressable hit targets are padded to a minimum of **44x44pt** (or 48x48pt for Android accessibility).

## Central Icon Manifest

### Navigation
- `Home`: 5-point home outline
- `Gamepad`: Modern ergonomic controller silhouette
- `Users`: Dual silhouette friend network
- `ChatBubble`: Clean rounded message bubble with tail
- `User`: Single user profile silhouette

### Action & Controls
- `Search`: Modern rounded magnifying glass
- `Settings`: 6-tooth geometric gear
- `Bell`: Notification bell with optional badge dot indicator
- `Plus`: Clean centered cross
- `Close`: Balanced X mark
- `ChevronLeft` / `ChevronRight` / `ChevronDown`
- `Send`: Angled paper plane
- `Check` / `CheckDouble`: Single/double message delivery indicators
- `MoreVertical`: 3-dot overflow menu
- `Copy`: Overlapping dual rectangular sheets
- `Edit`: Stylized angled pencil

### Gaming & Competition
- `Trophy`: Clean victory chalice
- `Star`: Symmetrical 5-point star
- `Dice`: Isometric perspective 6-sided die
- `Crown`: 3-point host/winner crown
- `Target`: Concentric aiming circles
- `Shield`: Security / safe-zone emblem
- `Flame`: Streak counter flame
- `RefreshCw`: Rematch circular arrows

### Media & Moderation
- `Camera`: Modern viewfinder silhouette
- `Image`: Landscape photo tile
- `Video`: Film camera outline
- `Eye`: Viewer count eye
- `Volume2` / `VolumeX`: Sound toggles
- `ShieldAlert`: Safety report flag
- `Slash`: Action restriction / Block
