/**
 * cityPlanner.js — City Generation Coordinator
 * ==========================================
 * Orchestrates district-based city generation using DistrictPlanner and PlacementValidator.
 * Manages building spawning, placement, metrics, and visual organization.
 */

import { instantiateModel, getModelScale } from '../systems/assetLoader.js';
import { createDistrictPlanner } from '../systems/districtPlanner.js';
import { createPlacementValidator } from '../systems/placementValidator.js';
import { isValidBuildingPosition } from './createCity.js';

/**
 * Create a city planner coordinator
 * @param {Scene} scene Babylon.js scene
 * @param {Object} shadows Shadow system
 * @returns {Object} City planner API
 */
export function createCityPlanner(scene, shadows) {
  const districtPlanner = createDistrictPlanner();
  const validator = createPlacementValidator(districtPlanner);
  const placedBuildings = [];

  return {
    /**
     * Generate entire city layout with district-based placement
     * @returns {Object[]} Array of building objects with mesh, position, etc.
     */
    generateCity() {
      validator.reset();
      districtPlanner.reset();

      console.log('[CityPlanner] Starting city generation...');
      console.log(`[CityPlanner] Districts: ${districtPlanner.districts.length}`);

      // Process districts in priority order
      for (const district of districtPlanner.getDistrictsByPriority()) {
        this.generateDistrict(district);
      }

      console.log(
        `[CityPlanner] City generation complete: ${placedBuildings.length} buildings placed`
      );

      return placedBuildings;
    },

    /**
     * Generate buildings for a specific district
     * @param {Object} district District object from DistrictPlanner
     */
    generateDistrict(district) {
      // Target 70% occupancy to leave room for variation
      const targetCount = Math.floor(district.capacity * 0.7);
      let successCount = 0;

      console.log(
        `[CityPlanner] Generating ${district.name} (target: ${targetCount}/${district.capacity})`
      );

      for (let i = 0; i < targetCount; i++) {
        // Get recommended building type for this district
        const buildingKey = districtPlanner.getRecommendedBuildingType(
          district.id
        );
        if (!buildingKey) continue;

        // Find valid placement
        const placement = districtPlanner.suggestPlacement(
          district.id,
          buildingKey,
          (x, z) => validator.isValidPlacement(x, z, district, buildingKey)
        );

        if (placement) {
          // Create and position building
          const mesh = instantiateModel(buildingKey, scene);
          if (mesh) {
            // Apply scale with variation for visual interest
            const baseScale = getModelScale(buildingKey);
            const scaleVariation = 0.75 + Math.random() * 0.5; // ±25% variation (0.75 to 1.25)
            const finalScale = baseScale * scaleVariation;

            // Random cardinal rotation (0°, 90°, 180°, 270°)
            const rotation = Math.floor(Math.random() * 4) * (Math.PI / 2);

            // Position and orient mesh
            mesh.scaling.set(finalScale, finalScale, finalScale);
            mesh.position.set(placement.x, 0.1, placement.z);
            mesh.rotation.y = rotation;
            mesh.metadata = {
              type: buildingKey,
              onFire: false,
              district: district.id,
            };

            // Add shadow casting
            mesh.getChildMeshes().forEach(m => {
              shadows.addShadowCaster(m);
              m.receiveShadows = true;
            });

            // Register placement
            validator.registerPlacement(
              placement.x,
              placement.z,
              buildingKey,
              district.id
            );
            districtPlanner.registerBuilding(district.id);

            placedBuildings.push({
              mesh,
              x: placement.x,
              z: placement.z,
              buildingKey,
              districtId: district.id,
              scale: finalScale,
              rotation,
            });

            successCount++;
          }
        }
      }

      console.log(
        `[CityPlanner]   → Placed ${successCount}/${targetCount} buildings in ${district.name}`
      );
    },

    /**
     * Get comprehensive city metrics
     * @returns {Object} Statistics about the generated city
     */
    getMetrics() {
      return {
        totalBuildings: placedBuildings.length,
        districtMetrics: districtPlanner.getMetrics(),
        placementStats: validator.getPlacementStats(),
        buildingsByDistrict: validator.getPlacementsByDistrict(),
      };
    },

    /**
     * Get the district planner instance
     * @returns {DistrictPlanner} The district planner
     */
    getDistrictPlanner() {
      return districtPlanner;
    },

    /**
     * Get the placement validator instance
     * @returns {PlacementValidator} The validator
     */
    getValidator() {
      return validator;
    },

    /**
     * Get all placed buildings
     * @returns {Object[]} Array of placed building objects
     */
    getPlacedBuildings() {
      return [...placedBuildings];
    },

    /**
     * Get building at specific coordinates
     * @param {number} x
     * @param {number} z
     * @returns {Object|null} Building object or null
     */
    getBuildingAt(x, z) {
      const tolerance = 5;  // 5 unit tolerance
      return placedBuildings.find(b => {
        const dx = Math.abs(b.x - x);
        const dz = Math.abs(b.z - z);
        return dx < tolerance && dz < tolerance;
      }) || null;
    },

    /**
     * Get buildings in a district
     * @param {string} districtId
     * @returns {Object[]} Array of buildings in the district
     */
    getBuildingsByDistrict(districtId) {
      return placedBuildings.filter(b => b.districtId === districtId);
    },

    /**
     * Get buildings of a specific type
     * @param {string} buildingKey
     * @returns {Object[]} Array of buildings of that type
     */
    getBuildingsByType(buildingKey) {
      return placedBuildings.filter(b => b.buildingKey === buildingKey);
    },

    /**
     * Get city summary and statistics
     * @returns {Object} Summary information
     */
    getSummary() {
      const metrics = this.getMetrics();
      return {
        totalBuildings: placedBuildings.length,
        totalDistricts: districtPlanner.districts.length,
        districtOccupancy: metrics.districtMetrics.overallOccupancy,
        buildingTypes: Object.keys(metrics.placementStats).length,
        stats: metrics,
      };
    },

    /**
     * Log city statistics to console
     */
    logStatistics() {
      const summary = this.getSummary();
      console.log('[CityPlanner] ============ CITY STATISTICS ============');
      console.log(`[CityPlanner] Total Buildings: ${summary.totalBuildings}`);
      console.log(`[CityPlanner] Total Districts: ${summary.totalDistricts}`);
      console.log(
        `[CityPlanner] Overall Occupancy: ${summary.districtOccupancy}`
      );
      console.log(`[CityPlanner] Building Types: ${summary.buildingTypes}`);
      console.log('[CityPlanner] ='.repeat(22));

      // Per-district statistics
      const metrics = this.getMetrics();
      for (const [districtId, districtMetric] of Object.entries(
        metrics.districtMetrics
      )) {
        console.log(
          `[CityPlanner] ${districtMetric.name}: ${districtMetric.buildingCount}/${districtMetric.capacity} (${districtMetric.occupancy})`
        );
      }
    },
  };
}
