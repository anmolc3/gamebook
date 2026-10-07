# 📐 Design System Architecture (Marvie Sketch Adaptation)

## Overview
This design system translates the visual sophistication, soft layering, rounded containers, and harmonious dark charcoal/slate palette of the **Marvie iOS UI Kit** (`download_marvie-ios-ui-kit-for-sketch.sketch`) into an original, high-performance social multiplayer gaming platform.

---

## Core Architectural Tenets
1. **Single Source of Truth**: All components consume values exclusively through centralized token interfaces (`mobile/theme/tokens.ts`).
2. **Context-Aware Theming**: Deep support for 5 deliberate theme families with dedicated Light and Dark variants, led by **Marvie Slate / Mint**.
3. **Adaptive Form & Layout Standards**:
   - Card container radius standard: **25px** (`Rectangle Copy 25 fixedRadius=25`).
   - Button standard: **54px height** with **14px border radius** and trailing chevron (`Next_Button` / `Sign_Button`).
   - Text Input standard: **54px height** with **14px border radius** and a **36x36** tinted icon container with **12px radius** (`Name_Field`).
   - 5-Element Navigation: **25px top border radius**, **70px height** (84px with safe area), active indicator dot, and center floating action.
   - Statistics Cards: **25px radius** with signature **14x8px bullet pills** (radius 4px) and accent color coding.
4. **Zero-Emoji UI Policy**: Centralized SVG vector iconography across every single touchpoint (`mobile/icons/index.tsx`).

---

## Spacing & Grid System
Based on a modular 4pt/8pt grid:
- `xxs`: 2px
- `xs`: 4px
- `sm`: 8px
- `md`: 12px
- `lg`: 16px (Standard gutter & padding)
- `xl`: 20px
- `xxl`: 24px (Standard card padding)
- `xxxl`: 32px (Section gaps)
- `massive`: 48px

---

## Corner Radii Tokens
- `none`: 0px
- `xs`: 4px
- `sm`: 8px
- `md`: 12px (Inner input icon boxes, nested badges)
- `lg`: 14px (Standard buttons, form fields, pills)
- `xl`: 20px (Medium cards)
- `card`: 25px (Marvie signature card container: game cards, hero banners, room cards)
- `sheet`: 25px (Marvie bottom navigation sheet, modal dialogs)
- `full`: 9999px (Pills, avatar circles, active indicator dots)

---

## Elevation & Shadow Tokens
- `none`: No shadow
- `soft`: Ambient 1px Y, 6px blur, 10% opacity (`#0000001A`)
- `card`: Elevation 1px Y, 14px blur, 18% opacity (`#0000002E`)
- `elevated`: Floating action 4px Y, 18px blur, 22% opacity (`#00000038`)
- `modal`: Overlay modal 8px Y, 28px blur, 30% opacity (`#0000004D`)

---

## Component Standards & Marvie Mapping

| UI Element | Marvie Sketch Reference | Dimensions & Radii | Color & Styling |
| :--- | :--- | :--- | :--- |
| **Hero Card** | `Green_Big_Card` | 25px radius, 20px padding | Mint/Slate fill, live status pulse, quick match CTA |
| **Primary Button** | `Next_Button` / `Sign_Button` | 54px height, 14px radius | Primary fill (`#3ED598`), bold 16pt, trailing chevron |
| **Secondary Button** | `Ghost_Button` / `Outline` | 54px height, 14px radius | Tinted fill or 1.5px border, bold 15pt |
| **Text Input** | `Name_Field` | 54px height, 14px radius | 36x36 tinted left icon box (radius 12), crisp placeholder |
| **Statistics Card** | `Stats_Card` | 25px radius, 14px padding | 14x8px bullet pill (radius 4), bold count, trend badge |
| **Bottom Navigation**| `5_Elements_Navigation` | 70px height, 25px top radius | 5 items, active dot indicator, elevated center Play action |
| **Game Card** | `Game_Card` | 25px radius, 16px padding | 52x52 tinted icon box, player count tag, 42px play button |
