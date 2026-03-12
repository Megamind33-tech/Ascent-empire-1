/**
 * cityPlanner.js — City Generation Coordinator
 * ==========================================
 * Orchestrates district-based city generation using DistrictPlanner and PlacementValidator.
 * Manages building spawning, placement, metrics, and visual organization.
 * Now includes terrain-aware alignment and visual variation per district.
 */

import { instantiateModel, getModelScale } from '../systems/assetLoader.js';
import { createDistrictPlanner } from '../systems/districtPlanner.js';
import { createPlacementValidator } from '../systems/placementValidator.js';
import { isValidBuildingPosition } from './createCity.js';
import { alignNodeToGround, isAcceptableSlope } from './terrainHeightSampler.js';
import { applyBuildingVariation } from '../systems/buildingVariationSystem.js';

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
          (x, z) => {
            // Check standard validity
            if (!validator.isValidPlacement(x, z, district, buildingKey)) {
              return false;
            }
            // Check terrain slope acceptability for this district
            if (!isAcceptableSlope(x, z, 0.20)) {
              return false;
            }
            return true;
          }
        );

        if (placement) {
          // Create and position building
          const mesh = instantiateModel(buildingKey, scene);
          if (mesh) {
            // Get base scale from asset loader
            const baseScale = getModelScale(buildingKey);

            // Align to terrain (this sets position.y to match terrain height)
            alignNodeToGround(mesh, placement.x, placement.z, {
              yOffset: 0.05,           // Small offset above terrain
              clampPitch: true,        // Keep buildings mostly upright
              clampRoll: true,
              maxSlopeAngle: Math.PI / 16, // 11.25°
            });

            // Apply visual variation (scale, rotation, material tinting)
            const variation = applyBuildingVariation(
              mesh,
              district.id,
              buildingKey,
              scene,
              { baseScale, baseRotation: 0 }
            );

            mesh.metadata = {
              type: buildingKey,
              onFire: false,
              district: district.id,
              terrain: true,           // Marked as terrain-aligned
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
              scale: variation.scale,
              rotation: variation.rotation,
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
