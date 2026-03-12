/**
 * detailPlacement.js — Environmental Detail & Vegetation Placement
 * ================================================================
 * Places vegetation, decorative objects, and environmental details.
 * Increases world density and visual richness.
 */

import { instantiateModel, getModelScale } from './assetLoader.js';

/**
 * DetailPlacement Class
 * Manages placement of vegetation and decorative objects throughout the world.
 */
export class DetailPlacement {
  constructor(scene, planner, validator) {
    this.scene = scene;
    this.planner = planner;
    this.validator = validator;
    this.placedDetails = [];

    // Initialize detail configuration
    this.initializeDetailConfig();
  }

  /**
   * Initialize configuration for all detail types
   */
  initializeDetailConfig() {
    this.config = {
      vegetation: {
        trees: {
          density: 0.08,            // ~8% of buildable area
          types: ['birch', 'palm', 'pine'],
          targetCount: 60,          // Increased from 45 for better coverage
          scale: [0.10, 0.16],      // Increased from 0.08-0.12 for visibility
          minDistanceFromBuildings: 20,  // Increased from 18
          minDistanceBetweenTrees: 15,   // Increased from 12 (less crowded)
          clustering: 0.8           // Increased from 0.7 (stronger clustering)
        },
        shrubs: {
          density: 0.15,            // More shrubs for ground coverage
          types: ['birch', 'pine'],
          targetCount: 90,          // Increased from 60
          scale: [0.06, 0.12],      // Much larger: was 0.03-0.06
          minDistanceFromBuildings: 12,  // Increased from 10
          minDistanceBetweenShrubs: 8,   // Increased from 6
          clustering: 0.6           // Adjusted from 0.5
        }
      },
      decorative: {
        benches: { count: 45, scale: [0.04, 0.06], centerBias: true },
        lampposts: { count: 50, scale: [0.05, 0.08], centerBias: false },
        signs: { count: 35, scale: [0.02, 0.04], centerBias: true },
        mailboxes: { count: 25, scale: [0.01, 0.02], centerBias: false },
        fountains: { count: 5, scale: [0.10, 0.15], centerBias: true }
      }
    };
  }

  /**
   * Check if position is valid for detail placement
   * Avoids building overlaps and road clearance
   * @param {number} x
   * @param {number} z
   * @param {number} minDistanceFromBuildings
   * @returns {boolean}
   */
  isValidDetailPosition(x, z, minDistanceFromBuildings = 15) {
    // Check against Phase 6 buildable area constraints
    if (Math.abs(x) > 220 || Math.abs(z) > 220) {
      return false;
    }

    // Check distance from existing buildings
    const placedBuildings = this.validator.getPlacements();
    for (const building of placedBuildings) {
      const dx = building.x - x;
      const dz = building.z - z;
      const distance = Math.sqrt(dx * dx + dz * dz);
      if (distance < minDistanceFromBuildings) {
        return false;
      }
    }

    // Check distance from other details (specific to detail type)
    for (const detail of this.placedDetails) {
      const dx = detail.x - x;
      const dz = detail.z - z;
      const distance = Math.sqrt(dx * dx + dz * dz);
      if (distance < detail.minDistance) {
        return false;
      }
    }

    return true;
  }

  /**
   * Place vegetation throughout the world
   * @returns {Array} Array of placed vegetation objects
   */
  placeVegetation() {
    const placed = [];
    const vegConfig = this.config.vegetation;

    console.log('[DetailPlacement] Placing vegetation...');

    // Place trees
    console.log(`[DetailPlacement]   Placing ${vegConfig.trees.targetCount} trees...`);
    const trees = this._placeVegetationType('trees', vegConfig.trees);
    placed.push(...trees);

    // Place shrubs
    console.log(`[DetailPlacement]   Placing ${vegConfig.shrubs.targetCount} shrubs...`);
    const shrubs = this._placeVegetationType('shrubs', vegConfig.shrubs);
    placed.push(...shrubs);

    console.log(`[DetailPlacement]   → Placed ${placed.length} vegetation pieces`);
    return placed;
  }

