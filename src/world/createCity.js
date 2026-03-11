import { MeshBuilder, StandardMaterial, Color3, Vector3, Matrix, Quaternion } from '@babylonjs/core';
import { spawnInstitution } from './createInstitutions.js';
import { instantiateModel, getModelScale } from '../systems/assetLoader.js';

export function createCity(scene, shadows, state) {
  const m = mats(scene);
  
  // 🛣️ Road Grid
  const road = MeshBuilder.CreateGround('road-grid', { width: 520, height: 520, subdivisions: 2 }, scene);
  road.position.y = 0.08;
  road.material = m.road;

  // 🏙️ Skyline Skyscrapers (Thin Instances)
  // We use Building.glb as the base for all skyscrapers
  const skyscraperBase = instantiateModel('tower_a', scene);
  if (skyscraperBase) {
      skyscraperBase.isVisible = false;
      const mesh = skyscraperBase.getChildMeshes()[0]; // Use the first mesh for thin instancing
      if (mesh) {
          const matrices = [], q = Quaternion.Identity();
          for (let x = -220; x <= 220; x += 30) {
            for (let z = -220; z <= 220; z += 30) {
              if (Math.abs(x) < 54 || Math.abs(z) < 54) continue;
              if (Math.abs(x - 160) < 22 || Math.abs(x + 160) < 22 || Math.abs(z - 160) < 22 || Math.abs(z + 160) < 22) continue;
              if (Math.random() > 0.72) continue;
              
              const h = 5 + Math.random() * 15;
              const s = 0.5 + Math.random() * 0.5;
              matrices.push(Matrix.Compose(new Vector3(s, h, s), q, new Vector3(x, 0.1, z)));
            }
          }
          mesh.thinInstanceAdd(matrices);
          shadows.addShadowCaster(mesh, true);
      }
  }

  // 🏛️ Major Landmarks
  spawnInstitution(scene, shadows, 'parliament', new Vector3(0, 0.1, -82), state);
  spawnInstitution(scene, shadows, 'school', new Vector3(72, 0.1, -70), state); // Proxy for Cabinet
  
  // ⚓ Port Infrastructure (Keep as geom for now as port assets are custom)
  const seaport = MeshBuilder.CreateBox('seaport', { width: 90, depth: 26, height: 6 }, scene);
  seaport.position = new Vector3(-250, 3.1, -250);
  seaport.material = m.port;
  
  const dock1 = MeshBuilder.CreateBox('dock1', { width: 14, depth: 48, height: 2 }, scene);
  dock1.position = new Vector3(-208, 4.2, -250);
  dock1.material = m.port;
  
  const dock2 = dock1.clone('dock2');
  dock2.position.x = -186;

  createAnchors(scene, state, m);
  
  return { road, seaport, dock1, dock2 };
}

function createAnchors(scene, state, m) {
  const ps = [
    [-140, -120], [-105, -120], [-70, -120], [-35, -120], [0, -120], [35, -120], [70, -120], [105, -120], [140, -120],
    [-140, 120], [-105, 120], [-70, 120], [-35, 120], [0, 120], [35, 120], [70, 120], [105, 120], [140, 120],
    [-180, 0], [180, 0], [-180, 40], [180, 40], [-180, -40], [180, -40]
  ];
  
  state.worldRefs.constructionAnchors = ps.map(([x, z], i) => {
    const pad = MeshBuilder.CreateGround(`anchor-${i}`, { width: 20, height: 20 }, scene);
    pad.position.set(x, 0.12, z);
    pad.material = m.anchor;
    pad.metadata = { buildable: true };
    return pad;
  });
}

function mats(scene) {
  const road = new StandardMaterial('roadMat', scene);
  road.diffuseColor = new Color3(0.12, 0.125, 0.13);
  
  const building = new StandardMaterial('buildingMat', scene);
  building.diffuseColor = new Color3(0.42, 0.44, 0.47);
  
  const civic = new StandardMaterial('civicMat', scene);
  civic.diffuseColor = new Color3(0.52, 0.51, 0.48);
  
  const anchor = new StandardMaterial('anchorMat', scene);
  anchor.diffuseColor = new Color3(0.22, 0.26, 0.28);
  anchor.alpha = 0.7;
  
  const port = new StandardMaterial('portMat', scene);
  port.diffuseColor = new Color3(0.36, 0.37, 0.39);
  
  return { road, building, civic, anchor, port };
}
