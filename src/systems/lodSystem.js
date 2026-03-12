/**
 * lodSystem.js — Level of Detail (LOD) Selection System
 * ====================================================
 * Pure functions for selecting appropriate LOD level per asset based on device tier.
 * Reads from assetManifest.json to determine available LOD levels.
 */

/**
 * Create a LOD strategy from the asset manifest.
 * @param {Object} manifest - Asset manifest from JSON
 * @returns {Object} LOD strategy object with selection functions
 */
export function createLODStrategy(manifest) {
  return {
    // Select appropriate LOD level for an asset on a given device tier
    selectLOD: (assetKey, deviceTier) => selectAssetLOD(manifest, assetKey, deviceTier),

    // Get the file path for an asset at a specific LOD level
    getPath: (assetKey, lodLevel) => getAssetPathForLOD(manifest, assetKey, lodLevel),

    // Check if an asset has a specific LOD level available
    hasLOD: (assetKey, lodLevel) => hasAssetLOD(manifest, assetKey, lodLevel),

    // Get the best available LOD for an asset
    getBestAvailable: (assetKey) => getBestAvailableLOD(manifest, assetKey),

    // Get all available LOD levels for an asset
    getAvailable: (assetKey) => getAvailableLODLevels(manifest, assetKey),
  };
}

/**
 * Select appropriate LOD level for asset based on device tier.
 * Implements fallback chain: preferred > high > medium > low
 *
 * @param {Object} manifest - Asset manifest from JSON
 * @param {string} assetKey - Logical asset key (e.g., 'housing', 'car_a')
 * @param {string} deviceTier - Device tier: 'low', 'mid', 'high'
 * @returns {'high' | 'medium' | 'low' | null} Selected LOD or null if no asset
 */
export function selectAssetLOD(manifest, assetKey, deviceTier) {
  if (!manifest.assets || !manifest.assets[assetKey]) {
    return null;
  }

  const asset = manifest.assets[assetKey];
  const lodLevels = asset.lodLevels;

  if (!lodLevels) {
    return 'high'; // Default if no LOD structure (shouldn't happen with manifest)
  }

  // Determine preference order based on device tier
  let preference;
  if (deviceTier === 'high') {
    preference = ['high', 'medium', 'low'];
  } else if (deviceTier === 'mid') {
    preference = ['medium', 'high', 'low'];
  } else {
    // 'low'
    preference = ['low', 'medium', 'high'];
  }

  // Find first available LOD in preference order
  for (const lodLevel of preference) {
    if (lodLevels[lodLevel] && lodLevels[lodLevel].path) {
      return lodLevel;
    }
  }

  // Fallback: return any available LOD
  return getBestAvailableLOD(manifest, assetKey);
}

/**
 * Get the file path for an asset at a specific LOD level.
 *
 * @param {Object} manifest - Asset manifest from JSON
 * @param {string} assetKey - Asset logical key
 * @param {string} lodLevel - LOD level: 'high', 'medium', 'low'
 * @returns {string | null} File path or null if unavailable
 */
export function getAssetPathForLOD(manifest, assetKey, lodLevel) {
  if (!manifest.assets || !manifest.assets[assetKey]) {
    return null;
  }

  const asset = manifest.assets[assetKey];
  const lodConfig = asset.lodLevels?.[lodLevel];

  if (lodConfig && lodConfig.path) {
    return lodConfig.path;
  }

  return null;
}

/**
 * Check if an asset has a specific LOD level available.
 *
 * @param {Object} manifest - Asset manifest from JSON
 * @param {string} assetKey - Asset logical key
 * @param {string} lodLevel - LOD level: 'high', 'medium', 'low'
 * @returns {boolean}
 */
export function hasAssetLOD(manifest, assetKey, lodLevel) {
  const path = getAssetPathForLOD(manifest, assetKey, lodLevel);
  return path !== null;
}

/**
 * Get the best available LOD level for an asset (default to highest quality available).
 *
 * @param {Object} manifest - Asset manifest from JSON
 * @param {string} assetKey - Asset logical key
 * @returns {'high' | 'medium' | 'low' | null}
 */
export function getBestAvailableLOD(manifest, assetKey) {
  if (!manifest.assets || !manifest.assets[assetKey]) {
    return null;
  }

  const asset = manifest.assets[assetKey];
  const lodLevels = asset.lodLevels;

  if (!lodLevels) {
    return 'high';
  }

  // Prefer highest quality available
  if (lodLevels.high && lodLevels.high.path) return 'high';
  if (lodLevels.medium && lodLevels.medium.path) return 'medium';
  if (lodLevels.low && lodLevels.low.path) return 'low';

  return null;
}

/**
 * Get all available LOD levels for an asset.
 *
 * @param {Object} manifest - Asset manifest from JSON
 * @param {string} assetKey - Asset logical key
 * @returns {string[]} Array of available LOD levels
 */
export function getAvailableLODLevels(manifest, assetKey) {
  if (!manifest.assets || !manifest.assets[assetKey]) {
    return [];
  }

  const asset = manifest.assets[assetKey];
  const lodLevels = asset.lodLevels;

  if (!lodLevels) {
    return ['high']; // Default assumption
  }

  const available = [];
  if (lodLevels.high && lodLevels.high.path) available.push('high');
  if (lodLevels.medium && lodLevels.medium.path) available.push('medium');
  if (lodLevels.low && lodLevels.low.path) available.push('low');

  return available;
}

/**
 * Get LOD statistics for a device tier across all assets.
 * Useful for telemetry and debugging.
 *
 * @param {Object} manifest - Asset manifest from JSON
 * @param {string} deviceTier - Device tier: 'low', 'mid', 'high'
 * @returns {Object} Statistics object
 */
export function getLODStats(manifest, deviceTier) {
  const stats = {
    deviceTier,
    totalAssets: 0,
    byLODSelection: { high: 0, medium: 0, low: 0, unavailable: 0 },
    allAssets: [],
  };

  if (!manifest.assets) {
    return stats;
  }

  for (const [assetKey, asset] of Object.entries(manifest.assets)) {
    stats.totalAssets++;

    const selected = selectAssetLOD(manifest, assetKey, deviceTier);
    if (selected) {
      stats.byLODSelection[selected]++;
    } else {
      stats.byLODSelection.unavailable++;
    }

    stats.allAssets.push({
      key: assetKey,
      selectedLOD: selected,
      availableLODs: getAvailableLODLevels(manifest, assetKey),
    });
  }

  return stats;
}
