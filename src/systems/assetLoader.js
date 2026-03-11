/**
 * assetLoader.js — Centralized Model Loading & Instancing
 * ========================================================
 * Pre-loads all GLB assets into AssetContainers.
 * This allows us to clone meshes cheaply and reuse materials across the city.
 */

import { SceneLoader, AssetContainer, AbstractMesh } from '@babylonjs/core';
import "@babylonjs/loaders/glTF";

const ASSET_PATH = 'assets/models/';

/**
 * Manifest defining all available models.
 * Keys match the IDs used by createInstitutions.js and other world generators.
 */
const MANIFEST = {
  // Buildings
  housing:  'civic/housing.glb',
  school:   'civic/school.glb',
  store:    'stores/store.glb',
  police:   'civic/police.glb',
  parliament: 'landmarks/parliament.glb',
  stadium:  'civic/stadium.glb',
  mine:     'civic/mine.glb',
  refinery: 'civic/refinery.glb',
  barracks: 'civic/barracks.glb',
  base:     'civic/base.glb',
  acc:      'civic/police.glb', // Fallback/Reuse
  dec:      'civic/police.glb', // Fallback/Reuse
  tower_a:  'landmarks/Building.glb', // Use the 125kb building instead of 660b placeholder
  tower_b:  'landmarks/Building.glb',
  billboard: 'landmarks/Billboard.glb',
  farm:     'landmarks/Farm (1) (1).glb',
  birch:    'landmarks/Birch Trees.glb',
  palm:     'landmarks/Palm Trees (1).glb',
  pine:     'landmarks/Pine Trees.glb',

  // Dynamic objects
  car_a:    'vehicles/car_a.glb',
  car_b:    'vehicles/car_b.glb',
  agent_a:  'people/agent_a.glb',
  ship:     'landmarks/Building.glb' // Placeholder: use building as ship-base for now
};

const _containers = new Map();

/**
 * Initialize the loader and fetch all assets in the manifest.
 * @returns Promise that resolves when all critical assets are ready.
 */
export async function initAssetLoader(scene) {
  const promises = Object.entries(MANIFEST).map(async ([key, path]) => {
    try {
      const container = await SceneLoader.LoadAssetContainerAsync(ASSET_PATH, path, scene);
      _containers.set(key, container);
      console.log(`[AssetLoader] Loaded: ${key} (${path})`);
    } catch (err) {
      console.warn(`[AssetLoader] Failed to load ${key}: ${err.message}. Falling back to cube.`);
      // Add a null entry — callers will fallback to primitives
      _containers.set(key, null);
    }
  });

  await Promise.all(promises);
  return true;
}

/**
 * Instantiate a model from the loaded containers.
 * @param {string} key - Manifest key
 * @param {import("@babylonjs/core").Scene} scene
 * @returns {AbstractMesh|null} The root mesh of the instantiated model
 */
export function instantiateModel(key, scene) {
  const container = _containers.get(key);
  if (!container) return null;

  // Instantiate the container into the scene
  const entries = container.instantiateModelsToScene(
    (name) => `${key}-${name}-${Date.now()}`,
    false, // do not clone materials
    { doNotRecurse: false }
  );

  const root = entries.rootNodes[0];
  if (root) {
    root.getChildMeshes().forEach(m => {
      m.receiveShadows = true;
      m.checkCollisions = true; // Optimization: Enable collisions for interaction
    });
  }

  return root;
}

/**
 * Access the underlying AssetContainer directly (useful for ThinInstances)
 */
export function getAssetContainer(key) {
  return _containers.get(key);
}

/**
 * Helper to get the scale of a model so it fits the game's unit expectations.
 */
export function getModelScale(key) {
  switch (key) {
    case 'housing': return 0.48;
    case 'school': return 0.45;
    case 'store': return 0.42;
    case 'police': case 'acc': case 'dec': return 0.45;
    case 'parliament': return 0.84;
    case 'stadium': return 0.96;
    case 'mine': case 'refinery': return 0.60;
    case 'barracks': case 'base': return 0.66;
    case 'tower_a': case 'tower_b': return 0.096; // Building.glb is large — keep towers proportional to city scale
    case 'billboard': return 0.36;
    case 'farm': return 0.30;
    case 'birch': case 'palm': case 'pine': return 0.45;
    case 'agent_a': return 0.30;
    case 'car_a': case 'car_b': return 0.27;
    case 'ship': return 0.54;
    default: return 0.30;
  }
}
