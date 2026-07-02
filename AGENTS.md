# AGENTS.md

See `AGENT.md` for planning/review/testing operating rules for this project.

## Cursor Cloud specific instructions

Ascent Realms is a **web-first browser game** (Vite + HTML5 Canvas 2D prototype, with a legacy Babylon.js 3D runtime). There is a single frontend service; there is no backend, database, or auth.

### Running

- Dev server: `npm run dev` (Vite, serves on `http://localhost:5173`, `--host` enabled). This is the command to use during development (hot reload).
- Production build: `npm run build` (outputs to `dist/`). `npm run preview` serves the built output on port `4173`.
- The update script already runs `npm install`, so dependencies are present on startup.

### Single 3D runtime (non-obvious)

The entry point (`src/main.js`) boots one experience: the Babylon.js 3D runtime (`runGameBootstrap`). The old `?mode=canvas-prototype` 2D isometric slice has been removed — there is no longer a mode switch.

- URL: `http://localhost:5173/`. Heavy — pulls in `@babylonjs/core` and `@dimforge/rapier3d-compat`, so first load takes several seconds (cinematic intro ~3s → loading screen → async GLB asset load → world build) before the city is fully populated.
- Camera: `ArcRotateCamera` (orbit). Mouse drag rotates, right-drag/`WASD` pans, wheel zooms, `Home` (or the on-screen `⊡` fit-all button, bottom-left) resets to a clean overhead framing of the city. The game also re-asserts a good framing on the first rendered frame (`src/runtime/gameLoop.js`).
- Building placement: pick a build action in the left tray (sets `state.selectionMode`), then click a buildable pad on the ground. Only the scattered construction pads are buildable (`metadata.buildable === true`); the base terrain is not.

### 3D rendering caveat in this VM (important)

The Babylon scene renders unreliably under this cloud VM's (software) WebGL: the viewport intermittently shows a light grey/blue or dark "empty" frame even though the console logs `First frame rendered successfully` and the world builds (50+ buildings registered). This is a long-standing, environment-sensitive issue documented across the repo's `GREY_SCREEN_*.md` audits — it is NOT specific to any recent change. When it happens, reload and/or use the `⊡` fit-all reset; on a machine with real GPU acceleration the city renders normally. The 2D HTML UI (HUD, trays, modals) always renders reliably regardless.

### Testing / linting

- There is **no automated test suite and no lint/format tooling** configured (no eslint/prettier/vitest/jest). "Verify changes" per `AGENT.md` means running `npm run build` and manually exercising the app in the browser.

### Notes

- `scripts/download-models.mjs` downloads 3D asset models; it is optional and NOT required to run either mode. Do not add it to startup.
- The production build intentionally drops `console`/`debugger` (see `vite.config.js`), so use `npm run dev` when you need console logs.
