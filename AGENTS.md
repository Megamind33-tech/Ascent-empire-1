# AGENTS.md

See `AGENT.md` for planning/review/testing operating rules for this project.

## Cursor Cloud specific instructions

Ascent Realms is a **web-first browser game** (Vite + HTML5 Canvas 2D prototype, with a legacy Babylon.js 3D runtime). There is a single frontend service; there is no backend, database, or auth.

### Running

- Dev server: `npm run dev` (Vite, serves on `http://localhost:5173`, `--host` enabled). This is the command to use during development (hot reload).
- Production build: `npm run build` (outputs to `dist/`). `npm run preview` serves the built output on port `4173`.
- The update script already runs `npm install`, so dependencies are present on startup.

### Two runtime modes (non-obvious)

The entry point (`src/main.js`) selects a mode from the `mode` query parameter:

- Default (`http://localhost:5173/`): legacy Babylon.js 3D runtime (`runGameBootstrap`). Heavy — pulls in `@babylonjs/core` and `@dimforge/rapier3d-compat`, so first load takes several seconds (shows a loading screen with a spinning cube before the scene renders).
- Canvas prototype (`http://localhost:5173/?mode=canvas-prototype`): the actively-developed 2D isometric city-builder slice (`runCanvasVerticalSlice`). Loads fast. Controls: `LMB` place tile, `Tab` cycles build tool (road/housing/farm/etc.), `RMB` drag to pan, wheel to zoom, `S` save, `L` load, `E` trigger election. Save/load uses `localStorage`.

### Testing / linting

- There is **no automated test suite and no lint/format tooling** configured (no eslint/prettier/vitest/jest). "Verify changes" per `AGENT.md` means running `npm run build` and manually exercising the app in the browser.

### Notes

- `scripts/download-models.mjs` downloads 3D asset models; it is optional and NOT required to run either mode. Do not add it to startup.
- The production build intentionally drops `console`/`debugger` (see `vite.config.js`), so use `npm run dev` when you need console logs.
