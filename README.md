# Ascent Realms

Ascent Realms is evolving into **ASCENT: Nation Builder / Political RTS / City-Builder Backbone** with a web-first architecture:

- Runtime: Vite + browser platform
- Rendering: HTML5 Canvas 2D (2.5D isometric illusion)
- UI: HTML/CSS overlays
- Long-term mobile packaging: Capacitor

## Current Prototype Modes

### 1) Legacy runtime (existing Babylon-based implementation)
```bash
npm run dev
```

### 2) Canvas vertical-slice prototype (new direction)
Open the dev app with this query parameter:

```text
?mode=canvas-prototype
```

Example local URL:

```text
http://localhost:5173/?mode=canvas-prototype
```

The Canvas prototype currently validates key phase-1 goals:
- Isometric map rendering with natural terrain (organic coastlines, oceans, rivers, hills, mountains, plains) plus natural props, terrain lighting, cliff relief, and ground-matched valley texturing and continuous river/ground overlays
- Realistic-style isometric buildings with layered masses, roof/side shading, and grounded shadows
- Blue-sky atmosphere layer with moving sun/daylight cycle, horizon mountain silhouettes, haze, and mountain fog
- Camera pan and zoom
- Tile placement loop (road/housing/farm/factory/power/water) on buildable land
- Basic economy indicators (treasury, inflation, unemployment)
- Political pressure signal (popularity)
- Election/protest event feed
- Save/load through localStorage

## Run
```bash
npm install
npm run dev
npm run build
```
