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
  cat:            'civic/cat_animated.glb',
  acc:            'civic/police.glb',   // reuse police as anti-corruption office
  dec:            'civic/police.glb',   // reuse police as defence ministry

  // ── Stores ────────────────────────────────────────────────────────────────
  store:          'stores/store.glb',
  bar:            'stores/bar.glb',

  // ── Landmarks & structures ────────────────────────────────────────────────
  parliament:     'landmarks/Building.glb', // parliament.glb absent — use Building
  tower_a:        'landmarks/Building.glb', // 660-byte placeholder → use Building
  tower_b:        'landmarks/Building.glb',
  billboard:      'landmarks/Billboard.glb',
  farm:           'landmarks/farm_variant_02.glb',
  birch:          'landmarks/birch_trees.glb',
  palm:           'landmarks/palm_trees.glb',
  pine:           'landmarks/pine_trees.glb',
  bridge:         'landmarks/Bridge.glb',
  road_seg:       'landmarks/Road.glb',
  road_bits:      'landmarks/road_bits.glb',
  road_3:         'landmarks/road_segment_variant_03.glb',
  stop_sign:      'landmarks/stop_sign.glb',
  waterfall:      'landmarks/Waterfall.glb',

  // ── Rural ─────────────────────────────────────────────────────────────────
  cottage:        'rural/Cottage.glb',
  rural_farm:     'rural/farm_variant_01.glb',
  greenhouse:     'rural/Greenhouse.glb',

  // ── Vehicles ──────────────────────────────────────────────────────────────
  car_a:          'vehicles/car_a.glb',
  car_b:          'vehicles/car_b.glb',
  car_c:          'vehicles/Car.glb',
  car_model:      'vehicles/car_model.glb',
  bus:            'vehicles/Bus.glb',
  gtr:            'vehicles/nissan_gtr.glb',
  police_car:     'vehicles/police_car.glb',
  suv:            'vehicles/SUV.glb',
  sports_car:     'vehicles/sports_car.glb',

  // ── People ────────────────────────────────────────────────────────────────
  agent_a:        'people/agent_a.glb',

  // ── Ship placeholder ──────────────────────────────────────────────────────
  ship:           'landmarks/Building.glb',
};

const _containers = new Map();

// Track loading statistics for telemetry
const _loadingStats = { total: 0, successful: 0, failed: [] };

/**
 * Initialize the loader and fetch all assets in the manifest.
 * Failed assets fall back to null; callers gracefully skip or use primitives.
 *
 * @param {Scene} scene Babylon.js scene
 * @param {Object} options Configuration options
 * @param {string} options.deviceTier Optional device tier ('low', 'mid', 'high') for LOD selection
 * @param {Object} options.lodSystem Optional LOD system for selecting asset detail levels
 * @param {Function} options.progressCallback Optional progress callback(assetKey, loadedCount, totalCount, phase)
 */
export async function initAssetLoader(scene, options = {}) {
  const { deviceTier = 'high', lodSystem = null, progressCallback = null } = options;

  // Deduplicate paths so identical GLBs are only fetched once.
  const pathToKeys = new Map();
  for (const [key, path] of Object.entries(MANIFEST)) {
    if (!pathToKeys.has(path)) pathToKeys.set(path, []);
    pathToKeys.get(path).push(key);
  }

  _loadingStats.total = pathToKeys.size;
  _loadingStats.successful = 0;
  _loadingStats.failed = [];

  let loadedCount = 0;

  const promises = Array.from(pathToKeys.entries()).map(async ([path, keys]) => {
    let container = null;
    try {
      container = await SceneLoader.LoadAssetContainerAsync(ASSET_PATH, path, scene);
      _loadingStats.successful++;
      console.log(`[AssetLoader] Loaded: ${path} → [${keys.join(', ')}]`);
    } catch (err) {
      _loadingStats.failed.push({ path, error: err.message });
      console.warn(`[AssetLoader] Failed to load ${path}: ${err.message}. Callers will use primitives.`);
    }

    // All keys that share the same path get the same container (or null).
    for (const key of keys) {
      _containers.set(key, container);
      loadedCount++;

      // Report progress
      if (progressCallback) {
        const phase = getLoadingPhase(key);
        progressCallback(key, loadedCount, _loadingStats.total, phase);
      }
    }
  });

  await Promise.all(promises);

  console.log(
    `[AssetLoader] Loading complete: ${_loadingStats.successful}/${_loadingStats.total} assets loaded`
  );

  return true;
}

