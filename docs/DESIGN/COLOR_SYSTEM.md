# 🎨 Color System & Semantic Roles (Marvie Adaptation)

## Core Strategy
Colors are extracted directly from the **Marvie iOS UI Kit** (`download_marvie-ios-ui-kit-for-sketch.sketch`) and categorized into three layers:
1. **Marvie Foundation & Accents**: Charcoal/dark blue base surfaces, mint/teal primary, and vibrant secondary accents.
2. **Semantic Tokens**: Contextual functional tokens (`primary`, `surface`, `textPrimary`, `border`).
3. **Status & Feedback Tokens**: Universal feedback indicators (`online`, `error`, `success`, `warning`).

---

## Foundation Palette (Marvie Dark Slate)
Extracted directly from the Sketch document color assets and master symbols:

| Color Name | Hex Code | Usage |
| :--- | :--- | :--- |
| **Marvie Dark Base** | `#2A3C44` | Canvas background, deep app container |
| **Marvie Dark Elevated**| `#30444E` | Cards, modal sheets, elevated surfaces |
| **Marvie Slate Border** | `#3D505A` | Input borders, card outlines, subtle dividers |
| **Marvie Muted Text** | `#96A7AF` | Secondary labels, descriptions, icons |
| **Marvie Pure White** | `#FFFFFF` | Primary headers, active icon fills |

---

## Marvie Accent Palette

| Accent | Hex Code | Tint Fill (Dark) | Tint Fill (Light) | Usage |
| :--- | :--- | :--- | :--- | :--- |
| **Mint / Teal** | `#3ED598` | `#286053` | `#D4F5E9` | Primary CTA, active nav dots, win indicators |
| **Amber / Gold** | `#FFC542` | `#625B39` | `#FEF3D9` | Stats highlights, coins, ranked tiers |
| **Orange** | `#FF974A` | `#624B39` | `#FFEEDB` | Popular badges, high energy arenas |
| **Coral / Crimson** | `#FF575F` | `#623A42` | `#FFE5E7` | Match alerts, hearts, trophies |
| **Royal Blue** | `#0062FF` | `#1A3B66` | `#E1ECFF` | Direct messages, system announcements |
| **Violet** | `#755FE2` | `#352F66` | `#ECE9FB` | Tournament brackets, VIP perks |

---

## Semantic Surface Hierarchy
| Token | Purpose | Light Mode Rule | Dark Mode Rule |
| :--- | :--- | :--- | :--- |
| `background` | Canvas background | `#EDF1FA` (Marvie Soft Blue-Grey) | `#2A3C44` (Marvie Dark Slate) |
| `backgroundSecondary` | Grouped list background | `#E3E8F4` | `#24333B` |
| `surface` | Cards, rows, items | `#FFFFFF` | `#30444E` |
| `surfaceElevated` | Modals, floaters | `#FFFFFF` | `#374E5A` |
| `surfacePressed` | Active touch feedback | `#E2E8F0` | `#3A525E` |

---

## Text Contrast Tokens
- `textPrimary`: `#FFFFFF` (Dark) / `#1F2E35` (Light) — meets WCAG AAA 7:1 for headers.
- `textSecondary`: `#96A7AF` (Dark) / `#5F737E` (Light) — readable metadata, WCAG AA compliant.
- `textMuted`: `#6A7B84` (Dark) / `#91A3AB` (Light) — inactive tabs, timestamps.
- `textDisabled`: `#485962` (Dark) / `#B8C5CB` (Light) — inactive form fields and disabled buttons.
- `textOnPrimary`: `#1A3B34` (on `#3ED598` mint) / `#FFFFFF` (on dark/deep fills) — crisp readability.
