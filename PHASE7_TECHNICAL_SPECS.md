# PHASE 7: TECHNICAL SPECIFICATIONS - DISTRICT SYSTEM ARCHITECTURE

**Date:** March 12, 2026
**Version:** 1.0
**Status:** SPECIFICATIONS READY FOR IMPLEMENTATION

---

## 1. DISTRICT PLANNER SYSTEM

### Overview
The DistrictPlanner manages the conceptual organization of the city into thematic zones, providing:
- District definition and boundaries
- Building type recommendations by district
- Placement validation and suggestions
- District metrics and statistics

### File: `src/systems/districtPlanner.js`

#### DistrictPlanner Class

```javascript
export class DistrictPlanner {
  constructor(worldSize = 1800, gridSpacing = 120) {
    this.worldSize = worldSize;    // Total world width/height
    this.gridSpacing = gridSpacing; // Road grid spacing (120 units)
    this.districts = [];            // Array of district objects
    this.buildingCount = {};        // Track building count per district

    // Initialize districts
    this.initializeDistricts();
  }

  /**
   * Initialize all districts
   */
  initializeDistricts() {
    // Define districts
    this.districts = [
      // CIVIC CENTER - Downtown government hub
      {
        id: 'civic-center',
        name: 'Civic Center',
        type: 'civic',
        bounds: { x: [-60, 60], z: [-80, 80] },
        theme: 'blue',     // Visual theme
        description: 'Government, law, education, health',
        buildingTypes: ['parliament', 'police', 'police_station', 'hospital', 'school', 'bar'],
        capacity: 15,      // Max buildings
        priority: 1,       // Spawn priority (1=first)
        minSpacing: 20,    // Minimum units between buildings
        buildingScale: [0.096, 0.10, 0.12, 0.10], // Scale range for variety
      },

      // RESIDENTIAL NORTH
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
        minSpacing: 18,
        buildingScale: [0.09, 0.10, 0.11, 0.10],
      },

      // RESIDENTIAL SOUTH
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
        minSpacing: 18,
        buildingScale: [0.09, 0.10, 0.11, 0.10],
      },

      // INDUSTRIAL - East industrial zone
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
        minSpacing: 25,     // Larger spacing for factories
        buildingScale: [0.15, 0.15, 0.15, 0.20],
      },

      // ENTERTAINMENT - Central parks and stadiums
      {
        id: 'entertainment',
        name: 'Entertainment District',
        type: 'entertainment',
        bounds: { x: [-120, 120], z: [-50, 50] },
        theme: 'yellow',
        description: 'Sports, recreation, leisure',
        buildingTypes: ['stadium', 'bar', 'bar', 'park', 'landmark'],
        capacity: 8,
        priority: 2,
        minSpacing: 30,     // Large spacing for major attractions
        buildingScale: [0.20, 0.10, 0.15],
      },

      // RURAL - Peripheral farms and nature
      {
        id: 'rural-periphery',
        name: 'Rural Periphery',
        type: 'rural',
        bounds: { x: [-280, 280], z: [-280, 280] },  // Outer ring
        theme: 'brown',
        description: 'Farms, greenhouses, rural homes',
        buildingTypes: ['rural_farm', 'greenhouse', 'cottage', 'waterfall'],
        capacity: 15,
        priority: 4,
        minSpacing: 25,
        buildingScale: [0.10, 0.12, 0.12],
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
   * @param {Function} isValidPosition Callback: isValidPosition(x, z) -> bool
   * @returns {Object|null} { x, z, districtId } or null if no valid position
   */
  suggestPlacement(districtId, buildingType, isValidPosition) {
    const district = this.getDistrict(districtId);
    if (!district) return null;
    if (this.buildingCount[districtId] >= district.capacity) return null;

    // Try random positions within district bounds
    const [xMin, xMax] = district.bounds.x;
    const [zMin, zMax] = district.bounds.z;
    const attempts = 20; // Max attempts to find valid position

    for (let i = 0; i < attempts; i++) {
      const x = xMin + Math.random() * (xMax - xMin);
      const z = zMin + Math.random() * (zMax - zMin);

      // Check if position is valid
      if (isValidPosition(x, z, district, districtId)) {
        return { x, z, districtId };
      }
    }

    // No valid position found
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
   * @returns {Object[]} Districts sorted by priority
   */
  getDistrictsByPriority() {
    return [...this.districts].sort((a, b) => a.priority - b.priority);
  }

  /**
   * Get comprehensive metrics for all districts
   * @returns {Object} Statistics and metrics
   */
  getMetrics() {
    const metrics = {
      totalBuildings: 0,
      districtMetrics: {}
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
    }

    return metrics;
  }

  /**
   * Get recommended building type for a district
   * @param {string} districtId
   * @returns {string} Asset key (e.g., 'housing')
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
   * Reset all building counts (for world refresh)
   */
  reset() {
    for (const key of Object.keys(this.buildingCount)) {
      this.buildingCount[key] = 0;
    }
  }
}

/**
 * Factory function
 * @returns {DistrictPlanner} New instance
 */
export function createDistrictPlanner() {
  return new DistrictPlanner();
}
```

