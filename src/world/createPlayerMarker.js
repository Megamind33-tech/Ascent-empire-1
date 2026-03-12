import { Color3, MeshBuilder, StandardMaterial, Vector3 } from '@babylonjs/core';

/**
 * Creates the visual HQ marker used as a stable world anchor.
 */
export function createPlayerMarker(scene, shadows) {
  const marker = MeshBuilder.CreateCylinder('playerHQ', {
    diameterTop: 7,
    diameterBottom: 9,
    height: 10,
    tessellation: 12
  }, scene);

  marker.position = new Vector3(0, 5, 24);

  const material = new StandardMaterial('playerHQMat', scene);
  material.diffuseColor = new Color3(0.6, 0.58, 0.54);

  marker.material = material;
  marker.receiveShadows = true;
  shadows.addShadowCaster(marker);

  return marker;
}
