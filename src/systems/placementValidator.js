/**
 * placementValidator.js — Building Placement Validation System
 * ===========================================================
 * Validates building placements against constraints and spacing rules.
 * Integrates with Phase 6 validation helpers for road clearance and bounds.
 */

import { isValidBuildingPosition, getDistanceToNearestRoad } from '../world/createCity.js';

/**
 * PlacementValidator Class
 * Checks and validates building placements against all constraints.
 */
export class PlacementValidator {
  constructor(districtPlanner) {
    this.planner = districtPlanner;
    this.placedBuildings = [];  // Track all placed building positions
  }

  /**
   * Check if a position is valid for building placement
   * Validates against Phase 6 constraints + district rules + spacing
   *
   * @param {number} x World X coordinate
   * @param {number} z World Z coordinate
   * @param {Object} district District object
   * @param {string} buildingKey Asset key (e.g., 'housing')
   * @returns {boolean} True if position is valid for placement
   */
  isValidPlacement(x, z, district, buildingKey) {
    // Constraint 1: Phase 6 validation (buildable area ±220, road clearance 14 units)
    if (!isValidBuildingPosition(x, z)) {
      return false;
    }

    // Constraint 2: Must be within district bounds
    const [xMin, xMax] = district.bounds.x;
    const [zMin, zMax] = district.bounds.z;
    if (x < xMin || x > xMax || z < zMin || z > zMax) {
      return false;
    }

    // Constraint 3: Minimum spacing from other buildings (district-specific)
    const minSpacing = district.minSpacing;
    for (const placed of this.placedBuildings) {
      const dx = placed.x - x;
      const dz = placed.z - z;
      const distance = Math.sqrt(dx * dx + dz * dz);

      if (distance < minSpacing) {
        return false;  // Too close to another building
      }
    }

    return true;
  }

  /**
   * Register a placed building
   * @param {number} x World X coordinate
   * @param {number} z World Z coordinate
   * @param {string} buildingKey Asset key
   * @param {string} districtId District ID
   */
  registerPlacement(x, z, buildingKey, districtId) {
    this.placedBuildings.push({
      x,
      z,
      buildingKey,
      districtId,
      timestamp: Date.now(),
    });
  }

  /**
   * Get spacing information for a position
   * Useful for diagnostics and debugging placement issues
   *
   * @param {number} x
   * @param {number} z
   * @returns {Object} Spacing metrics
   */
  getSpacingInfo(x, z) {
    let minDistanceToBuilding = Infinity;
    let nearestBuilding = null;

    for (const placed of this.placedBuildings) {
      const dx = placed.x - x;
      const dz = placed.z - z;
      const distance = Math.sqrt(dx * dx + dz * dz);

      if (distance < minDistanceToBuilding) {
        minDistanceToBuilding = distance;
        nearestBuilding = placed;
      }
    }

    return {
      minDistanceToBuilding:
        minDistanceToBuilding === Infinity ? null : minDistanceToBuilding,
      nearestBuilding,
      roadDistance: getDistanceToNearestRoad(x, z),
    };
  }

  /**
   * Get all placements
   * @returns {Array} Array of placement records
   */
  getPlacements() {
    return [...this.placedBuildings];
  }

  /**
   * Get placement count by building type
   * @returns {Object} Count per building type
   */
  getPlacementStats() {
    const stats = {};

    for (const placement of this.placedBuildings) {
      stats[placement.buildingKey] = (stats[placement.buildingKey] || 0) + 1;
    }

    return stats;
  }

  /**
   * Get placement count by district
   * @returns {Object} Count per district
   */
  getPlacementsByDistrict() {
    const byDistrict = {};

    for (const placement of this.placedBuildings) {
      const districtId = placement.districtId;
      if (!byDistrict[districtId]) {
        byDistrict[districtId] = [];
      }
      byDistrict[districtId].push(placement);
    }

    return byDistrict;
  }

  /**
   * Get placement summary
   * @returns {Object} Summary statistics
   */
  getSummary() {
    return {
      totalPlacements: this.placedBuildings.length,
      buildingTypes: this.getPlacementStats(),
      byDistrict: this.getPlacementsByDistrict(),
    };
  }

  /**
   * Reset placement history
   */
  reset() {
    this.placedBuildings = [];
  }
}

/**
 * Factory function to create a new PlacementValidator
 * @param {DistrictPlanner} districtPlanner
 * @returns {PlacementValidator} New instance
 */
export function createPlacementValidator(districtPlanner) {
  return new PlacementValidator(districtPlanner);
}
