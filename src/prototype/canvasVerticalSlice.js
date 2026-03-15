const TILE_W = 96;
const TILE_H = 48;
const MAP_W = 28;
const MAP_H = 28;
const SIM_TICK_MS = 250;

const TILE_TYPES = {
  GRASS: 'grass',
  ROAD: 'road',
  HOUSING: 'housing',
  FARM: 'farm',
  FACTORY: 'factory',
  POWER: 'power',
  WATER: 'water'
};

const TERRAIN_TYPES = {
  PLAINS: 'plains',
  COAST: 'coast',
  OCEAN: 'ocean',
  RIVER: 'river',
  HILLS: 'hills',
  MOUNTAIN: 'mountain'
};

const BUILD_TOOL_ORDER = [
  TILE_TYPES.ROAD,
  TILE_TYPES.HOUSING,
  TILE_TYPES.FARM,
  TILE_TYPES.FACTORY,
  TILE_TYPES.POWER,
  TILE_TYPES.WATER
];

const TERRAIN_PALETTE = {
  [TERRAIN_TYPES.PLAINS]: '#4e8a44',
  [TERRAIN_TYPES.COAST]: '#7ea25b',
  [TERRAIN_TYPES.OCEAN]: '#2d5a88',
  [TERRAIN_TYPES.RIVER]: '#3b78a9',
  [TERRAIN_TYPES.HILLS]: '#6c8751',
  [TERRAIN_TYPES.MOUNTAIN]: '#7a7a7b'
};

const BUILDING_STYLE = {
  [TILE_TYPES.HOUSING]: { h: 24, w: 0.58, d: 0.52, roof: '#d4d8de', left: '#8e99a8', right: '#6f7d8f' },
  [TILE_TYPES.FARM]: { h: 15, w: 0.68, d: 0.55, roof: '#ba7f44', left: '#8b6134', right: '#734d26' },
  [TILE_TYPES.FACTORY]: { h: 31, w: 0.66, d: 0.58, roof: '#9a9fa7', left: '#6d737d', right: '#555c66' },
  [TILE_TYPES.POWER]: { h: 28, w: 0.63, d: 0.58, roof: '#b6a369', left: '#8d7946', right: '#77653b' },
  [TILE_TYPES.WATER]: { h: 19, w: 0.62, d: 0.56, roof: '#79a9d0', left: '#4f7f9e', right: '#3f6883' }
};

