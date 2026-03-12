/**
 * districtLighting.js — District-Specific Lighting System
 * =====================================================
 * Applies thematic lighting and atmospheric effects per district.
 * Creates visual variety and emotional atmosphere throughout the city.
 */

import { Color3 } from '@babylonjs/core';

/**
 * DistrictLighting Class
 * Manages lighting configurations and atmospheric effects for each district.
 */
export class DistrictLighting {
  constructor(scene) {
    this.scene = scene;
    this.activeLights = [];
    this.districtLights = new Map();

    // Initialize lighting configurations for each district
    this.initializeLightingConfigs();
  }

  /**
   * Define lighting characteristics for each district
   */
  initializeLightingConfigs() {
    this.configs = {
      'civic-center': {
        name: 'Civic Center',
        ambientColor: [0.75, 0.8, 1.0],      // Cool, professional blue tint
        ambientIntensity: 0.65,
        directionalColor: [1.0, 0.95, 0.85], // Warm directional light
        directionalIntensity: 0.85,
        fogColor: [0.6, 0.7, 0.85],
        fogDensity: 0.00008,
        theme: 'professional'
      },

      'residential-north': {
        name: 'North Residential',
        ambientColor: [0.85, 0.82, 0.75],    // Warm, welcoming tone
        ambientIntensity: 0.7,
        directionalColor: [1.0, 0.92, 0.8],
        directionalIntensity: 0.75,
        fogColor: [0.72, 0.75, 0.68],
        fogDensity: 0.00006,
        theme: 'residential'
      },

      'residential-south': {
        name: 'South Residential',
        ambientColor: [0.85, 0.82, 0.75],    // Same as north (twin district)
        ambientIntensity: 0.7,
        directionalColor: [1.0, 0.92, 0.8],
        directionalIntensity: 0.75,
        fogColor: [0.72, 0.75, 0.68],
        fogDensity: 0.00006,
        theme: 'residential'
      },

      'industrial-east': {
        name: 'Industrial East',
        ambientColor: [0.7, 0.7, 0.75],      // Cool, industrial gray
        ambientIntensity: 0.6,
        directionalColor: [1.0, 0.98, 0.9],
        directionalIntensity: 0.7,
        fogColor: [0.68, 0.68, 0.72],
        fogDensity: 0.00012,
        theme: 'industrial'
      },

      'entertainment': {
        name: 'Entertainment District',
        ambientColor: [0.95, 0.85, 0.7],     // Warm, exciting gold tones
        ambientIntensity: 0.75,
        directionalColor: [1.0, 0.88, 0.75],
        directionalIntensity: 0.8,
        fogColor: [0.8, 0.72, 0.6],
        fogDensity: 0.00005,
        theme: 'entertainment'
      },

      'rural-periphery': {
        name: 'Rural Periphery',
        ambientColor: [0.85, 0.88, 0.8],     // Natural, earthy tones
        ambientIntensity: 0.65,
        directionalColor: [1.0, 0.95, 0.85],
        directionalIntensity: 0.75,
        fogColor: [0.75, 0.78, 0.7],
        fogDensity: 0.00007,
        theme: 'rural'
      }
    };
  }

  /**
   * Get lighting config for a district
   * @param {string} districtId
   * @returns {Object} Lighting configuration
   */
  getConfig(districtId) {
    return this.configs[districtId] || this.configs['civic-center'];
  }

  /**
   * Apply lighting to a specific district
   * @param {string} districtId
   * @param {Array} buildingPositions Array of {x, z} positions
   * @returns {Object} Lighting setup information
   */
  applyDistrictLighting(districtId, buildingPositions = []) {
    const config = this.getConfig(districtId);

    // Set ambient light for the scene (affects entire scene, but visual effect varies per district)
    // Note: In a real implementation, you might use separate lighting for different regions
    this.scene.ambientColor = new Color3(...config.ambientColor);
    this.scene.ambientColor.scaleToRef(config.ambientIntensity, this.scene.ambientColor);

    // Create fog for atmospheric effect
    this.scene.fogEnabled = true;
    this.scene.fogMode = 3; // FOGMODE_EXP
    this.scene.fogColor = new Color3(...config.fogColor);
    this.scene.fogDensity = config.fogDensity;

    // Store reference for tracking
    this.districtLights.set(districtId, {
      config,
      buildingCount: buildingPositions.length,
      appliedAt: Date.now()
    });

    return {
      districtId,
      name: config.name,
      theme: config.theme,
      buildingCount: buildingPositions.length,
      ambientColor: config.ambientColor,
      ambientIntensity: config.ambientIntensity,
      fogDensity: config.fogDensity
    };
  }

  /**
   * Apply lighting to all districts based on their bounds
   * Creates visual variation across the city
   * @param {DistrictPlanner} districtPlanner
   * @param {PlacementValidator} validator
   */
  applyDistrictWiseLighting(districtPlanner, validator) {
    const results = [];
    const districts = districtPlanner.getAllDistricts();

    for (const district of districts) {
      // Get buildings in this district from validator
      const districtPlacements = validator.getPlacementsByDistrict()[district.id] || [];

      // Apply lighting configuration
      const result = this.applyDistrictLighting(district.id, districtPlacements);
      results.push(result);
    }

    return results;
  }

  /**
   * Get all active lighting configurations
   * @returns {Map} Map of districtId -> lighting info
   */
  getActiveLighting() {
    return new Map(this.districtLights);
  }

  /**
   * Get lighting summary for all districts
   * @returns {Object} Summary of lighting setup
   */
  getSummary() {
    const summary = {
      totalDistricts: this.districtLights.size,
      districts: []
    };

    for (const [districtId, lightingInfo] of this.districtLights) {
      summary.districts.push({
        id: districtId,
        name: lightingInfo.config.name,
        theme: lightingInfo.config.theme,
        buildingCount: lightingInfo.buildingCount,
        ambientIntensity: lightingInfo.config.ambientIntensity,
        fogDensity: lightingInfo.config.fogDensity
      });
    }

    return summary;
  }

  /**
   * Log lighting information to console
   */
  logLighting() {
    console.log('[DistrictLighting] ============ LIGHTING SETUP ============');

    for (const [districtId, lightingInfo] of this.districtLights) {
      console.log(`[DistrictLighting] ${lightingInfo.config.name}`);
      console.log(`[DistrictLighting]   Theme: ${lightingInfo.config.theme}`);
      console.log(`[DistrictLighting]   Buildings: ${lightingInfo.buildingCount}`);
      console.log(`[DistrictLighting]   Ambient Intensity: ${lightingInfo.config.ambientIntensity}`);
      console.log(`[DistrictLighting]   Fog Density: ${lightingInfo.config.fogDensity}`);
    }
  }

  /**
   * Reset lighting to default
   */
  reset() {
    this.districtLights.clear();
    this.scene.ambientColor = new Color3(1, 1, 1);
    this.scene.fogEnabled = false;
  }
}

/**
 * Factory function to create DistrictLighting
 * @param {Scene} scene Babylon.js scene
 * @returns {DistrictLighting} New instance
 */
export function createDistrictLighting(scene) {
  return new DistrictLighting(scene);
}
