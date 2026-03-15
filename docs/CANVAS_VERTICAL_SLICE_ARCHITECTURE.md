# Canvas Vertical Slice Architecture (Phase 1)

This document translates the ASCENT direction into an implementation-ready vertical slice.

## Goal
Deliver a mobile-conscious browser prototype that proves:
1. Premium-feeling 2.5D isometric presentation using Canvas 2D.
2. Meaningful interaction between construction, economy, and political outcomes.
3. Stable baseline architecture for future TypeScript system extraction.

## Runtime Shape
- **Entry switch:** `src/main.js` supports `?mode=canvas-prototype`.
- **Prototype module:** `src/prototype/canvasVerticalSlice.js`.
- **Render model:** variable-frame rendering + fixed simulation tick (`SIM_TICK_MS = 250`).

## Implemented Systems

### Rendering
- Isometric terrain tiles (`TILE_W=96`, `TILE_H=48`) with terrain classes (ocean/coast/river/plains/hills/mountain), continuous height, cliff-side relief between elevation steps, and terrain-matched valley face texturing, continuous river ribbon blending, and cross-tile ground mottling.
- Atmospheric sky pass with moving sun trajectory, day-light interpolation, distant mountain silhouettes, soft horizon haze, and mountain fog layers.
- Building lot foundations and multi-part isometric structures (main mass + annex variation) with roof/side shading.
- Building-type detail accents (windows, silos, pipes, smoke stack silhouette) for city-builder readability.
- Grounded direction-aware shadows and road lane markings.
- Natural props and micro-variation (trees, rocks, foam, mountain highlights) to reduce artificial flatness.
- Elevation-aware mountain mist plus world depth fog to avoid tabletop land perception.
- World-to-screen transform + camera zoom/pan.

### Input / Camera
- Left click: place currently selected tile type.
- Right drag: pan camera.
- Wheel: zoom.
- `Tab`: cycle build tools.

### Terrain Layer
- Procedural terrain generation builds a world that is not table-flat.
- Oceans and coastlines follow an irregular island mask to avoid square map corners.
- A river corridor traverses the interior.
- Hills/mountains occupy highland zones while central plains remain buildable.
- Construction is blocked on oceans, rivers, and mountain tiles to preserve landscape identity.

### Construction Loop
Build tools:
- Road
- Housing
- Farm
- Factory
- Power
- Water

Construction applies immediate treasury/debt pressure.

### Simulation Loop
At fixed tick:
- Recompute unemployment from housing/service/employment balances.
- Recompute inflation from debt, industry, and agriculture mix.
- Recompute popularity from economic stress.
- Accrue treasury from tax base minus service upkeep.
- Trigger annual election event and conditional protest events.

### Persistence
- Save key: `ascent-canvas-prototype-save` (localStorage).
- Hotkeys:
  - `S`: save
  - `L`: load

## Why this shape
This keeps the slice **small but representative** of the final game direction:
- Nation governance tension is present early.
- Construction creates economic and political consequences.
- Architecture can be progressively moved into explicit managers/systems in TypeScript without discarding gameplay logic.

## Next Implementation Steps
1. Move prototype module to `src/simulation`, `src/world`, and `src/engine` submodules.
2. Introduce TypeScript + strict types for state, events, and tile schemas.
3. Add utility coverage maps and district-level unrest gradients.
4. Add workerized economy/politics updates for mobile stability.
5. Add IndexedDB persistence fallback layer.
