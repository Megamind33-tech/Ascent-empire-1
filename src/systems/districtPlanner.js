/**
 * districtPlanner.js — District Planning System
 * ============================================
 * Manages city districts, building placement, and visual organization.
 * Enables coherent, beautiful city layout with thematic zones.
 */

/**
 * DistrictPlanner Class
 * Organizes the city into logical districts with constraints and metrics.
 */
export class DistrictPlanner {
  constructor(worldSize = 1800, gridSpacing = 120) {
    this.worldSize = worldSize;         // Total world width/height
    this.gridSpacing = gridSpacing;     // Road grid spacing (120 units)
    this.districts = [];                // Array of district objects
    this.buildingCount = {};            // Track building count per district
    this.districtAtPosition = new Map(); // Quick lookup: position -> district

    // Initialize districts
    this.initializeDistricts();
  }

  /**
   * Initialize all districts with their properties and constraints
   */
  initializeDistricts() {
    this.districts = [
      // CIVIC CENTER - Downtown government, law, education, health hub
      {
        id: 'civic-center',
        name: 'Civic Center',
        type: 'civic',
        bounds: { x: [-60, 60], z: [-80, 80] },
        theme: 'blue',
        description: 'Government, law, education, health',
        buildingTypes: ['parliament', 'police', 'police_station', 'hospital', 'school', 'bar'],
        capacity: 15,
        priority: 1,        // Spawn first
        minSpacing: 35,     // Min units between buildings (increased from 20)
        buildingScale: [0.096, 0.10, 0.12, 0.10],
        color: [0.2, 0.4, 0.6],  // RGB for ground variation
      },

      // RESIDENTIAL NORTH - Housing cluster
      {
        id: 'residential-north',
        name: 'North Residential',
        type: 'residential',
        bounds: { x: [-90, 90], z: [100, 220] },
        theme: 'green',
        description: 'Housing and apartments',
        buildingTypes: ['housing', 'housing', 'housing', 'cottage', 'store'],
        capacity: 20,
        priority: 2,
        minSpacing: 30,     // Min units between buildings (increased from 18)
        buildingScale: [0.09, 0.10, 0.11, 0.10],
        color: [0.3, 0.5, 0.3],  // Green tint
      },

      // RESIDENTIAL SOUTH - Housing cluster
      {
        id: 'residential-south',
        name: 'South Residential',
        type: 'residential',
        bounds: { x: [-90, 90], z: [-220, -100] },
        theme: 'green',
        description: 'Housing and apartments',
        buildingTypes: ['housing', 'housing', 'housing', 'cottage', 'store'],
        capacity: 20,
        priority: 2,
        minSpacing: 30,     // Min units between buildings (increased from 18)
        buildingScale: [0.09, 0.10, 0.11, 0.10],
        color: [0.3, 0.5, 0.3],  // Green tint
      },

      // INDUSTRIAL EAST - Mining, refining, production
      {
        id: 'industrial-east',
        name: 'Industrial East',
        type: 'industrial',
        bounds: { x: [150, 280], z: [-220, 220] },
        theme: 'gray',
        description: 'Mining, refining, production',
        buildingTypes: ['mine', 'refinery', 'barracks', 'base'],
        capacity: 12,
        priority: 3,
        minSpacing: 40,     // Larger spacing for factories (increased from 25)
        buildingScale: [0.15, 0.15, 0.15, 0.20],
        color: [0.35, 0.35, 0.35],  // Gray tint
      },

      // ENTERTAINMENT DISTRICT - Sports, recreation, leisure
      {
        id: 'entertainment',
        name: 'Entertainment District',
        type: 'entertainment',
        bounds: { x: [-120, 120], z: [-50, 50] },
        theme: 'yellow',
        description: 'Sports, recreation, leisure',
        buildingTypes: ['stadium', 'bar', 'bar'],
        capacity: 8,
        priority: 2,
        minSpacing: 40,     // Large spacing for major attractions (increased from 30)
        buildingScale: [0.20, 0.10, 0.15],
        color: [0.6, 0.5, 0.2],  // Yellow/gold tint
      },

      // RURAL PERIPHERY - Farms, greenhouses, nature
      {
        id: 'rural-periphery',
        name: 'Rural Periphery',
        type: 'rural',
        bounds: { x: [-280, 280], z: [-280, 280] },
        theme: 'brown',
        description: 'Farms, greenhouses, rural homes',
        buildingTypes: ['rural_farm', 'greenhouse', 'cottage', 'waterfall'],
        capacity: 15,
        priority: 4,
        minSpacing: 35,     // (increased from 25)
        buildingScale: [0.10, 0.12, 0.12],
        color: [0.45, 0.35, 0.25],  // Brown tint
      },
    ];

    // Initialize building counts
    for (const district of this.districts) {
      this.buildingCount[district.id] = 0;
    }
  }

  /**
   * Get district by ID
   * @param {string} districtId
   * @returns {Object|null} District object or null
   */
  getDistrict(districtId) {
    return this.districts.find(d => d.id === districtId) || null;
  }

