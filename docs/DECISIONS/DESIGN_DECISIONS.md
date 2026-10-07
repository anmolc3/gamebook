# 🎨 Design Decision Records (DDR)

## DDR-001: Strict Zero-Emoji UI Icon Policy
- **Context**: Unicode emojis render inconsistently across Android OS versions and look amateurish in professional applications.
- **Decision**: All UI icons must be vector SVG components using `currentColor`. Emojis are strictly banned from UI navigation, buttons, and status indicators.

## DDR-002: Deliberate Light and Dark Mode Design
- **Context**: Inverting colors mechanically results in eye strain, muddy surfaces, and poor game contrast.
- **Decision**: Every theme family has hand-crafted Light and Dark variants with custom-tuned surface luminance and text contrast.
