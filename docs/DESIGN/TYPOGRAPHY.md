# 🔤 Typography System & Hierarchy

## Font Families
- Primary sans-serif: `Inter`, `Plus Jakarta Sans`, or platform native system sans-serif (`-apple-system`, `Roboto`).
- Font weights utilized: `400` (Regular), `500` (Medium), `600` (Semibold), `700` (Bold), `800` (Heavy).

## Typography Scale

| Token | Size | Line Height | Weight | Letter Spacing | Use Case |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `display` | 32pt | 40pt | 800 (Heavy) | -0.5px | Win screens, score counters, hero introductions |
| `headingLarge` | 24pt | 32pt | 700 (Bold) | -0.3px | Screen main titles, major sheet headers |
| `headingMedium` | 20pt | 26pt | 700 (Bold) | -0.2px | Sub-sections, card titles, featured game headings |
| `headingSmall` | 18pt | 24pt | 600 (Semibold) | 0px | User row names, small cards, modal titles |
| `bodyLarge` | 16pt | 24pt | 400 / 500 | 0px | Chat message contents, player bios |
| `bodyMedium` | 14pt | 20pt | 400 (Regular) | 0px | Standard list items, descriptions, room details |
| `bodySmall` | 13pt | 18pt | 500 (Medium) | +0.1px | Sub-captions, system notifications |
| `caption` | 12pt | 16pt | 500 (Medium) | +0.2px | Timestamps, counters, story timers |
| `label` | 11pt | 14pt | 600 (Semibold) | +0.5px (Caps) | Tag pills, badge numbers, online pills |
| `button` | 15pt | 20pt | 600 (Semibold) | 0px | Button action labels |

## Design Rules
- **No Text Clipping**: All containers support dynamic font scaling with proper line clamping (`numberOfLines` + `ellipsizeMode="tail"`).
- **Proportional Line Heights**: Line height is never less than 1.25x the font size to ensure effortless readability on mobile devices.
- **Hierarchy Differentiation**: Never differentiate hierarchy purely by font size; combine weight adjustments (`700` vs `400`) and color opacity (`textPrimary` vs `textSecondary`).