  /**
   * Get all districts of a specific type
   * @param {string} type 'civic', 'residential', 'industrial', etc.
   * @returns {Object[]} Array of matching districts
   */
  getDistrictsByType(type) {
    return this.districts.filter(d => d.type === type);
  }

  /**
   * Check if position is within a district
   * @param {number} x
   * @param {number} z
   * @returns {Object|null} District object or null
   */
  getDistrictAtPosition(x, z) {
    for (const district of this.districts) {
      const [xMin, xMax] = district.bounds.x;
      const [zMin, zMax] = district.bounds.z;
      if (x >= xMin && x <= xMax && z >= zMin && z <= zMax) {
        return district;
      }
    }
    return null;
  }

  /**
   * Suggest a building placement within a district
   * @param {string} districtId
   * @param {string} buildingType Asset key (e.g., 'housing')
   * @param {Function} isValidPosition Callback: isValidPosition(x, z, district, districtId) -> bool
   * @returns {Object|null} { x, z, districtId } or null if no valid position
   */
  suggestPlacement(districtId, buildingType, isValidPosition) {
    const district = this.getDistrict(districtId);
    if (!district) return null;

    // Check if district has capacity
    if (this.buildingCount[districtId] >= district.capacity) {
      return null;
    }

    // Try random positions within district bounds
    const [xMin, xMax] = district.bounds.x;
    const [zMin, zMax] = district.bounds.z;
    const attempts = 20;  // Max attempts to find valid position

    for (let i = 0; i < attempts; i++) {
      const x = xMin + Math.random() * (xMax - xMin);
      const z = zMin + Math.random() * (zMax - zMin);

      // Check if position is valid
      if (isValidPosition(x, z, district, districtId)) {
        return { x, z, districtId };
      }
    }

    // No valid position found after attempts
    return null;
  }

  /**
   * Register a building in a district
   * @param {string} districtId
   */
  registerBuilding(districtId) {
    if (this.buildingCount[districtId] !== undefined) {
      this.buildingCount[districtId]++;
    }
  }

  /**
   * Get all districts sorted by spawn priority
   * @returns {Object[]} Districts sorted by priority (1 first)
   */
  getDistrictsByPriority() {
    return [...this.districts].sort((a, b) => a.priority - b.priority);
  }

  /**
   * Get recommended building type for a district
   * Randomly selects from the district's preferred building types
   * @param {string} districtId
   * @returns {string|null} Asset key (e.g., 'housing') or null
   */
  getRecommendedBuildingType(districtId) {
    const district = this.getDistrict(districtId);
    if (!district || district.buildingTypes.length === 0) return null;

    // Return a random building type from district's preferred list
    return district.buildingTypes[
      Math.floor(Math.random() * district.buildingTypes.length)
    ];
  }

  /**
   * Get comprehensive metrics for all districts
   * @returns {Object} Statistics and metrics
   */
  getMetrics() {
    const metrics = {
      totalBuildings: 0,
      totalCapacity: 0,
      overallOccupancy: '0%',
      districtMetrics: {},
    };

    for (const district of this.districts) {
      const count = this.buildingCount[district.id];
      const occupancy = count / district.capacity;

      metrics.districtMetrics[district.id] = {
        name: district.name,
        type: district.type,
        buildingCount: count,
        capacity: district.capacity,
        occupancy: (occupancy * 100).toFixed(1) + '%',
        available: district.capacity - count,
      };

      metrics.totalBuildings += count;
      metrics.totalCapacity += district.capacity;
    }

    // Calculate overall occupancy
    if (metrics.totalCapacity > 0) {
      metrics.overallOccupancy = (
        (metrics.totalBuildings / metrics.totalCapacity) * 100
      ).toFixed(1) + '%';
    }

    return metrics;
  }

  /**
   * Get building type distribution across all districts
   * @returns {Object} Count per building type
   */
  getBuildingTypeDistribution() {
    const distribution = {};

    for (const district of this.districts) {
      for (const buildingType of district.buildingTypes) {
        if (!distribution[buildingType]) {
          distribution[buildingType] = 0;
        }
      }
    }

    return distribution;
  }

  /**
   * Get list of all districts
   * @returns {Object[]} All district objects
   */
  getAllDistricts() {
    return [...this.districts];
  }

  /**
   * Reset all building counts (for world refresh)
   */
  reset() {
    for (const key of Object.keys(this.buildingCount)) {
      this.buildingCount[key] = 0;
    }
  }

  /**
   * Get summary of district system
   * @returns {Object} Summary information
   */
  getSummary() {
    return {
      totalDistricts: this.districts.length,
      districtNames: this.districts.map(d => d.name),
      totalCapacity: this.districts.reduce((sum, d) => sum + d.capacity, 0),
      metrics: this.getMetrics(),
    };
  }
}

/**
 * Factory function to create a new DistrictPlanner
 * @returns {DistrictPlanner} New instance
 */
export function createDistrictPlanner() {
  return new DistrictPlanner();
}
