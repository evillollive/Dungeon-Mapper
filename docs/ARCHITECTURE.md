# Architecture

Dungeon Mapper is a client-only React + TypeScript + Vite application.

## High-level layers

- **UI components (`src/components`)**: toolbar, dialogs, canvas, inspector, and shell layout
- **State hooks (`src/hooks`)**: map state/history, level management, persistence, and input helpers
- **Domain utilities (`src/utils`)**: generators, rendering, rasterizers, fog/FOV, export, and art systems
- **Type model (`src/types/map.ts`)**: core map/project schema shared across features
- **Themes (`src/themes`)**: tile rendering logic and theme-specific visual behavior

## Core flow

1. User actions trigger callbacks in UI components.
2. Hooks update project/map state.
3. Canvas rendering uses derived render data from map + overlays.
4. Persistence auto-saves to IndexedDB.
5. Export paths render to PNG/SVG/JSON outputs.

## Key subsystems

- **MapCanvas**: interaction-heavy canvas view for drawing, selection, overlays, and navigation
- **useMapState**: central state transitions for tiles, notes, tokens, room shapes, and rivers
- **Generators**: deterministic seeded generation pipeline for rooms, terrain, cavern, and village
- **Room/River vector layers**: editable vectors rasterized onto the tile grid for final rendering
- **Accessibility**: keyboard shortcuts, focus-visible behavior, aria-live announcements, and contrast helpers

## Testing strategy

- Unit tests for pure utilities and generators
- Integration-style component tests for major UI behavior
- Regression tests for rendering/export paths and roadmap audit guardrails