export function runCanvasVerticalSlice(canvas) {
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) throw new Error('Canvas 2D context unavailable');

  const state = createInitialState();
  hydrateState(state);

  const camera = {
    x: 0,
    y: 0,
    zoom: 0.72,
    dragging: false,
    lastPointerX: 0,
    lastPointerY: 0
  };

  let currentToolIndex = 0;
  let simAccumulator = 0;
  let previousTs = performance.now();
  let dayClock = 0.22;

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(window.innerWidth * dpr);
    canvas.height = Math.floor(window.innerHeight * dpr);
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function worldToScreen(tileX, tileY) {
    const isoX = (tileX - tileY) * (TILE_W / 2);
    const isoY = (tileX + tileY) * (TILE_H / 2);
    return {
      x: isoX * camera.zoom + camera.x + window.innerWidth / 2,
      y: isoY * camera.zoom + camera.y + window.innerHeight / 2
    };
  }

  function screenToTile(screenX, screenY) {
    const localX = (screenX - window.innerWidth / 2 - camera.x) / camera.zoom;
    const localY = (screenY - window.innerHeight / 2 - camera.y) / camera.zoom;

    const tileX = Math.floor(localY / TILE_H + localX / TILE_W);
    const tileY = Math.floor(localY / TILE_H - localX / TILE_W);

    return { tileX, tileY };
  }

  function inBounds(x, y) {
    return x >= 0 && y >= 0 && x < MAP_W && y < MAP_H;
  }

  function canBuildOnTerrain(terrain) {
    return terrain.kind !== TERRAIN_TYPES.OCEAN && terrain.kind !== TERRAIN_TYPES.RIVER && terrain.kind !== TERRAIN_TYPES.MOUNTAIN;
  }

  function sampleTerrainHeight(x, y) {
    if (x < 0 || y < 0 || x >= MAP_W || y >= MAP_H) return 0;
    return state.terrain[y][x]?.height || 0;
  }

  function placeTile(x, y, type) {
    if (!inBounds(x, y)) return;

    const terrain = state.terrain[y][x];
    if (!canBuildOnTerrain(terrain)) {
      state.events.unshift('Terrain blocked: reserve oceans/rivers/mountains from construction.');
      state.events = state.events.slice(0, 4);
      return;
    }

    state.map[y][x] = type;
    state.stats.treasury -= type === TILE_TYPES.ROAD ? 12 : 55;
    state.stats.debt = Math.max(0, state.stats.debt + (state.stats.treasury < 0 ? 2 : 0));
  }

  function drawDiamond(x, y, color, alpha = 1) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x, y - TILE_H * camera.zoom * 0.5);
    ctx.lineTo(x + TILE_W * camera.zoom * 0.5, y);
    ctx.lineTo(x, y + TILE_H * camera.zoom * 0.5);
    ctx.lineTo(x - TILE_W * camera.zoom * 0.5, y);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function hashNoise(x, y) {
    const v = Math.sin((x + 1) * 127.1 + (y + 1) * 311.7) * 43758.5453;
    return v - Math.floor(v);
  }

  function shadeHex(hex, amount) {
    const value = hex.replace('#', '');
    const n = parseInt(value, 16);
    const r = clamp(((n >> 16) & 255) + amount, 0, 255);
    const g = clamp(((n >> 8) & 255) + amount, 0, 255);
    const b = clamp((n & 255) + amount, 0, 255);
    return `rgb(${r}, ${g}, ${b})`;
  }

  function drawValleyFace(points, baseHex, depth, orientation, unit) {
    const darken = orientation === 'south' ? -22 : -28;
    const faceColor = shadeHex(baseHex, darken - depth * 2.5);
    drawPoly(points, faceColor);

    const stripeColor = shadeHex(baseHex, darken - 10);
    const steps = Math.max(1, Math.floor(depth));
    ctx.strokeStyle = stripeColor;
    ctx.lineWidth = Math.max(0.8, 1.2 * unit);

    for (let i = 1; i <= steps; i += 1) {
      const t = i / (steps + 1);
      const a = points[0];
      const b = points[1];
      const c = points[2];
      const d = points[3];

      const p1x = a.x + (d.x - a.x) * t;
      const p1y = a.y + (d.y - a.y) * t;
      const p2x = b.x + (c.x - b.x) * t;
      const p2y = b.y + (c.y - b.y) * t;

      ctx.beginPath();
      ctx.moveTo(p1x, p1y);
      ctx.lineTo(p2x, p2y);
      ctx.stroke();
    }
  }

  function drawTerrainTile(tileX, tileY, baseX, baseY, terrain) {
    const height = terrain.height ?? terrain.elevation ?? 0;
    const y = baseY - height * 8 * camera.zoom;
    const baseColor = TERRAIN_PALETTE[terrain.kind] || TERRAIN_PALETTE[TERRAIN_TYPES.PLAINS];
    const noise = (hashNoise(tileX, tileY) - 0.5) * 18;

    const lightVector = { x: 0.8, y: -0.55 };
    const dx = sampleTerrainHeight(tileX + 1, tileY) - sampleTerrainHeight(tileX - 1, tileY);
    const dy = sampleTerrainHeight(tileX, tileY + 1) - sampleTerrainHeight(tileX, tileY - 1);
    const slope = clamp((dx * lightVector.x + dy * lightVector.y) * -12, -22, 22);
    const terrainColor = shadeHex(baseColor, noise + slope);

    drawDiamond(baseX, y + 12 * camera.zoom, 'rgba(0,0,0,0.28)', 0.62);
    drawDiamond(baseX, y, terrainColor);

    const southHeight = sampleTerrainHeight(tileX, tileY + 1);
    const eastHeight = sampleTerrainHeight(tileX + 1, tileY);
    const cliffSouth = Math.max(0, height - southHeight);
    const cliffEast = Math.max(0, height - eastHeight);

    if (cliffSouth > 0) {
      const drop = cliffSouth * 8 * camera.zoom;
      drawValleyFace([
        { x: baseX, y: y + TILE_H * camera.zoom * 0.5 },
        { x: baseX + TILE_W * camera.zoom * 0.5, y: y },
        { x: baseX + TILE_W * camera.zoom * 0.5, y: y + drop },
        { x: baseX, y: y + TILE_H * camera.zoom * 0.5 + drop }
      ], baseColor, cliffSouth, 'south', camera.zoom);
    }

    if (cliffEast > 0) {
      const drop = cliffEast * 8 * camera.zoom;
      drawValleyFace([
        { x: baseX - TILE_W * camera.zoom * 0.5, y: y },
        { x: baseX, y: y + TILE_H * camera.zoom * 0.5 },
        { x: baseX, y: y + TILE_H * camera.zoom * 0.5 + drop },
        { x: baseX - TILE_W * camera.zoom * 0.5, y: y + drop }
      ], baseColor, cliffEast, 'east', camera.zoom);
    }

    if (terrain.kind === TERRAIN_TYPES.OCEAN || terrain.kind === TERRAIN_TYPES.RIVER) {
      drawDiamond(baseX + 2 * camera.zoom, y - 2 * camera.zoom, 'rgba(180, 220, 255, 0.18)', 0.8);
    }

    if (terrain.kind === TERRAIN_TYPES.MOUNTAIN) {
      ctx.fillStyle = 'rgba(230, 230, 236, 0.55)';
      ctx.beginPath();
      ctx.moveTo(baseX, y - 18 * camera.zoom);
      ctx.lineTo(baseX - 8 * camera.zoom, y - 4 * camera.zoom);
      ctx.lineTo(baseX + 6 * camera.zoom, y - 5 * camera.zoom);
      ctx.closePath();
      ctx.fill();
    }

    drawTerrainProps(tileX, tileY, baseX, y, terrain);
    drawMountainFog(tileX, tileY, baseX, y, terrain);

    return y;
  }


  function drawTerrainProps(tileX, tileY, x, y, terrain) {
    const n = hashNoise(tileX * 3, tileY * 5);
    const unit = camera.zoom;

    if (terrain.kind === TERRAIN_TYPES.PLAINS && n > 0.78) {
      ctx.fillStyle = 'rgba(38, 72, 34, 0.85)';
      ctx.beginPath();
      ctx.arc(x - 4 * unit, y - 9 * unit, 4 * unit, 0, Math.PI * 2);
      ctx.arc(x + 1 * unit, y - 12 * unit, 5 * unit, 0, Math.PI * 2);
      ctx.arc(x + 6 * unit, y - 9 * unit, 4 * unit, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#4f3f2c';
      ctx.fillRect(x, y - 7 * unit, 1.8 * unit, 5 * unit);
    }

    if (terrain.kind === TERRAIN_TYPES.HILLS && n > 0.62) {
      ctx.fillStyle = 'rgba(110, 99, 82, 0.7)';
      ctx.beginPath();
      ctx.ellipse(x + 2 * unit, y - 2 * unit, 5 * unit, 3 * unit, -0.2, 0, Math.PI * 2);
      ctx.fill();
    }

    if (terrain.kind === TERRAIN_TYPES.COAST) {
      ctx.strokeStyle = 'rgba(235, 245, 255, 0.45)';
      ctx.lineWidth = Math.max(0.8, 1.4 * unit);
      ctx.beginPath();
      ctx.moveTo(x - 16 * unit, y + 1 * unit);
      ctx.lineTo(x - 3 * unit, y - 3 * unit);
      ctx.lineTo(x + 12 * unit, y + 1 * unit);
      ctx.stroke();
    }

    if (terrain.kind === TERRAIN_TYPES.RIVER || terrain.kind === TERRAIN_TYPES.OCEAN) {
      ctx.strokeStyle = 'rgba(205, 236, 255, 0.25)';
      ctx.lineWidth = Math.max(0.8, 1.2 * unit);
      ctx.beginPath();
      ctx.moveTo(x - 12 * unit, y - 4 * unit);
      ctx.lineTo(x, y - 7 * unit);
      ctx.lineTo(x + 11 * unit, y - 4 * unit);
      ctx.stroke();
    }
  }

  function drawMountainFog(tileX, tileY, x, y, terrain) {
    if (terrain.kind !== TERRAIN_TYPES.HILLS && terrain.kind !== TERRAIN_TYPES.MOUNTAIN) return;

    const unit = camera.zoom;
    const n = hashNoise(tileX * 7, tileY * 11);
    const baseAlpha = terrain.kind === TERRAIN_TYPES.MOUNTAIN ? 0.22 : 0.12;
    const alpha = baseAlpha + n * 0.1;

    const fog = ctx.createRadialGradient(x, y - 10 * unit, 2 * unit, x, y - 10 * unit, 20 * unit);
    fog.addColorStop(0, `rgba(220, 232, 242, ${alpha})`);
    fog.addColorStop(1, 'rgba(220, 232, 242, 0)');
    ctx.fillStyle = fog;
    ctx.beginPath();
    ctx.ellipse(x, y - 8 * unit, 26 * unit, 12 * unit, 0, 0, Math.PI * 2);
    ctx.fill();
  }


  function drawLotFoundation(x, y) {
    drawDiamond(x, y - 2 * camera.zoom, '#6a6f78', 0.55);
    drawDiamond(x, y, '#5d6670', 0.85);
  }

  function drawRoadMarkings(x, y) {
    ctx.save();
    ctx.strokeStyle = 'rgba(244, 230, 164, 0.8)';
    ctx.lineWidth = Math.max(1.2, 2.2 * camera.zoom);
    ctx.setLineDash([5 * camera.zoom, 6 * camera.zoom]);
    ctx.beginPath();
    ctx.moveTo(x - TILE_W * camera.zoom * 0.22, y + 1 * camera.zoom);
    ctx.lineTo(x + TILE_W * camera.zoom * 0.22, y - 1 * camera.zoom);
    ctx.stroke();
    ctx.restore();
  }

  function drawIsoPrism(cx, cy, style) {
    const halfW = TILE_W * camera.zoom * style.w * 0.5;
    const halfD = TILE_H * camera.zoom * style.d * 0.5;
    const h = style.h * camera.zoom;

    const top = { x: cx, y: cy - h };
    const east = { x: cx + halfW, y: cy - halfD - h * 0.12 };
    const south = { x: cx, y: cy - h * 0.24 };
    const west = { x: cx - halfW, y: cy - halfD - h * 0.12 };

    const eastBase = { x: east.x, y: east.y + h };
    const southBase = { x: south.x, y: south.y + h };
    const westBase = { x: west.x, y: west.y + h };

    drawPoly([west, top, east, south], style.roof);
    drawPoly([west, south, southBase, westBase], style.left);
    drawPoly([south, east, eastBase, southBase], style.right);

    return { top, south };
  }

  function drawPoly(points, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i += 1) ctx.lineTo(points[i].x, points[i].y);
    ctx.closePath();
    ctx.fill();
  }

  function drawBuildingDetails(type, x, y, shell) {
    const unit = camera.zoom;
    if (type === TILE_TYPES.HOUSING) {
      ctx.fillStyle = '#f4c75f';
      ctx.fillRect(x - 12 * unit, shell.south.y + 4 * unit, 6 * unit, 4 * unit);
      ctx.fillRect(x + 5 * unit, shell.south.y + 4 * unit, 6 * unit, 4 * unit);
      ctx.fillStyle = '#4f5a6a';
      ctx.fillRect(x - 3 * unit, shell.top.y + 6 * unit, 8 * unit, 3 * unit);
    }

    if (type === TILE_TYPES.FARM) {
      ctx.fillStyle = 'rgba(189, 233, 122, 0.8)';
      for (let i = -2; i <= 2; i += 1) ctx.fillRect(x + i * 7 * unit, y + 7 * unit, 2 * unit, 8 * unit);
      ctx.fillStyle = '#d8ba85';
      ctx.fillRect(x - 5 * unit, shell.south.y + 2 * unit, 10 * unit, 6 * unit);
    }

    if (type === TILE_TYPES.FACTORY) {
      ctx.fillStyle = '#afb5bf';
      ctx.fillRect(x + 9 * unit, shell.top.y - 10 * unit, 5 * unit, 15 * unit);
      ctx.fillStyle = 'rgba(130, 130, 130, 0.35)';
      ctx.beginPath();
      ctx.ellipse(x + 11 * unit, shell.top.y - 14 * unit, 8 * unit, 4 * unit, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f8dc8d';
      ctx.fillRect(x - 12 * unit, shell.south.y + 3 * unit, 9 * unit, 4 * unit);
    }

    if (type === TILE_TYPES.POWER) {
      ctx.strokeStyle = '#b8c1cd';
      ctx.lineWidth = Math.max(1, 2 * unit);
      ctx.beginPath();
      ctx.moveTo(x - 11 * unit, shell.top.y - 1 * unit);
      ctx.lineTo(x - 11 * unit, shell.south.y + 10 * unit);
      ctx.lineTo(x - 5 * unit, shell.south.y + 5 * unit);
      ctx.lineTo(x - 17 * unit, shell.south.y + 5 * unit);
      ctx.closePath();
      ctx.stroke();
      ctx.fillStyle = '#e2b555';
      ctx.fillRect(x + 3 * unit, shell.top.y + 3 * unit, 10 * unit, 4 * unit);
    }

    if (type === TILE_TYPES.WATER) {
      ctx.fillStyle = '#d5edf8';
      ctx.beginPath();
      ctx.arc(x, shell.top.y + 8 * unit, 6 * unit, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#8bc9e4';
      ctx.lineWidth = Math.max(1, 2 * unit);
      ctx.beginPath();
      ctx.moveTo(x - 7 * unit, shell.south.y + 5 * unit);
      ctx.lineTo(x + 7 * unit, shell.south.y + 5 * unit);
      ctx.stroke();
    }
  }

  function drawTile(x, y, type) {
    const pos = worldToScreen(x, y);
    const terrain = state.terrain[y][x];
    const groundY = drawTerrainTile(x, y, pos.x, pos.y, terrain);

    if (type === TILE_TYPES.GRASS) return;
    if (!canBuildOnTerrain(terrain)) return;

    if (type === TILE_TYPES.ROAD) {
      drawDiamond(pos.x, groundY, '#454a51', 0.9);
      drawRoadMarkings(pos.x, groundY);
      return;
    }

    drawLotFoundation(pos.x, groundY);
    const style = BUILDING_STYLE[type];
    if (!style) return;

    drawDiamond(pos.x + 12 * camera.zoom, groundY + 15 * camera.zoom, 'rgba(0,0,0,0.26)', 0.5);
    const shell = drawIsoPrism(pos.x, groundY - 2 * camera.zoom, style);

    const annexNoise = hashNoise(x + 17, y + 9);
    if (annexNoise > 0.48) {
      const annexStyle = {
        ...style,
        h: style.h * 0.45,
        w: style.w * 0.44,
        d: style.d * 0.42,
        roof: shadeHex(style.roof, -10),
        left: shadeHex(style.left, -10),
        right: shadeHex(style.right, -10)
      };
      drawIsoPrism(pos.x - 13 * camera.zoom, groundY + 3 * camera.zoom, annexStyle);
    }

    drawBuildingDetails(type, pos.x, groundY, shell);
  }

  function drawSkyAndSun(deltaMs) {
    dayClock = (dayClock + deltaMs * 0.000008) % 1;
    const angle = dayClock * Math.PI * 2;
    const daylight = clamp(Math.sin(angle - Math.PI * 0.5) * 0.5 + 0.5, 0, 1);

    const topColor = blendRgb([18, 35, 76], [82, 168, 255], daylight);
    const midColor = blendRgb([38, 63, 110], [143, 208, 255], daylight);
    const lowColor = blendRgb([68, 88, 118], [219, 239, 255], daylight);

    const skyGradient = ctx.createLinearGradient(0, 0, 0, window.innerHeight);
    skyGradient.addColorStop(0, toRgb(topColor));
    skyGradient.addColorStop(0.55, toRgb(midColor));
    skyGradient.addColorStop(1, toRgb(lowColor));
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

    const orbitX = window.innerWidth * 0.1 + dayClock * window.innerWidth * 0.8;
    const arcProgress = Math.sin(dayClock * Math.PI);
    const orbitY = window.innerHeight * (0.75 - arcProgress * 0.55);
    const sunX = orbitX;
    const sunY = orbitY;

    const sunRadius = Math.max(30, Math.min(window.innerWidth, window.innerHeight) * (0.038 + daylight * 0.02));
    const sunAlpha = clamp(daylight * 1.15, 0, 1);
    if (sunAlpha > 0.02) {
      const glow = ctx.createRadialGradient(sunX, sunY, sunRadius * 0.25, sunX, sunY, sunRadius * 3.4);
      glow.addColorStop(0, `rgba(255, 248, 199, ${0.9 * sunAlpha})`);
      glow.addColorStop(0.35, `rgba(255, 234, 156, ${0.62 * sunAlpha})`);
      glow.addColorStop(1, 'rgba(255, 229, 138, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(sunX, sunY, sunRadius * 3.4, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = `rgba(255, 246, 204, ${sunAlpha})`;
      ctx.beginPath();
      ctx.arc(sunX, sunY, sunRadius, 0, Math.PI * 2);
      ctx.fill();
    }

    drawHorizonMountains(daylight);

    const horizonY = window.innerHeight * 0.66;
    const haze = ctx.createLinearGradient(0, horizonY - 80, 0, horizonY + 180);
    haze.addColorStop(0, `rgba(203, 232, 255, ${0.05 + daylight * 0.06})`);
    haze.addColorStop(1, `rgba(203, 232, 255, ${0.18 + daylight * 0.22})`);
    ctx.fillStyle = haze;
    ctx.fillRect(0, horizonY - 80, window.innerWidth, 260);
  }

  function drawWorldDepthFog() {
    const horizon = window.innerHeight * 0.58;
    const fog = ctx.createLinearGradient(0, horizon, 0, window.innerHeight);
    fog.addColorStop(0, 'rgba(206, 224, 238, 0.0)');
    fog.addColorStop(0.45, 'rgba(206, 224, 238, 0.08)');
    fog.addColorStop(1, 'rgba(206, 224, 238, 0.22)');
    ctx.fillStyle = fog;
    ctx.fillRect(0, horizon, window.innerWidth, window.innerHeight - horizon);
  }

  function drawHorizonMountains(daylight) {
    const baseY = window.innerHeight * 0.64;
    const amplitude = 36;
    ctx.fillStyle = `rgba(74, 94, 120, ${0.32 + (1 - daylight) * 0.22})`;
    ctx.beginPath();
    ctx.moveTo(0, baseY + 30);
    for (let x = 0; x <= window.innerWidth; x += 20) {
      const ridge = Math.sin(x * 0.006) * amplitude + Math.sin(x * 0.013 + 1.3) * amplitude * 0.5;
      ctx.lineTo(x, baseY - ridge);
    }
    ctx.lineTo(window.innerWidth, baseY + 30);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = `rgba(104, 126, 154, ${0.22 + (1 - daylight) * 0.15})`;
    ctx.beginPath();
    ctx.moveTo(0, baseY + 40);
    for (let x = 0; x <= window.innerWidth; x += 24) {
      const ridge = Math.sin(x * 0.008 + 0.9) * (amplitude * 0.7) + Math.sin(x * 0.017) * (amplitude * 0.35);
      ctx.lineTo(x, baseY + 12 - ridge);
    }
    ctx.lineTo(window.innerWidth, baseY + 40);
    ctx.closePath();
    ctx.fill();
  }

  function drawContinuousGroundOverlays() {
    drawRiverRibbon();
    drawGroundMottle();
  }

  function drawRiverRibbon() {
    const spine = [];
    for (let y = 0; y < MAP_H; y += 1) {
      let sumX = 0;
      let count = 0;
      for (let x = 0; x < MAP_W; x += 1) {
        if (state.terrain[y][x].kind === TERRAIN_TYPES.RIVER) {
          sumX += x;
          count += 1;
        }
      }
      if (count > 0) {
        const cx = sumX / count;
        const pos = worldToScreen(cx, y);
        const h = state.terrain[y][Math.round(cx)]?.height || 0;
        spine.push({ x: pos.x, y: pos.y - h * 8 * camera.zoom });
      }
    }
    if (spine.length < 2) return;

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(64, 133, 184, 0.38)';
    ctx.lineWidth = Math.max(8, 18 * camera.zoom);
    ctx.beginPath();
    ctx.moveTo(spine[0].x, spine[0].y);
    for (let i = 1; i < spine.length - 1; i += 1) {
      const mx = (spine[i].x + spine[i + 1].x) * 0.5;
      const my = (spine[i].y + spine[i + 1].y) * 0.5;
      ctx.quadraticCurveTo(spine[i].x, spine[i].y, mx, my);
    }
    const last = spine[spine.length - 1];
    ctx.lineTo(last.x, last.y);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(194, 232, 255, 0.18)';
    ctx.lineWidth = Math.max(3, 7 * camera.zoom);
    ctx.beginPath();
    ctx.moveTo(spine[0].x, spine[0].y);
    for (let i = 1; i < spine.length - 1; i += 1) {
      const mx = (spine[i].x + spine[i + 1].x) * 0.5;
      const my = (spine[i].y + spine[i + 1].y) * 0.5;
      ctx.quadraticCurveTo(spine[i].x, spine[i].y, mx, my);
    }
    ctx.lineTo(last.x, last.y);
    ctx.stroke();
  }

  function drawGroundMottle() {
    const step = 2;
    for (let y = 0; y < MAP_H; y += step) {
      for (let x = 0; x < MAP_W; x += step) {
        const terrain = state.terrain[y][x];
        if (terrain.kind === TERRAIN_TYPES.OCEAN || terrain.kind === TERRAIN_TYPES.RIVER) continue;
        const n = hashNoise(x * 9, y * 13);
        if (n < 0.55) continue;

        const pos = worldToScreen(x + (n - 0.5) * 0.6, y + (0.5 - n) * 0.4);
        const h = terrain.height ?? 0;
        const py = pos.y - h * 8 * camera.zoom;
        const radius = (3 + n * 4) * camera.zoom;

        ctx.fillStyle = `rgba(77, 103, 63, ${0.05 + n * 0.06})`;
        ctx.beginPath();
        ctx.ellipse(pos.x, py + 2 * camera.zoom, radius * 1.6, radius, -0.25, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  function drawHud() {
    ctx.fillStyle = 'rgba(6, 10, 14, 0.85)';
    ctx.fillRect(14, 14, 560, 84);

    ctx.fillStyle = '#f0f6fc';
    ctx.font = '600 14px Inter, system-ui, sans-serif';
    ctx.fillText(`Tool: ${BUILD_TOOL_ORDER[currentToolIndex].toUpperCase()} (Tab to cycle)`, 26, 40);
    ctx.fillText(`Treasury: ${Math.round(state.stats.treasury)} | Inflation: ${state.stats.inflation.toFixed(1)}%`, 26, 62);
    ctx.fillText(`Unemployment: ${state.stats.unemployment.toFixed(1)}% | Popularity: ${state.stats.popularity.toFixed(0)}%`, 26, 84);

    ctx.fillStyle = 'rgba(6, 10, 14, 0.85)';
    ctx.fillRect(14, window.innerHeight - 62, 760, 42);
    ctx.fillStyle = '#8fd8ff';
    ctx.fillText('LMB: place | RMB drag: pan | Wheel: zoom | S: save | L: load | E: election trigger | Natural terrain is protected', 26, window.innerHeight - 34);
  }

  function updateSimulation() {
    const counts = countTiles(state.map);
    const employmentBoost = counts.factory * 0.05 + counts.farm * 0.02;
    const housingPressure = Math.max(0, (counts.housing * 1.8) - (counts.power + counts.water) * 2);

    state.stats.unemployment = clamp(5 + housingPressure - employmentBoost * 100, 2, 40);
    state.stats.inflation = clamp(4 + state.stats.debt * 0.08 + counts.factory * 0.03 - counts.farm * 0.02, 1, 35);
    state.stats.popularity = clamp(70 - state.stats.inflation * 0.9 - state.stats.unemployment * 0.7, 3, 92);

    state.stats.treasury += counts.housing * 3 + counts.factory * 6 - (counts.power + counts.water) * 4;
    state.stats.debt = clamp(state.stats.debt + (state.stats.treasury < -200 ? 3 : -1), 0, 600);

    state.timelineMonth += 1;

    if (state.timelineMonth % 12 === 0) {
      state.events.unshift(state.stats.popularity > 45 ? 'Election won with fragile coalition.' : 'Election shock: opposition gains momentum.');
      state.events = state.events.slice(0, 4);
      state.stats.popularity = clamp(state.stats.popularity + (state.stats.popularity > 45 ? -4 : 5), 2, 95);
    }

    if (state.stats.unemployment > 22 && Math.random() < 0.2) {
      state.events.unshift('Protest activity rising in low-service districts.');
      state.events = state.events.slice(0, 4);
      state.stats.popularity = clamp(state.stats.popularity - 2, 2, 95);
    }
  }

  function drawEvents() {
    ctx.fillStyle = 'rgba(6, 10, 14, 0.8)';
    ctx.fillRect(window.innerWidth - 470, 14, 450, 136);
    ctx.fillStyle = '#ffd37a';
    ctx.font = '600 13px Inter, system-ui, sans-serif';
    ctx.fillText('National Event Feed', window.innerWidth - 450, 36);

    ctx.fillStyle = '#d4dbe3';
    state.events.forEach((event, index) => {
      ctx.fillText(`• ${event}`, window.innerWidth - 450, 58 + index * 20);
    });
  }

  function render(ts) {
    const delta = ts - previousTs;
    previousTs = ts;
    simAccumulator += delta;

    while (simAccumulator >= SIM_TICK_MS) {
      updateSimulation();
      simAccumulator -= SIM_TICK_MS;
    }

    drawSkyAndSun(delta);

    for (let y = 0; y < MAP_H; y += 1) {
      for (let x = 0; x < MAP_W; x += 1) {
        drawTile(x, y, state.map[y][x]);
      }
    }

    drawContinuousGroundOverlays();
    drawWorldDepthFog();
    drawHud();
    drawEvents();
    requestAnimationFrame(render);
  }

  function handlePointerDown(event) {
    if (event.button === 2) {
      camera.dragging = true;
      camera.lastPointerX = event.clientX;
      camera.lastPointerY = event.clientY;
      return;
    }

    const { tileX, tileY } = screenToTile(event.clientX, event.clientY);
    placeTile(tileX, tileY, BUILD_TOOL_ORDER[currentToolIndex]);
  }

  function handlePointerMove(event) {
    if (!camera.dragging) return;
    const dx = event.clientX - camera.lastPointerX;
    const dy = event.clientY - camera.lastPointerY;
    camera.x += dx;
    camera.y += dy;
    camera.lastPointerX = event.clientX;
    camera.lastPointerY = event.clientY;
  }

  function saveState() {
    localStorage.setItem('ascent-canvas-prototype-save', JSON.stringify(state));
    state.events.unshift('Checkpoint saved to localStorage.');
    state.events = state.events.slice(0, 4);
  }

  function loadState() {
    hydrateState(state);
    state.events.unshift('Save restored from localStorage.');
    state.events = state.events.slice(0, 4);
  }

  window.addEventListener('resize', resize);
  canvas.addEventListener('mousedown', handlePointerDown);
  canvas.addEventListener('mousemove', handlePointerMove);
  canvas.addEventListener('mouseup', () => { camera.dragging = false; });
  canvas.addEventListener('mouseleave', () => { camera.dragging = false; });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  canvas.addEventListener('wheel', (event) => {
    event.preventDefault();
    camera.zoom = clamp(camera.zoom + (event.deltaY > 0 ? -0.04 : 0.04), 0.35, 1.8);
  }, { passive: false });

  window.addEventListener('keydown', (event) => {
    if (event.key === 'Tab') {
      event.preventDefault();
      currentToolIndex = (currentToolIndex + 1) % BUILD_TOOL_ORDER.length;
    }
    if (event.key.toLowerCase() === 's') saveState();
    if (event.key.toLowerCase() === 'l') loadState();
    if (event.key.toLowerCase() === 'e') {
      state.events.unshift('Emergency election called.');
      state.events = state.events.slice(0, 4);
      state.stats.popularity = clamp(state.stats.popularity - 3, 2, 95);
    }
  });

  resize();
  requestAnimationFrame(render);
}

function createInitialState() {
  const map = [];
  for (let y = 0; y < MAP_H; y += 1) {
    const row = [];
    for (let x = 0; x < MAP_W; x += 1) row.push(TILE_TYPES.GRASS);
    map.push(row);
  }

  return {
    map,
    terrain: generateTerrainMap(MAP_W, MAP_H),
    timelineMonth: 1,
    events: ['Political network established in capital district.'],
    stats: {
      treasury: 600,
      inflation: 4.5,
      unemployment: 11.2,
      popularity: 58,
      debt: 45
    }
  };
}

function generateTerrainMap(width, height) {
  const terrain = [];
  const riverCenter = Math.floor(width * 0.56);
  const cx = (width - 1) / 2;
  const cy = (height - 1) / 2;
  const radiusX = width * 0.47;
  const radiusY = height * 0.45;

  for (let y = 0; y < height; y += 1) {
    const row = [];
    const riverX = Math.round(riverCenter + Math.sin(y * 0.42) * 2.8);

    for (let x = 0; x < width; x += 1) {
      const nx = (x - cx) / radiusX;
      const ny = (y - cy) / radiusY;
      const radial = Math.sqrt(nx * nx + ny * ny);
      const shorelineNoise = (Math.sin(x * 0.55) + Math.cos(y * 0.47)) * 0.035 + (Math.sin((x + y) * 0.3) * 0.02);
      const coastBand = 1.0 + shorelineNoise;

      const northEastBias = (x / width) * (1 - y / height);
      let kind = TERRAIN_TYPES.PLAINS;
      let elevation = 0;

      const hillNoise = Math.sin(x * 0.22) * 0.45 + Math.cos(y * 0.19) * 0.35 + Math.sin((x + y) * 0.15) * 0.25;
      let heightValue = clamp((1 - radial) * 2.2 + hillNoise * 0.9, 0, 3.2);

      if (radial > coastBand + 0.08) {
        kind = TERRAIN_TYPES.OCEAN;
      } else if (radial > coastBand - 0.02) {
        kind = TERRAIN_TYPES.COAST;
      }

      if (Math.abs(x - riverX) <= 1 && y > 2 && y < height - 2 && kind !== TERRAIN_TYPES.OCEAN) {
        kind = TERRAIN_TYPES.RIVER;
      }

      if (northEastBias > 0.53 && radial < 0.92 && kind === TERRAIN_TYPES.PLAINS) {
        kind = TERRAIN_TYPES.HILLS;
      }
      if (northEastBias > 0.68 && radial < 0.86 && kind === TERRAIN_TYPES.HILLS) {
        kind = TERRAIN_TYPES.MOUNTAIN;
      }

      if (radial < 0.62 && (kind === TERRAIN_TYPES.COAST || kind === TERRAIN_TYPES.HILLS)) {
        kind = TERRAIN_TYPES.PLAINS;
      }

      if (kind === TERRAIN_TYPES.OCEAN || kind === TERRAIN_TYPES.RIVER) {
        heightValue = 0;
      }
      if (kind === TERRAIN_TYPES.COAST) {
        heightValue = Math.min(heightValue, 0.25);
      }
      if (kind === TERRAIN_TYPES.HILLS) {
        heightValue = Math.max(heightValue, 1.15);
      }
      if (kind === TERRAIN_TYPES.MOUNTAIN) {
        heightValue = Math.max(heightValue, 2.1);
      }

      elevation = Math.round(heightValue);

      row.push({ kind, elevation, height: heightValue });
    }
    terrain.push(row);
  }

  return terrain;
}

function hydrateState(state) {
  const raw = localStorage.getItem('ascent-canvas-prototype-save');
  if (!raw) return;

  try {
    const parsed = JSON.parse(raw);
    if (parsed?.map && parsed?.stats) {
      state.map = parsed.map;
      state.stats = parsed.stats;
      state.events = parsed.events || state.events;
      state.timelineMonth = parsed.timelineMonth || state.timelineMonth;
      state.terrain = parsed.terrain || state.terrain || generateTerrainMap(MAP_W, MAP_H);
      state.terrain = state.terrain.map((row) => row.map((tile) => ({ ...tile, height: tile.height ?? tile.elevation ?? 0 })));
    }
  } catch {
    // Keep defaults on malformed save data.
  }
}

function countTiles(map) {
  const counts = { housing: 0, farm: 0, factory: 0, power: 0, water: 0 };
  map.forEach((row) => row.forEach((tile) => { if (tile in counts) counts[tile] += 1; }));
  return counts;
}


function blendRgb(a, b, t) {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t)
  ];
}

function toRgb(arr) {
  return `rgb(${arr[0]}, ${arr[1]}, ${arr[2]})`;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
