/**
 * assetLoader.js — Centralized Model Loading & Instancing
 * ========================================================
 * Pre-loads all GLB assets into AssetContainers.
 * This allows us to clone meshes cheaply and reuse materials across the city.
 *
 * Scale target: models are sized so their footprint is ~2% of the city width
 * (1800 * 0.02 = 36 units). Vehicles are proportionally smaller (~20 units).
 */

import { SceneLoader, AssetContainer, AbstractMesh } from '@babylonjs/core';
import "@babylonjs/loaders/glTF";

const ASSET_PATH = 'assets/models/';

/**
 * Manifest defining all available models.
 * Every file under public/assets/models/ is registered here.
 */
const MANIFEST = {
  // ── Civic buildings ────────────────────────────────────────────────────────
  housing:        'civic/housing.glb',
  school:         'civic/school.glb',
  police:         'civic/police.glb',
  police_station: 'civic/stylized_police_station_lowpoly-compressed.glb',
  hospital:       'civic/hospital.glb',
  stadium:        'civic/stadium.glb',
  mine:           'civic/mine.glb',
  refinery:       'civic/refinery.glb',
  barracks:       'civic/barracks.glb',
  base:           'civic/base.glb',
  corn_maze:      'civic/corn_maze-01_glb-compressed.glb',
  cat:            'civic/3danimate_cat_glb-compressed-compressed.glb',
  acc:            'civic/police.glb',   // reuse police as anti-corruption office
  dec:            'civic/police.glb',   // reuse police as defence ministry

  // ── Stores ────────────────────────────────────────────────────────────────
  store:          'stores/store.glb',
  bar:            'stores/Bar.glb',

  // ── Landmarks & structures ────────────────────────────────────────────────
  parliament:     'landmarks/Building.glb', // parliament.glb absent — use Building
  tower_a:        'landmarks/Building.glb', // 660-byte placeholder → use Building
  tower_b:        'landmarks/Building.glb',
  billboard:      'landmarks/Billboard.glb',
  farm:           'landmarks/Farm (1) (1).glb',
  birch:          'landmarks/Birch Trees.glb',
  palm:           'landmarks/Palm Trees (1).glb',
  pine:           'landmarks/Pine Trees.glb',
  bridge:         'landmarks/Bridge.glb',
  road_seg:       'landmarks/Road.glb',
  road_bits:      'landmarks/Road Bits.glb',
  road_3:         'landmarks/Road (3).glb',
  stop_sign:      'landmarks/Stop sign.glb',
  waterfall:      'landmarks/Waterfall.glb',

  // ── Rural ─────────────────────────────────────────────────────────────────
  cottage:        'rural/Cottage.glb',
  rural_farm:     'rural/Farm (1).glb',
  greenhouse:     'rural/Greenhouse.glb',

  // ── Vehicles ──────────────────────────────────────────────────────────────
  car_a:          'vehicles/car_a.glb',
  car_b:          'vehicles/car_b.glb',
  car_c:          'vehicles/Car.glb',
  car_model:      'vehicles/CAR Model.glb',
  bus:            'vehicles/Bus.glb',
  gtr:            'vehicles/Nissan GTR.glb',
  police_car:     'vehicles/Police Car.glb',
  suv:            'vehicles/SUV.glb',
  sports_car:     'vehicles/Sports Car.glb',

  // ── People ────────────────────────────────────────────────────────────────
  agent_a:        'people/agent_a.glb',

  // ── Ship placeholder ──────────────────────────────────────────────────────
  ship:           'landmarks/Building.glb',
};

const _containers = new Map();

/**
 * Initialize the loader and fetch all assets in the manifest.
 * Failed assets fall back to null; callers gracefully skip or use primitives.
 */
