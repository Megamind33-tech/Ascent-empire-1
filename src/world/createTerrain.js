import { MeshBuilder, PBRMaterial, Color3, Vector3, VertexBuffer } from '@babylonjs/core';
import { CONFIG } from '../config.js';

/**
 * Perlin-like noise generator for realistic terrain.
 */
function perlinNoise(x, z, seed = 0) {
  const n = Math.sin(x * 12.9898 + z * 78.233 + seed) * 43758.5453;
  return n - Math.floor(n);
}

/**
 * Improved interpolation for smoother noise.
 */
function smoothstep(t) {
  return t * t * (3 - 2 * t);
}

/**
 * Multi-octave noise for realistic terrain variation.
 */
function fractalNoise(x, z, octaves = 5, persistence = 0.55, lacunarity = 2.0) {
  let value = 0;
  let amplitude = 1;
  let frequency = 1;
  let maxValue = 0;

  for (let i = 0; i < octaves; i++) {
    value += amplitude * (perlinNoise(x * frequency, z * frequency, i) * 2 - 1);
    maxValue += amplitude;
    amplitude *= persistence;
    frequency *= lacunarity;
  }

  return value / maxValue;
}

/**
 * Creates a high-fidelity terrain using PBR materials and vertex displacement.
 */
export function createTerrain(scene) {
  const ground = MeshBuilder.CreateGround('ground', {
    width: CONFIG.world.size,
    height: CONFIG.world.size,
    subdivisions: 200 // Much higher resolution for detailed terrain
  }, scene);

  const pos = ground.getVerticesData(VertexBuffer.PositionKind);
  const normals = [];
  const colors = [];

  // First pass: calculate heights
  const heights = [];
  for (let i = 0; i < pos.length; i += 3) {
    const x = pos[i];
    const z = pos[i + 2];
    let y = 0;

    const cityDist = Math.max(Math.abs(x), Math.abs(z));
    const cityCore = cityDist < 220;
    const road = Math.abs(x) < 24 || Math.abs(z) < 24 ||
                Math.abs(x - 160) < 16 || Math.abs(x + 160) < 16 ||
                Math.abs(z - 160) < 16 || Math.abs(z + 160) < 16;

    if (!cityCore && !road) {
      const blend = Math.min(1.0, (cityDist - 220) / 160);

      // Multi-octave noise for natural-looking hills
      const baseTerrain = fractalNoise(x * 0.005, z * 0.005, 5, 0.6, 2.0) * 35;
      const hillDetail = fractalNoise(x * 0.015, z * 0.015, 4, 0.5, 2.1) * 12;
      const microVariation = fractalNoise(x * 0.08, z * 0.08, 3, 0.4, 2.2) * 3;

      y = blend * (baseTerrain + hillDetail + microVariation);
    }

    // River erosion
    const riverCut = Math.exp(-Math.pow((x - 140) * 0.008, 2)) * 18;
    if (!road) y -= riverCut;

    pos[i + 1] = y;
    heights.push(y);
  }

  // Second pass: calculate normals and colors based on slope
  const vertexCount = Math.sqrt(pos.length / 3);

  for (let i = 0; i < pos.length; i += 3) {
    const idx = i / 3;
    const row = Math.floor(idx / vertexCount);
    const col = idx % vertexCount;

    const x = pos[i];
    const z = pos[i + 2];
    const y = pos[i + 1];

    // Calculate slope by sampling neighbors
    let slope = 0;
    let slopeCount = 0;

    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;

        const nrow = row + dy;
        const ncol = col + dx;

        if (nrow >= 0 && nrow < vertexCount && ncol >= 0 && ncol < vertexCount) {
          const nidx = nrow * vertexCount + ncol;
          const heightDiff = Math.abs(heights[nidx] - y);
          slope += heightDiff;
          slopeCount++;
        }
      }
    }
    slope /= slopeCount;

    // Height-based and slope-based coloring for realism
    const heightNorm = Math.max(0, Math.min(1, (y + 5) / 45));
    const slopeFactor = Math.min(1, slope * 0.15); // Steeper = more rock

    // Grass on gentle slopes, rocks on steep slopes
    const grassFactor = Math.max(0.1, 1 - slopeFactor);
    const rockFactor = slopeFactor;

    // Color variation: grass (green), dirt (brown), rock (grey)
    let r, g, b;

    if (grassFactor > 0.7) {
      // Grass dominant — vibrant green
      r = 0.22 + grassFactor * 0.06 + heightNorm * 0.04;
      g = 0.55 + grassFactor * 0.30 + heightNorm * 0.06;
      b = 0.15 + grassFactor * 0.05;
    } else if (rockFactor > 0.6) {
      // Rock dominant — lighter grey stone
      r = 0.52 + rockFactor * 0.12 + heightNorm * 0.06;
      g = 0.50 + rockFactor * 0.10;
      b = 0.47 + rockFactor * 0.10 + heightNorm * 0.04;
    } else {
      // Dirt/sand transition — warm earth tones
      r = 0.48 + heightNorm * 0.06;
      g = 0.42 + heightNorm * 0.06;
      b = 0.28 + heightNorm * 0.04;
    }

    colors.push(r, g, b, 1);
  }

  ground.updateVerticesData(VertexBuffer.PositionKind, pos);
  ground.setVerticesData(VertexBuffer.ColorKind, colors);
  ground.updateMeshPositions(() => {}, true); // Recalculate normals
  ground.refreshBoundingInfo();

  // ── Enhanced PBR Material for Realism ─────────────────────────────────────
  const pbr = new PBRMaterial('groundPBR', scene);
  pbr.albedoColor = new Color3(1, 1, 1);
  pbr.useVertexColors = true;
  pbr.roughness = 0.80; // Slightly less rough for more definition
  pbr.metallic = 0.01;
  pbr.microSurface = 0.6;
  pbr.environmentIntensity = 0.75;

  ground.material = pbr;
  ground.receiveShadows = true;
  ground.metadata = { buildable: true };

  // Shoreline refinement
  const shore = MeshBuilder.CreateGround('shoreline', { width: 500, height: 180, subdivisions: 20 }, scene);
  shore.position = new Vector3(-420, 2.8, -420);
  const sm = new PBRMaterial('shorePBR', scene);
  sm.albedoColor = new Color3(0.46, 0.44, 0.37);
  sm.roughness = 0.9;
  shore.material = sm;

  return { ground, shore };
}