/**
 * Get the logical loading phase for an asset key.
 * @param {string} key Asset key
 * @returns {string} Phase description
 */
function getLoadingPhase(key) {
  if (key.includes('civic') || ['housing', 'school', 'police', 'hospital', 'stadium', 'mine', 'refinery', 'barracks', 'base', 'cat', 'acc', 'dec'].includes(key)) {
    return 'Civic Buildings';
  }
  if (['store', 'bar'].includes(key)) {
    return 'Commercial';
  }
  if (['parliament', 'tower_a', 'tower_b', 'billboard', 'farm', 'birch', 'palm', 'pine', 'bridge', 'road_seg', 'road_bits', 'road_3', 'stop_sign', 'waterfall', 'ship'].includes(key)) {
    return 'Landmarks';
  }
  if (['cottage', 'rural_farm', 'greenhouse'].includes(key)) {
    return 'Rural';
  }
  if (['car_a', 'car_b', 'car_c', 'car_model', 'bus', 'gtr', 'police_car', 'suv', 'sports_car'].includes(key)) {
    return 'Vehicles';
  }
  if (['agent_a'].includes(key)) {
    return 'Characters';
  }
  return 'Assets';
}

/**
 * Get asset loading statistics.
 * @returns {Object} Statistics with total, successful, failed counts
 */
export function getAssetLoadingStats() {
  return { ..._loadingStats };
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
    case 'housing':        return 0.10;
    case 'school':         return 0.10;
    case 'police':
    case 'acc':
    case 'dec':            return 0.10;
    case 'police_station': return 0.10;
    case 'hospital':       return 0.12;
    case 'parliament':     return 0.096; // Building.glb proxy — same calibration as tower_a
    case 'stadium':        return 0.20;
    case 'mine':
    case 'refinery':       return 0.15;
    case 'barracks':
    case 'base':           return 0.15;
    case 'cat':            return 0.05;  // small decorative animal

    // ── Stores ─────────────────────────────────────────────────────────────
    case 'store':          return 0.10;
    case 'bar':            return 0.10;

    // ── Landmarks ──────────────────────────────────────────────────────────
    case 'tower_a':
    case 'tower_b':        return 0.096; // Building.glb is very large natively
    case 'billboard':      return 0.09;
    case 'farm':           return 0.09;
    case 'bridge':         return 0.15;
    case 'road_seg':
    case 'road_3':         return 0.12;
    case 'road_bits':      return 0.09;
    case 'stop_sign':      return 0.06;
    case 'waterfall':      return 0.15;

    // ── Trees ──────────────────────────────────────────────────────────────
    case 'birch':
    case 'palm':
    case 'pine':           return 0.12;

    // ── Rural ──────────────────────────────────────────────────────────────
    case 'cottage':        return 0.10;
    case 'rural_farm':     return 0.12;
    case 'greenhouse':     return 0.10;

    // ── Vehicles ───────────────────────────────────────────────────────────
    case 'car_a':
    case 'car_b':
    case 'car_c':
    case 'car_model':
    case 'gtr':
    case 'sports_car':     return 0.12;
    case 'police_car':     return 0.12;
    case 'suv':            return 0.12;
    case 'bus':            return 0.14;

    // ── People ─────────────────────────────────────────────────────────────
    case 'agent_a':        return 0.09;

    // ── Ship ───────────────────────────────────────────────────────────────
    case 'ship':           return 0.15;

    default:               return 0.09;
  }
}
