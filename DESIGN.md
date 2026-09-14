# dlME Design System

## Visual Direction
High-fidelity Windows application with a macOS-inspired interaction model. Strict dark mode with OLED black foundations and high-contrast electric mint accents.

## Color Palette (OKLch)
- **Background**: `oklch(0% 0 0)` (#000000) - Pure OLED Black
- **Surface**: `oklch(12% 0 0)` (#121212) - Deep Charcoal
- **Border**: `oklch(16% 0 0)` (#1A1A1A) - Subtle Depth
- **Foreground**: `oklch(98% 0 0)` (#F9F9F9) - Near White
- **Muted**: `oklch(65% 0 0)` (#8E8E93) - Metadata Gray
- **Accent**: `oklch(85% 0.22 160)` (#00FFA3) - Electric Mint Green

## Typography
- **Display/UI**: 'Segoe UI Variable', 'Inter', system-ui, sans-serif
- **Mono**: 'JetBrains Mono', 'SF Mono', ui-monospace, monospace

## Posture Rules
- **Radii**: 8px for panels, 999px for pill buttons (macOS style)
- **Borders**: 1px solid `--border`
- **Shadows**: Soft, deep feather shadows for elevated panels
- **Interactions**: Spring-based transforms, 0.2s ease-out transitions, focus-visible mint rings

## Product Website

- The website extends the application interface rather than introducing a separate campaign palette.
- OLED black and charcoal surfaces remain continuous between sections; structure comes from surface steps and hairline borders instead of large light bands.
- Electric mint is the only high-energy brand accent. Warning and danger colors appear only for truthful product states.
- Segoe UI Variable carries headings and body copy. Cascadia Mono is reserved for versions, logs, states, checksums, and build evidence.
- Motion must explain product behavior: progress, verification, recovery, filing, and live status. Reduced-motion visitors receive the complete static state.
