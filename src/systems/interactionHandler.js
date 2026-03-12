/**
 * interactionHandler.js — Building & District Interaction System
 * ==============================================================
 * Handles click detection on buildings and district selection.
 * Manages UI panel display for district management.
 */

/**
 * InteractionHandler Class
 * Detects building clicks and triggers district interactions.
 */
export class InteractionHandler {
  constructor(scene, camera, districtManager, districtPlanner) {
    this.scene = scene;
    this.camera = camera;
    this.districtManager = districtManager;
    this.districtPlanner = districtPlanner;
    this.buildingMap = new Map(); // Maps mesh to building/district info
    this.selectedBuilding = null;
    this.onDistrictSelected = null; // Callback when district selected
  }

  /**
   * Register a building mesh for interaction
   * @param {Mesh} mesh The building mesh
   * @param {string} buildingKey Building asset key
   * @param {string} districtId District ID
   * @param {Object} metadata Building metadata
   */
  registerBuilding(mesh, buildingKey, districtId, metadata = {}) {
    if (!mesh) return;

    this.buildingMap.set(mesh, {
      buildingKey,
      districtId,
      metadata,
      mesh
    });
  }

  /**
   * Register multiple buildings at once
   * @param {Array} buildings Array of building objects {mesh, buildingKey, districtId}
   */
  registerBuildings(buildings) {
    for (const building of buildings) {
      this.registerBuilding(
        building.mesh,
        building.buildingKey,
        building.districtId,
        building.metadata || {}
      );
    }
  }

  /**
   * Handle mouse click on buildings
   * @param {number} x Mouse X coordinate
   * @param {number} y Mouse Y coordinate
   * @returns {Object|null} Clicked building info or null
   */
  handleClick(x, y) {
    if (!this.scene || !this.camera) return null;

    // Create a ray from camera through click point
    const ray = this.scene.createPickingRay(x, y, null, this.camera);
    if (!ray) return null;

    // Check what was hit
    const hit = this.scene.pickWithRay(ray, (mesh) => {
      return this.buildingMap.has(mesh);
    });

    if (!hit || !hit.hit) {
      this.selectDistrict(null);
      return null;
    }

    // Get building info
    const mesh = hit.pickedMesh;
    const buildingInfo = this.buildingMap.get(mesh);

    if (buildingInfo) {
      this.selectDistrict(buildingInfo.districtId);
      this.selectedBuilding = buildingInfo;

      console.log(
        `[InteractionHandler] Clicked building in ${buildingInfo.districtId}`
      );

      return buildingInfo;
    }

    return null;
  }

  /**
   * Select a district
   * @param {string|null} districtId
   */
  selectDistrict(districtId) {
    if (districtId) {
      this.districtManager.selectDistrict(districtId);

      // Trigger callback
      if (this.onDistrictSelected) {
        this.onDistrictSelected(districtId);
      }

      console.log(`[InteractionHandler] Selected district: ${districtId}`);
    } else {
      this.districtManager.selectDistrict(null);
      this.selectedBuilding = null;
    }
  }

  /**
   * Get selected district info
   * @returns {Object|null} District summary or null
   */
  getSelectedDistrictInfo() {
    const selected = this.districtManager.getSelectedDistrict();
    if (!selected) return null;

    return this.districtManager.getDistrictSummary(selected.id);
  }

  /**
   * Handle upgrade action for selected district
   * @returns {boolean} Success
   */
  handleUpgrade() {
    const selected = this.districtManager.getSelectedDistrict();
    if (!selected) return false;

    const success = this.districtManager.upgradeDistrict(selected.id);
    if (success) {
      console.log(`[InteractionHandler] Upgraded ${selected.name}`);
    } else {
      console.log(
        `[InteractionHandler] Upgrade failed for ${selected.name} (insufficient funds or not unlocked)`
      );
    }

    return success;
  }

  /**
   * Check if a district is accessible (unlocked)
   * @param {string} districtId
   * @returns {boolean}
   */
  isDistrictAccessible(districtId) {
    const district = this.districtManager.getDistrict(districtId);
    return district && district.isUnlocked;
  }

  /**
   * Get all unlocked districts
   * @returns {Array} Unlocked district summaries
   */
  getUnlockedDistricts() {
    return this.districtManager
      .getAllDistricts()
      .filter(d => d.isUnlocked)
      .map(d => this.districtManager.getDistrictSummary(d.id));
  }

  /**
   * Get all locked districts
   * @returns {Array} Locked district info
   */
  getLockedDistricts() {
    return this.districtManager
      .getAllDistricts()
      .filter(d => !d.isUnlocked)
      .map(d => ({
        id: d.id,
        name: d.name,
        unlockProgress: d.unlockProgress,
        requirements: d.unlockRequirements
      }));
  }

  /**
   * Verify building interactions are set up
   * @returns {Object} Statistics about registered buildings
   */
  getStatistics() {
    let buildingCount = 0;
    const districtCounts = {};

    for (const [, buildingInfo] of this.buildingMap) {
      buildingCount++;
      const districtId = buildingInfo.districtId;
      districtCounts[districtId] = (districtCounts[districtId] || 0) + 1;
    }

    return {
      totalBuildingsRegistered: buildingCount,
      buildingsByDistrict: districtCounts
    };
  }

  /**
   * Log interaction statistics
   */
  logStatistics() {
    const stats = this.getStatistics();
    console.log('[InteractionHandler] ============ INTERACTION SETUP ============');
    console.log(
      `[InteractionHandler] Total buildings registered: ${stats.totalBuildingsRegistered}`
    );
    console.log('[InteractionHandler] Buildings by district:');
    for (const [districtId, count] of Object.entries(stats.buildingsByDistrict)) {
      console.log(`[InteractionHandler]   ${districtId}: ${count} buildings`);
    }
  }

  /**
   * Reset interaction state
   */
  reset() {
    this.selectedBuilding = null;
    this.buildingMap.clear();
    this.districtManager.reset();
  }
}

/**
 * Factory function to create InteractionHandler
 * @param {Scene} scene Babylon.js scene
 * @param {Camera} camera Active camera
 * @param {DistrictManager} districtManager
 * @param {DistrictPlanner} districtPlanner
 * @returns {InteractionHandler} New instance
 */
export function createInteractionHandler(
  scene,
  camera,
  districtManager,
  districtPlanner
) {
  return new InteractionHandler(scene, camera, districtManager, districtPlanner);
}
