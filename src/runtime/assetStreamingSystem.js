/**
 * assetStreamingSystem.js — Asset Streaming & Lazy Loading Framework
 * ==================================================================
 * Framework for streaming assets based on camera proximity.
 * Currently a scaffolding system; full implementation follows in Phase 5+.
 */

/**
 * Asset Streaming Manager
 * Tracks which districts are "active" (near camera) and loads/unloads assets accordingly.
 */
export class AssetStreamingSystem {
  constructor(manifest, lodSystem, deviceTier, options = {}) {
    this.manifest = manifest;
    this.lodSystem = lodSystem;
    this.deviceTier = deviceTier;

    // Configuration
    this.loadRadius = options.loadRadius || 300; // Units around camera
    this.preloadRadius = options.preloadRadius || 450; // Preload further ahead
    this.unloadRadius = options.unloadRadius || 600; // Unload beyond this
    this.districtSize = options.districtSize || 120; // Grid square size

    // State tracking
    this.activeDistricts = new Set();
    this.preloadingDistricts = new Set();
    this.loadedAssets = new Map();
    this.stats = { loaded: 0, preloading: 0, unloading: 0 };
  }

  /**
   * Get districts within loading distance of camera position.
   * @param {Vector3} cameraPos Camera world position
   * @returns {string[]} Array of district IDs within load radius
   */
  getActiveDistricts(cameraPos) {
    const active = [];

    // Convert camera position to district grid coordinates
    const gridX = Math.floor(cameraPos.x / this.districtSize);
    const gridZ = Math.floor(cameraPos.z / this.districtSize);

    // Check nearby grid squares (simplified 3x3 grid)
    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        const id = `district_${gridX + dx}_${gridZ + dz}`;
        active.push(id);
      }
    }

    return active;
  }

  /**
   * Request assets for a specific district to be loaded.
   * @param {string} districtId District identifier
   * @returns {Promise} Resolves when district assets are marked for loading
   */
  async requestDistrictAssets(districtId) {
    if (this.activeDistricts.has(districtId)) {
      return; // Already active
    }

    this.activeDistricts.add(districtId);
    this.stats.loaded++;

    console.log(`[AssetStreaming] District active: ${districtId}`);
  }

  /**
   * Preload assets for districts adjacent to active ones.
   * @param {Vector3} cameraPos Camera world position
   */
  async preloadAdjacentDistricts(cameraPos) {
    const gridX = Math.floor(cameraPos.x / this.districtSize);
    const gridZ = Math.floor(cameraPos.z / this.districtSize);

    // Preload a wider radius (2x3 grid)
    for (let dx = -2; dx <= 2; dx++) {
      for (let dz = -2; dz <= 2; dz++) {
        const id = `district_${gridX + dx}_${gridZ + dz}`;

        if (!this.activeDistricts.has(id) && !this.preloadingDistricts.has(id)) {
          this.preloadingDistricts.add(id);
          this.stats.preloading++;

          console.log(`[AssetStreaming] District preloading: ${id}`);
        }
      }
    }
  }

  /**
   * Unload assets for districts beyond unload radius.
   * @param {Vector3} cameraPos Camera world position
   * @param {number} unloadRadius Optional override unload radius
   */
  async unloadDistantDistricts(cameraPos, unloadRadius = null) {
    const radius = unloadRadius || this.unloadRadius;
    const distanceSq = radius * radius;

    // Track districts to unload
    const toUnload = [];

    for (const districtId of this.activeDistricts) {
      // Parse district coordinates from ID
      const match = districtId.match(/district_(-?\d+)_(-?\d+)/);
      if (!match) continue;

      const gridX = parseInt(match[1]);
      const gridZ = parseInt(match[2]);
      const districtWorldX = gridX * this.districtSize;
      const districtWorldZ = gridZ * this.districtSize;

      // Calculate distance from camera to district center
      const dx = districtWorldX - cameraPos.x;
      const dz = districtWorldZ - cameraPos.z;
      const dist = dx * dx + dz * dz;

      if (dist > distanceSq) {
        toUnload.push(districtId);
      }
    }

    // Unload distant districts
    for (const districtId of toUnload) {
      this.activeDistricts.delete(districtId);
      this.preloadingDistricts.delete(districtId);
      this.stats.unloading++;

      console.log(`[AssetStreaming] District unloaded: ${districtId}`);
    }
  }

  /**
   * Update streaming state based on camera position.
   * Should be called each frame or when camera moves significantly.
   *
   * @param {Vector3} cameraPos Current camera world position
   */
  async updateStreaming(cameraPos) {
    // Get currently active districts
    const active = this.getActiveDistricts(cameraPos);

    // Update active districts
    for (const districtId of active) {
      if (!this.activeDistricts.has(districtId) && !this.preloadingDistricts.has(districtId)) {
        await this.requestDistrictAssets(districtId);
      }
    }

    // Preload adjacent
    await this.preloadAdjacentDistricts(cameraPos);

    // Unload distant
    await this.unloadDistantDistricts(cameraPos);
  }

  /**
   * Get current streaming statistics.
   * @returns {Object} Stats object with loaded, preloading, unloading counts
   */
  getStreamingStats() {
    return {
      ...this.stats,
      activeDistrictCount: this.activeDistricts.size,
      preloadingDistrictCount: this.preloadingDistricts.size,
    };
  }

  /**
   * Get list of currently active districts.
   * @returns {string[]} Array of active district IDs
   */
  getActiveDistrictList() {
    return Array.from(this.activeDistricts);
  }

  /**
   * Reset streaming system (useful on scene restart).
   */
  reset() {
    this.activeDistricts.clear();
    this.preloadingDistricts.clear();
    this.loadedAssets.clear();
    this.stats = { loaded: 0, preloading: 0, unloading: 0 };
  }
}

/**
 * Factory function to create a streaming system instance.
 * @param {Object} manifest Asset manifest
 * @param {Object} lodSystem LOD system
 * @param {string} deviceTier Device tier
 * @param {Object} options Configuration options
 * @returns {AssetStreamingSystem} New streaming system instance
 */
export function createAssetStreamingSystem(manifest, lodSystem, deviceTier, options = {}) {
  return new AssetStreamingSystem(manifest, lodSystem, deviceTier, options);
}