---

## 2. PLACEMENT VALIDATOR SYSTEM

### File: `src/systems/placementValidator.js`

#### PlacementValidator Class

```javascript
import { isValidBuildingPosition, getDistanceToNearestRoad } from '../world/createCity.js';
import { getModelScale } from './assetLoader.js';

export class PlacementValidator {
  constructor(districtPlanner) {
    this.planner = districtPlanner;
    this.placedBuildings = [];  // Track placed building positions
  }

  /**
   * Check if a position is valid for placement
   * @param {number} x
   * @param {number} z
   * @param {Object} district District object
   * @param {string} buildingKey Asset key (e.g., 'housing')
   * @returns {boolean} True if position is valid
   */
  isValidPlacement(x, z, district, buildingKey) {
    // Constraint 1: Phase 6 validation (buildable area, road clearance)
    if (!isValidBuildingPosition(x, z)) return false;

    // Constraint 2: Must be within district bounds
    const [xMin, xMax] = district.bounds.x;
    const [zMin, zMax] = district.bounds.z;
    if (x < xMin || x > xMax || z < zMin || z > zMax) return false;

    // Constraint 3: Minimum spacing from other buildings
    const minSpacing = district.minSpacing;
    for (const placed of this.placedBuildings) {
      const dx = placed.x - x;
      const dz = placed.z - z;
      const distance = Math.sqrt(dx * dx + dz * dz);
      if (distance < minSpacing) return false;
    }

    return true;
  }

  /**
   * Register a placed building
   * @param {number} x
   * @param {number} z
   * @param {string} buildingKey
   * @param {string} districtId
   */
  registerPlacement(x, z, buildingKey, districtId) {
    this.placedBuildings.push({
      x, z, buildingKey, districtId,
      timestamp: Date.now()
    });
  }

  /**
   * Get spacing info for a position
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
      minDistance: minDistanceToBuilding,
      nearestBuilding,
      roadDistance: getDistanceToNearestRoad(x, z),
    };
  }

  /**
   * Reset placement history
   */
  reset() {
    this.placedBuildings = [];
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
}

/**
 * Factory function
 * @param {DistrictPlanner} districtPlanner
 * @returns {PlacementValidator} New instance
 */
export function createPlacementValidator(districtPlanner) {
  return new PlacementValidator(districtPlanner);
}
```

---

## 3. CITY PLANNER COORDINATOR

### File: `src/world/cityPlanner.js`

#### CityPlanner Object

```javascript
import { instantiateModel, getModelScale } from '../systems/assetLoader.js';
import { createDistrictPlanner } from '../systems/districtPlanner.js';
import { createPlacementValidator } from '../systems/placementValidator.js';
import { isValidBuildingPosition } from './createCity.js';

export function createCityPlanner(scene, shadows) {
  const districtPlanner = createDistrictPlanner();
  const validator = createPlacementValidator(districtPlanner);
  const placedBuildings = [];

  return {
    /**
     * Generate entire city layout
     * @returns {Object[]} Array of building objects { mesh, x, z, buildingKey, districtId }
     */
    generateCity() {
      validator.reset();
      districtPlanner.reset();

      // Process districts in priority order
      for (const district of districtPlanner.getDistrictsByPriority()) {
        this.generateDistrict(district);
      }

      return placedBuildings;
    },

    /**
     * Generate buildings for a specific district
     * @param {Object} district District object
     */
    generateDistrict(district) {
      const targetCount = Math.floor(district.capacity * 0.7); // 70% occupancy target

      for (let i = 0; i < targetCount; i++) {
        // Get recommended building type for this district
        const buildingKey = districtPlanner.getRecommendedBuildingType(district.id);
        if (!buildingKey) continue;

        // Find valid placement
        const placement = districtPlanner.suggestPlacement(
          district.id,
          buildingKey,
          (x, z) => validator.isValidPlacement(x, z, district, buildingKey)
        );

        if (placement) {
          // Create building
          const mesh = instantiateModel(buildingKey, scene);
          if (mesh) {
            const baseScale = getModelScale(buildingKey);
            const scaleVariation = 0.9 + Math.random() * 0.2; // ±10%
            const finalScale = baseScale * scaleVariation;
            const rotation = Math.floor(Math.random() * 4) * (Math.PI / 2); // 0°, 90°, 180°, 270°

            mesh.scaling.set(finalScale, finalScale, finalScale);
            mesh.position.set(placement.x, 0.1, placement.z);
            mesh.rotation.y = rotation;
            mesh.metadata = { type: buildingKey, onFire: false };

            // Add shadow casting
            mesh.getChildMeshes().forEach(m => {
              shadows.addShadowCaster(m);
              m.receiveShadows = true;
            });

            // Register placement
            validator.registerPlacement(placement.x, placement.z, buildingKey, district.id);
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
          }
        }
      }
    },

    /**
     * Get city metrics
     * @returns {Object} Statistics and metrics
     */
    getMetrics() {
      return {
        totalBuildings: placedBuildings.length,
        districtMetrics: districtPlanner.getMetrics(),
        placementStats: validator.getPlacementStats(),
      };
    },

    /**
     * Get district planner
     * @returns {DistrictPlanner} The district planner instance
     */
    getDistrictPlanner() {
      return districtPlanner;
    },

    /**
     * Get validator
     * @returns {PlacementValidator} The validator instance
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
  };
}
```

