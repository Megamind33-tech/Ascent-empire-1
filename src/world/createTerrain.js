import { MeshBuilder, PBRMaterial, Color3, Vector3, VertexBuffer } from '@babylonjs/core';
import { CONFIG } from '../config.js';

/**
 * Creates a high-fidelity terrain using PBR materials and vertex displacement.
 */
export function createTerrain(scene) {
  const ground = MeshBuilder.CreateGround('ground', {
    width: CONFIG.world.size,
    height: CONFIG.world.size,
    subdivisions: 120 // Increased resolution for smoother transitions
  }, scene);

  const pos = ground.getVerticesData(VertexBuffer.PositionKind);
  const colors = [];

  for (let i = 0; i < pos.length; i += 3) {
    const x = pos[i];
    const z = pos[i + 2];
    let y = 0;

    // Noise-like displacement (deterministic for the seed)
    const cityDist = Math.max(Math.abs(x), Math.abs(z));
    const cityCore = cityDist < 220;
    const road = Math.abs(x) < 24 || Math.abs(z) < 24 ||
                Math.abs(x - 160) < 16 || Math.abs(x + 160) < 16 ||
                Math.abs(z - 160) < 16 || Math.abs(z + 160) < 16;

    if (!cityCore && !road) {
      const blend = Math.min(1.0, (cityDist - 220) / 160);
      // Primary low-frequency hills
      const hillBase   = Math.sin(x * 0.008) * 14 + Math.cos(z * 0.007) * 11 + Math.sin((x + z) * 0.004) * 20;
      // Mid-frequency ridgelines
      const hillDetail = Math.sin(x * 0.022) * 8 + Math.cos(z * 0.018) * 6;
      // High-frequency micro bumps for rocky texture
      const microBump  = Math.sin(x * 0.055) * 2.5 + Math.cos(z * 0.048) * 2.0;
      y = blend * (hillBase + hillDetail + microBump);
    }

    const riverCut = Math.exp(-Math.pow((x - 140) * 0.008, 2)) * 18;
    if (!road) y -= riverCut;
    pos[i + 1] = y;

    // Vertex colors — height-based grass/rock/dirt blending
    const norm = Math.max(0, Math.min(1, (y + 5) / 40));
    const grassFactor = y < 3 ? 0.8 : Math.max(0.2, 0.8 - (y - 3) * 0.025);
    colors.push(
      0.28 + norm * 0.12,               // red: darker low, brighter high (rock)
      0.34 + grassFactor * 0.12,        // green: grass on flatter areas
      0.22 + (1 - grassFactor) * 0.08,  // blue: slight grey for rocky peaks
      1
    );
  }

  ground.updateVerticesData(VertexBuffer.PositionKind, pos);
  ground.setVerticesData(VertexBuffer.ColorKind, colors);
  ground.refreshBoundingInfo();
  
  // ── High-Premium PBR Material ─────────────────────────────────────
  const pbr = new PBRMaterial('groundPBR', scene);
  pbr.albedoColor = new Color3(1, 1, 1); // Uses vertex colors as primary source
  pbr.useVertexColors = true;
  pbr.roughness = 0.84;
  pbr.metallic = 0.05;
  pbr.microSurface = 0.7; // Subtle sheen
  pbr.environmentIntensity = 0.6;
  
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