  /**
   * Helper: Place a specific vegetation type
   * @private
   */
  _placeVegetationType(typeId, typeConfig) {
    const placed = [];
    const attempts = typeConfig.targetCount * 3; // Allow multiple attempts

    let placedCount = 0;
    for (let i = 0; i < attempts && placedCount < typeConfig.targetCount; i++) {
      // Generate random position with clustering bias
      const x = (Math.random() - 0.5) * 440 * (1 - typeConfig.clustering * 0.5);
      const z = (Math.random() - 0.5) * 440 * (1 - typeConfig.clustering * 0.5);

      // Check if position is valid
      if (!this.isValidDetailPosition(x, z, typeConfig.minDistanceFromBuildings)) {
        continue;
      }

      // Check distance from other vegetation of same type
      let tooClose = false;
      for (const detail of placed) {
        if (detail.vegetationType === typeId) {
          const dx = detail.x - x;
          const dz = detail.z - z;
          const distance = Math.sqrt(dx * dx + dz * dz);
          if (distance < typeConfig.minDistanceBetweenTrees) {
            tooClose = true;
            break;
          }
        }
      }

      if (tooClose) continue;

      // Get asset and scale
      const assetType = typeConfig.types[Math.floor(Math.random() * typeConfig.types.length)];
      const scale = typeConfig.scale[0] + Math.random() * (typeConfig.scale[1] - typeConfig.scale[0]);
      const mesh = instantiateModel(assetType, this.scene);

      if (mesh) {
        // Apply scale
        mesh.scaling.scaleInPlace(scale);
        mesh.position.set(x, 0.1, z);

        // Register placement
        this.placedDetails.push({
          x,
          z,
          vegetationType: typeId,
          minDistance: typeConfig.minDistanceBetweenTrees || 8,
          timestamp: Date.now()
        });

        placed.push({
          mesh,
          x,
          z,
          scale,
          vegetationType: typeId
        });

        placedCount++;
      }
    }

    return placed;
  }

  /**
   * Place decorative objects throughout the world
   * @returns {Array} Array of placed decorative objects
   */
  placeDecoratives() {
    const placed = [];
    const decorConfig = this.config.decorative;

    console.log('[DetailPlacement] Placing decorative objects...');

    const decorTypes = ['benches', 'lampposts', 'signs', 'mailboxes', 'fountains'];

    for (const decorType of decorTypes) {
      const config = decorConfig[decorType];
      let placedCount = 0;
      console.log(`[DetailPlacement]   Placing ${config.count} ${decorType}...`);

      for (let i = 0; i < config.count * 2; i++) {  // Allow multiple attempts
        if (placedCount >= config.count) break;

        // Generate position (with center bias for some object types)
        let x, z;
        if (config.centerBias) {
          // Closer to center (civic/entertainment areas)
          x = (Math.random() - 0.5) * 200;
          z = (Math.random() - 0.5) * 200;
        } else {
          // More distributed
          x = (Math.random() - 0.5) * 420;
          z = (Math.random() - 0.5) * 420;
        }

        // Check if position is valid
        if (!this.isValidDetailPosition(x, z, 12)) {
          continue;
        }

        // Get asset and create mesh
        const scale = config.scale[0] + Math.random() * (config.scale[1] - config.scale[0]);
        const mesh = instantiateModel(decorType, this.scene);

        if (mesh) {
          // Apply scale and position
          mesh.scaling.scaleInPlace(scale);
          mesh.position.set(x, 0.1, z);

          this.placedDetails.push({
            x,
            z,
            decorType,
            minDistance: 5,
            timestamp: Date.now()
          });

          placed.push({
            mesh,
            x,
            z,
            scale,
            decorType
          });

          placedCount++;
        }
      }
    }

    console.log(`[DetailPlacement]   → Placed ${placed.length} decorative objects`);
    return placed;
  }

  /**
   * Get all placed details
   * @returns {Array} All placed detail records
   */
  getPlacements() {
    return [...this.placedDetails];
  }

  /**
   * Get summary of placed details
   * @returns {Object} Summary statistics
   */
  getSummary() {
    const summary = {
      totalDetails: this.placedDetails.length,
      vegetation: 0,
      decorative: 0,
      byType: {}
    };

    for (const detail of this.placedDetails) {
      if (detail.vegetationType) {
        summary.vegetation++;
        summary.byType[detail.vegetationType] = (summary.byType[detail.vegetationType] || 0) + 1;
      } else if (detail.decorType) {
        summary.decorative++;
        summary.byType[detail.decorType] = (summary.byType[detail.decorType] || 0) + 1;
      }
    }

    return summary;
  }

  /**
   * Log placement summary to console
   */
  logSummary() {
    const summary = this.getSummary();
    console.log('[DetailPlacement] ============ DETAIL PLACEMENT ============');
    console.log(`[DetailPlacement] Total Details: ${summary.totalDetails}`);
    console.log(`[DetailPlacement] Vegetation: ${summary.vegetation}`);
    console.log(`[DetailPlacement] Decorative: ${summary.decorative}`);
    console.log(`[DetailPlacement] By Type:`);
    for (const [type, count] of Object.entries(summary.byType)) {
      console.log(`[DetailPlacement]   ${type}: ${count}`);
    }
  }

  /**
   * Reset placement tracking
   */
  reset() {
    this.placedDetails = [];
  }
}

/**
 * Factory function to create DetailPlacement
 * @param {Scene} scene
 * @param {DistrictPlanner} planner
 * @param {PlacementValidator} validator
 * @returns {DetailPlacement} New instance
 */
export function createDetailPlacement(scene, planner, validator) {
  return new DetailPlacement(scene, planner, validator);
}