---

## 4. INTEGRATION WITH createNationWorld.js

### Changes Required

Replace random building placement section with:

```javascript
// Import at top
import { createCityPlanner } from './cityPlanner.js';

// In createNationWorld function, after creating shadows but before traffic:

// ── Beautiful City Planning (District-Based) ─────────────────
const cityPlanner = createCityPlanner(scene, shadows);
const buildings = cityPlanner.generateCity();

// Add buildings to world meshes
for (const building of buildings) {
  meshes.push(building.mesh);
}

// Log metrics (optional)
console.log('[CityPlanning] City generation complete:');
console.log(JSON.stringify(cityPlanner.getMetrics(), null, 2));
```

---

## 5. VALIDATION CHECKLIST

### District System
- [ ] DistrictPlanner class fully functional
- [ ] All 6 districts defined with correct bounds and properties
- [ ] District type recommendations correct
- [ ] Priority ordering makes sense visually

### Placement Validator
- [ ] PlacementValidator integrates with Phase 6 helpers
- [ ] Spacing checks prevent building overlap
- [ ] District boundary enforcement works
- [ ] Road clearance maintained

### City Planner
- [ ] Building generation uses validators
- [ ] Scale variation applied correctly (±10%)
- [ ] Rotation variation realistic (cardinal directions)
- [ ] Metrics calculation accurate

### Integration
- [ ] createNationWorld.js successfully uses city planner
- [ ] All buildings placed and visible
- [ ] No constraint violations detected
- [ ] Metrics logged correctly

---

## 6. TESTING STRATEGY

### Unit Tests (Conceptual)
1. DistrictPlanner bounds checking
2. PlacementValidator spacing logic
3. Building placement success rates
4. Metrics accuracy

### Integration Tests
1. Full city generation in createNationWorld
2. No building overlaps
3. All districts properly populated
4. Metrics match actual placement count

### Visual Tests
1. Districts visually distinct
2. Building clustering looks natural
3. No buildings outside map bounds
4. Scale and rotation variety noticeable

---

## 7. PERFORMANCE CONSIDERATIONS

### Optimization Points
- **Building instantiation:** Use thin instances for repeated types
- **Placement queries:** Cache building positions in spatial hash
- **Metrics calculation:** Only recalculate when needed
- **District bounds:** Pre-calculate AABB for fast checks

### Expected Performance
- City generation: < 2 seconds for 100+ buildings
- Per-frame overhead: 0 (all placement at startup)
- Memory impact: Minimal (just position records)

---

## 8. EXAMPLE CONFIGURATION

```javascript
// Sample district: Residential North
{
  id: 'residential-north',
  name: 'North Residential',
  type: 'residential',
  bounds: { x: [-90, 90], z: [100, 220] },
  theme: 'green',
  description: 'Housing and apartments',
  buildingTypes: ['housing', 'housing', 'housing', 'cottage', 'store'],
  capacity: 20,           // Max buildings in this district
  priority: 2,            // Spawn order (1=first)
  minSpacing: 18,         // Min units between buildings
  buildingScale: [0.09, 0.10, 0.11, 0.10], // Scale variety
}
```

---

**Status:** SPECIFICATIONS READY FOR CODING
**Next Step:** Implement Phase 7A - Create districtPlanner.js

---

*Generated: March 12, 2026*
*Based on Phase 6 Scale Calibration*
*Ready for Phase 7A Implementation*
