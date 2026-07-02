# AGENTS.md

See `AGENT.md` for project skills and operating rules (planning, testing, code review, asset-manifest guidance).

## Cursor Cloud specific instructions

- **Product**: `ascent-realms` is a single, fully client-side browser game (Vite + Babylon.js). There is **no backend, database, or container** — game state persists in browser `localStorage`. Only one service (the Vite dev server) is needed to run/test it end to end.
- **Dependencies**: `npm install` (npm lockfile present). This is handled by the startup update script.
- **Run (dev)**: `npm run dev` serves the game at `http://localhost:5173/` (Vite binds `--host`). Leave it running; it hot-reloads.
- **Two runtime modes** (selected via URL query param, see `src/main.js`):
  - Legacy Babylon.js 3D runtime: `http://localhost:5173/`
  - Canvas 2.5D vertical-slice prototype (newer direction, lighter): `http://localhost:5173/?mode=canvas-prototype`
- **Build**: `npm run build` (outputs `dist/`). The build emits Vite "dynamically imported ... also statically imported" warnings and >500 kB chunk-size warnings for the `babylon`/`rapier` vendor bundles — these are expected/benign, not errors.
- **Preview a build**: `npm run preview` serves `dist/` at `http://localhost:4173/`.
- **No test or lint scripts** are defined in `package.json`; there is no automated test suite. Validate changes by building and by loading the game in the browser (place tiles, watch the HUD economy indicators update).
- **In-game controls** (canvas prototype): `Tab` cycles the build tool (road/housing/farm/factory/power/water); click a buildable land tile to place. Debug overlay toggle: `Ctrl+Shift+Alt+0`.
- **Optional assets**: `node scripts/download-models.mjs` fetches CC0 GLB models over the internet for the legacy 3D mode; safe to skip (skips existing files). Not needed for the canvas prototype.
