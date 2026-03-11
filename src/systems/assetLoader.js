/**
 * assetLoader.js — Centralized Model Loading & Instancing
 * ========================================================
 * Pre-loads all GLB assets into AssetContainers.
 * Clones meshes cheaply and reuses materials across the city.
 *
 * Scale values are calibrated against the working build (673be3c) where the
 * camera radius is 190 and buildings sit on 20×20 construction pads.
 * Tree models (Birch/Palm/Pine) are natively ~3 000 units and need ~0.003.
 * Building models are natively ~300 units and need ~0.04–0.07.
 */

import { SceneLoader, AssetContainer, AbstractMesh } from '@babylonjs/core';
import "@babylonjs/loaders/glTF";

const ASSET_PATH = 'assets/models/';

/**
 * Manifest — every GLB under public/assets/models/ is registered here.
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
  acc:            'civic/police.glb',
  dec:            'civic/police.glb',

  // ── Stores ────────────────────────────────────────────────────────────────
  store:          'stores/store.glb',
  bar:            'stores/Bar.glb',

  // ── Landmarks & structures ────────────────────────────────────────────────
  parliament:     'landmarks/Building.glb',
  tower_a:        'landmarks/Building.glb',
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
 * Initialize the loader — deduplicate identical paths so each GLB is fetched once.
 */
export async function initAssetLoader(scene) {
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
    for (const key of keys) _containers.set(key, container);
  });

  await Promise.all(promises);
  return true;
}

/**
 * Instantiate a model clone from the loaded containers.
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
      m.checkCollisions = false;
    });
  }
  return root;
}

export function getAssetContainer(key) {
  return _containers.get(key);
}

/**
 * Scale values calibrated against the working 673be3c build.
 *
 * Reference: camera radius 190, construction pads 20×20 units,
 * roads 22 units wide spaced at 120 units.
 *
 * Native model sizes (approx):
 *   Building.glb  ≈ 1 000 units  → 0.010 gives ~10 u  (towers/skyline)
 *   civic/*.glb   ≈ 300 units    → 0.048 gives ~14 u  (buildings)
 *   Tree GLBs     ≈ 3 300 units  → 0.003 gives ~10 u  (vegetation)
 *   car/people    ≈ 200 units    → 0.027 gives ~5 u   (dynamic objects)
 */
export function getModelScale(key) {
  switch (key) {
    // ── Civic buildings ───────────────────────────────────────────────────
    case 'housing':        return 0.048;
    case 'school':         return 0.045;
    case 'police':
    case 'acc':
    case 'dec':            return 0.045;
    case 'police_station': return 0.045;
    case 'hospital':       return 0.054;
    case 'parliament':     return 0.059;
    case 'stadium':        return 0.067;
    case 'mine':
    case 'refinery':       return 0.060;
    case 'barracks':
    case 'base':           return 0.066;
    case 'corn_maze':      return 0.048;   // not spawned in world
    case 'cat':            return 0.018;

    // ── Stores ────────────────────────────────────────────────────────────
    case 'store':          return 0.042;
    case 'bar':            return 0.042;

    // ── Landmarks ─────────────────────────────────────────────────────────
    case 'tower_a':
    case 'tower_b':        return 0.010;   // Building.glb — native ~1 000 u
    case 'billboard':      return 0.045;
    case 'farm':           return 0.030;
    case 'bridge':         return 0.072;
    case 'road_seg':
    case 'road_3':         return 0.054;
    case 'road_bits':      return 0.036;
    case 'stop_sign':      return 0.024;
    case 'waterfall':      return 0.066;

    // ── Trees (natively ~3 300 u — much larger than buildings) ────────────
    case 'birch':
    case 'palm':
    case 'pine':           return 0.003;

    // ── Rural ─────────────────────────────────────────────────────────────
    case 'cottage':        return 0.042;
    case 'rural_farm':     return 0.048;
    case 'greenhouse':     return 0.042;

    // ── Vehicles ──────────────────────────────────────────────────────────
    case 'car_a':
    case 'car_b':
    case 'car_c':
    case 'car_model':
    case 'gtr':
    case 'sports_car':     return 0.027;
    case 'police_car':     return 0.027;
    case 'suv':            return 0.036;   // SUV ≈ car + 30 %
    case 'bus':            return 0.075;   // Bus ≈ 12 m vs car 4.5 m → 2.7× car scale

    // ── People ────────────────────────────────────────────────────────────
    case 'agent_a':        return 0.030;

    // ── Ship ──────────────────────────────────────────────────────────────
    case 'ship':           return 0.054;

    default:               return 0.030;
  }
}
