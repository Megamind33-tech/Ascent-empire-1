import { MeshBuilder, StandardMaterial, Color3, Vector3 } from '@babylonjs/core';

/**
 * Create water and river systems for the world
 */
export function createWater(scene) {
  // Create sea/ocean surface
  const sea = MeshBuilder.CreateGround('sea', { width: 900, height: 900, subdivisions: 32 }, scene);
  sea.position = new Vector3(-450, 4, -450);

  const seaMat = new StandardMaterial('seaMat', scene);
  seaMat.diffuseColor = new Color3(0.12, 0.42, 0.62);
  seaMat.emissiveColor = new Color3(0.03, 0.08, 0.12);
  seaMat.alpha = 0.92;
  seaMat.specularColor = new Color3(0.5, 0.55, 0.6);
  sea.material = seaMat;

  // Create river ribbon
  const river = MeshBuilder.CreateRibbon(
    'river',
    { pathArray: createRiverPaths(), closeArray: false, closePath: false },
    scene
  );
  river.position.y = 4.2;

  const riverMat = new StandardMaterial('riverMat', scene);
  riverMat.diffuseColor = new Color3(0.15, 0.48, 0.65);
  riverMat.specularColor = new Color3(0.5, 0.55, 0.6);
  river.material = riverMat;

  return {
    sea,
    river,
    update(t) {
      sea.position.y = 4 + Math.sin(t * 0.6) * 0.15;
      river.position.y = 4.2 + Math.sin(t * 0.9) * 0.08;
    }
  };
}

/**
 * Generate river path arrays for ribbon mesh
 */
function createRiverPaths() {
  const left = [];
  const right = [];

  for (let i = 0; i < 50; i++) {
    const z = -400 + i * 18;
    const x = 120 + Math.sin(i * 0.25) * 18;
    left.push(new Vector3(x - 12, 0, z));
    right.push(new Vector3(x + 12, 0, z));
  }

  return [left, right];
}