export async function initAssetLoader(scene) {
  // Deduplicate paths so identical GLBs are only fetched once.
  const pathToKeys = new Map();
  for (const [key, path] of Object.entries(MANIFEST)) {
    if (!pathToKeys.has(path)) pathToKeys.set(path, []);
    pathToKeys.get(path).push(key);
  }

  const promises = Array.from(pathToKeys.entries()).map(async ([path, keys]) => {
    let container = null;
    try {
      container = await SceneLoader.LoadAssetContainerAsync(ASSET_PATH, path, scene);
      console.log(`[AssetLoader] Loaded: ${path} → [${keys.join(', ')}]`);
    } catch (err) {
      console.warn(`[AssetLoader] Failed to load ${path}: ${err.message}. Callers will use primitives.`);
    }
    // All keys that share the same path get the same container (or null).
    for (const key of keys) _containers.set(key, container);
  });

  await Promise.all(promises);
  return true;
}

/**
 * Instantiate a model from the loaded containers.
 * Returns the root TransformNode, or null if the asset is unavailable.
 */
export function instantiateModel(key, scene) {
  const container = _containers.get(key);
  if (!container) return null;

  const entries = container.instantiateModelsToScene(
    (name) => `${key}-${name}-${Date.now()}`,
    false,
    { doNotRecurse: false }
  );

  const root = entries.rootNodes[0];
  if (root) {
    root.getChildMeshes().forEach(m => {
      m.receiveShadows = true;
      // Only enable Babylon mesh-level collision on objects a player might walk into.
      // Purely decorative models (vegetation, signs, etc.) skip this to save CPU.
      m.checkCollisions = false;
    });
  }
  return root;
}

/**
 * Access the underlying AssetContainer directly (useful for ThinInstances).
 */
export function getAssetContainer(key) {
  return _containers.get(key);
}

/**
 * Returns the uniform scale factor that makes a model occupy ~2% of the city
 * width (target footprint ≈ 36 units in a 1 800-unit world).
 *
 * Vehicles are intentionally smaller (≈ 20 units) for realism.
 * Small decorative props (cat, stop sign) are proportionally tiny.
 */
export function getModelScale(key) {
  switch (key) {
    // ── Civic ──────────────────────────────────────────────────────────────
    case 'housing':        return 0.48;
    case 'school':         return 0.45;
    case 'police':
    case 'acc':
    case 'dec':            return 0.45;
    case 'police_station': return 0.45;
    case 'hospital':       return 0.54;
    case 'parliament':     return 0.84;
    case 'stadium':        return 0.96;
    case 'mine':
    case 'refinery':       return 0.60;
    case 'barracks':
    case 'base':           return 0.66;
    case 'corn_maze':      return 0.48;
    case 'cat':            return 0.18;  // small decorative animal

    // ── Stores ─────────────────────────────────────────────────────────────
    case 'store':          return 0.42;
    case 'bar':            return 0.42;

    // ── Landmarks ──────────────────────────────────────────────────────────
    case 'tower_a':
    case 'tower_b':        return 0.096; // Building.glb is very large natively
    case 'billboard':      return 0.36;
    case 'farm':           return 0.30;
    case 'bridge':         return 0.72;
    case 'road_seg':
    case 'road_3':         return 0.54;
    case 'road_bits':      return 0.36;
    case 'stop_sign':      return 0.24;
    case 'waterfall':      return 0.66;

    // ── Trees ──────────────────────────────────────────────────────────────
    case 'birch':
    case 'palm':
    case 'pine':           return 0.45;

    // ── Rural ──────────────────────────────────────────────────────────────
    case 'cottage':        return 0.42;
    case 'rural_farm':     return 0.48;
    case 'greenhouse':     return 0.42;

    // ── Vehicles (smaller than buildings) ──────────────────────────────────
    case 'car_a':
    case 'car_b':
    case 'car_c':
    case 'car_model':
    case 'gtr':
    case 'sports_car':     return 0.27;
    case 'police_car':     return 0.27;
    case 'suv':            return 0.30;
    case 'bus':            return 0.33;

    // ── People ─────────────────────────────────────────────────────────────
    case 'agent_a':        return 0.30;

    // ── Ship ───────────────────────────────────────────────────────────────
    case 'ship':           return 0.54;

    default:               return 0.30;
  }
}
