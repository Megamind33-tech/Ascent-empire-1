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
    const cityCore = Math.abs(x) < 250 && Math.abs(z) < 250;
    const road = Math.abs(x) < 24 || Math.abs(z) < 24 || 
                Math.abs(x - 160) < 16 || Math.abs(x + 160) < 16 || 
                Math.abs(z - 160) < 16 || Math.abs(z + 160) < 16;

    if (!cityCore && !road) {
      y += Math.sin(x * 0.008) * 4 + Math.cos(z * 0.007) * 3.2 + Math.sin((x + z) * 0.004) * 6.5;
    }

    const riverCut = Math.exp(-Math.pow((x - 140) * 0.01, 2)) * 12;
    if (!road) y -= riverCut;
    pos[i + 1] = y;

    // Vertex colors for blending grassy/dirt areas (procedural texturing)
    const grassFactor = Math.abs(y) < 2.5 ? 0.8 : 0.4;
    colors.push(0.3 + y * 0.02, 0.35 + grassFactor * 0.1, 0.25, 1);
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

