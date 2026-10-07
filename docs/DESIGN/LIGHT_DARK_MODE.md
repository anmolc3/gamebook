# 🌓 Light & Dark Mode Execution Strategy

## Philosophy: Deliberate Design, Not Inversion
Inverting colors directly (e.g., `#FFFFFF` -> `#000000`) results in harsh contrast, desaturated accents, and visual fatigue.

Our dual-mode strategy treats Light and Dark as **two distinct artistic interpretations** of each theme family.

---

## Technical Architecture

```typescript
export interface ModeTokens {
  background: string;
  backgroundSecondary: string;
  surface: string;
  surfaceElevated: string;
  surfacePressed: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  divider: string;
}

export interface CompleteTheme {
  id: ThemeId;
  name: string;
  light: ModeTokens & BrandAccentTokens;
  dark: ModeTokens & BrandAccentTokens;
}
```

---

## Mode Calibration Rules

### 1. Light Mode Rules
- **Canvas**: Subtle off-white warmth (e.g., `#FFF9F6` in Coral, `#F8F4E9` in Violet Dusk) prevents sterile hospital-white glare.
- **Card Surfaces**: Pure `#FFFFFF` for primary cards creates gentle contrast against tinted canvas.
- **Shadows**: Soft, multi-stop ambient shadows (`rgba(0, 0, 0, 0.06)`).
- **Borders**: Translucent pastel tints (`rgba(0, 0, 0, 0.05)` to `rgba(0, 0, 0, 0.08)`).

### 2. Dark Mode Rules
- **Canvas**: Deep tinted darks (e.g., `#18080C` for Coral, `#12031D` for Moon Violet), never pure `#000000` (which causes OLED smearing and harsh text haloing).
- **Card Surfaces**: Layered elevated darks (`#240F15`, `#210635`) that provide clear visual grouping.
- **Shadows**: Subtle drop shadows reinforced by **1px translucent highlight borders** (`rgba(255, 255, 255, 0.08)`) to establish visual edge definition in dark environments.
- **Text Luminance**: Pure white is reserved for emphasis; body text uses calibrated off-whites (`#FCEEF4`, `#FFEBEF`) to minimize eye fatigue during extended gaming sessions.

---

## Seamless Transitioning
- Switching themes or toggling dark mode triggers a fluid 200ms ease-in-out color interpolation without screen re-mounting or flicker.
- Status bar icon styles (`dark-content` vs. `light-content`) synchronize automatically with active mode tokens.
