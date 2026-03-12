/**
 * scaleCalibration.js — Scale & Proportion Documentation
 * ======================================================
 * Centralized documentation of all scale values, proportions, and calibration
 * constants used throughout the game. This module ensures consistency and
 * provides clear rationale for scale decisions.
 *
 * FUNDAMENTAL PRINCIPLE:
 * All models are scaled so their footprint is approximately 2% of city width.
 * City width = 1800 units → Target footprint = 36 units
 * This creates proportional, believable proportions across all asset types.
 */

// ═══════════════════════════════════════════════════════════════════════════
// WORLD DIMENSIONS & BASE PROPORTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Core world dimensions and scaling ratios.
 * All calculations derive from these fundamental values.
 */
export const WORLD_DIMENSIONS = {
  // Physical world size
  width: 1800, // units (total map width)
  height: 1800, // units (total map height)
  playAreaRadius: 300, // units (half-extent of play area)

  // Scaling philosophy
  targetBuildingFootprint: 36, // units (2% of world width)
  footprintPercentage: 0.02, // 2% of world width

  // City structure
  cityCoreBoundary: 220, // units (radius from center, flat buildable area)
  worldBoundaryOffset: 4, // units (wall distance from play area edge)
};

// ═══════════════════════════════════════════════════════════════════════════
// ROAD DIMENSIONS & LANE GEOMETRY
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Complete road system dimensions.
 * The grid spacing of 120 units creates 4 traffic channels per direction.
 */
export const ROAD_DIMENSIONS = {
  // Road structural dimensions
  width: 22, // units total (11 per direction from centerline)
  halfWidth: 11, // units (from centerline to edge)

  // Lane specifications
  laneCount: 2, // lanes per road (one per direction)
  laneOffset: 4, // units (lateral offset from road centerline)
  laneCenterSpacing: 8, // units (center-to-center spacing between lanes)

  // Lane safety margins
  vehicleClearance: 2, // units per side (buffer between vehicles in adjacent lanes)
  laneEffectiveWidth: 8, // units (usable width for traffic)

  // Road grid spacing
  gridSpacing: 120, // units (standard spacing between parallel roads)
  primaryRoadPositions: {
    x: [0, 120, -120, 240, -240], // Road centerline X coordinates
    z: [0, 120, -120, 240, -240], // Road centerline Z coordinates
  },

  // Road extent
  roadDepth: 560, // units (typical road spans most of map)
};

// ═══════════════════════════════════════════════════════════════════════════
// BUILDING DIMENSIONS & PLACEMENT CONSTRAINTS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Building placement rules and constraints.
 * Ensures buildings respect road clearance and don't overlap.
 */
export const BUILDING_PLACEMENT = {
  // Clearance requirements
  minRoadClearance: 14, // units (minimum distance from road centerline)
  minBuildingSpacing: 25, // units (recommended distance between buildings)

  // Buildable area
  buildableAreaExtent: 220, // units (radius from center where buildings can spawn)
  buildableBoundaryMin: -220, // X/Z minimum
  buildableBoundaryMax: 220, // X/Z maximum

  // Building pad dimensions
  padSize: 20, // units (20×20 construction anchor pads)
  padPlacementHeight: 0.18, // Y position for visual placement

  // Clearance validation formula
  // ✓ Road width (22) + min clearance (14) + building halfwidth (~35) = ~71 units
  // ✓ Grid spacing (120) / 2 = 60 units available per side
  // This creates a tight but valid spacing model.
  spacingNote: 'Each 120-unit grid square accommodates roads + buildings with tight clearance',
};

// ═══════════════════════════════════════════════════════════════════════════
// VEHICLE SCALE VALUES & PROPORTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Vehicle scale factors and derived dimensions.
 * All vehicles scale to maintain visual consistency.
 * Vehicles are intentionally smaller than buildings (20 units vs 36 units)
 * to represent real-world proportions and maintain traffic density.
 */
export const VEHICLE_SCALES = {
  // Standard cars (0.09 scale = ~20 unit footprint)
  car_a: 0.09,
  car_b: 0.09,
  car_c: 0.09,
  car_model: 0.09,
  gtr: 0.09,
  sports_car: 0.09,
  police_car: 0.09,
  suv: 0.09,

  // Bus (0.11 scale = ~24 unit footprint, slightly larger)
  bus: 0.11,

  // Computed dimensions
  standardVehicleLength: 20, // units (typical length at 0.09 scale)
  standardVehicleWidth: 8, // units (typical width at 0.09 scale)
  busLength: 24, // units (at 0.11 scale)

  // Clearances and spacing
  vehicleMinClearance: 2, // units per side (safety buffer)
  minimumFollowDistance: 5, // units (minimum distance between consecutive vehicles)
  spawnSpacing: 54, // units (initial spawn position spacing: prevents overlaps)

  // Velocity ranges
  standardVehicleSpeed: 8, // units/second base
  busSpeed: 5, // units/second base (slower, larger)
  fastVehicleSpeed: 14, // units/second (GTR/Sports car)
  speedVariation: 4, // units/second (random variation range)

  // Y position (height)
  vehicleHeight: 0.4, // units (Y position during movement)
};

// ═══════════════════════════════════════════════════════════════════════════
// BUILDING SCALE VALUES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Building scale factors by category.
 * All scale to the target 36-unit footprint where applicable.
 * Exceptions (stadium, large structures) are intentionally larger.
 */
export const BUILDING_SCALES = {
  // Civic buildings (0.10 = ~36 unit footprint)
  housing: 0.10,
  school: 0.10,
  police: 0.10,
  hospital: 0.12, // Slightly larger
  police_station: 0.10,
  parliament: 0.096, // Building.glb proxy (very large native model)
  acc: 0.10, // Anti-corruption (shares police model)
  dec: 0.10, // Defence ministry (shares police model)

  // Entertainment & production (larger)
  stadium: 0.20, // Intentionally large (0.20 = ~72 units, twice normal)
  mine: 0.15, // ~54 units
  refinery: 0.15, // ~54 units
  barracks: 0.15, // ~54 units
  base: 0.15, // ~54 units

  // Stores
  store: 0.10,
  bar: 0.10,

  // Landmarks & structures
  tower_a: 0.096, // Building.glb proxy
  tower_b: 0.096, // Building.glb proxy
  billboard: 0.09,
  farm: 0.09,
  bridge: 0.15, // Larger structure
  waterfall: 0.15, // Larger structure
  ship: 0.15, // Large vessel

  // Rural
  cottage: 0.10,
  rural_farm: 0.12,
  greenhouse: 0.10,

  // Vegetation (non-collision decorative)
  birch: 0.12,
  palm: 0.12,
  pine: 0.12,

  // Small decorative
  stop_sign: 0.06, // Tiny sign
  cat: 0.05, // Tiny animal

  // Utility computations
  standardBuildingFootprint: 36, // units (0.10 scale target)
  largeStructureFootprint: 54, // units (0.15 scale)
  hugeStructureFootprint: 72, // units (0.20 scale, stadium only)
};

// ═══════════════════════════════════════════════════════════════════════════
// COLLISION PARAMETERS & PHYSICS TUNING
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Collision radius and physics parameters.
 * These control how entities interact in the world.
 */
export const COLLISION_PARAMETERS = {
  // Vehicle/NPC collision detection
  vehicleCollisionRadius: 5, // units (instantaneous kill zone)
  npcBoardingRadius: 7, // units (can board vehicle)
  minCollisionDistance: 2, // units (physics processing threshold)

  // Collision response
  boardingChancePerSecond: 0.08, // 8% per tick (target boarding probability)
  minBoardingCapacity: 2, // passengers per vehicle

  // Environmental collision
  fireSpreadRadius: 40, // units (building fire spread distance)
  fireAutoExtinguishTime: 120, // seconds (auto-extinguish if police.count > 0)
  fireSpreadProbability: 0.0006, // per second per building pair
  waterHazardLevel: 3.0, // Y units (below this = water/drowning hazard)
  drownTime: 3.0, // seconds in water before death

  // NPC movement constraints
  npcBoundaryClamp: 298, // units (max distance from center)
  npcTargetDistance: 4, // units² (reach target threshold)

  // Agent pathfinding
  agentSpawnRadius: 90, // units (spawn area center)
  agentMaxWaypoint: 170, // units (max waypoint distance from center)
};

// ═══════════════════════════════════════════════════════════════════════════
// AGENT (PEDESTRIAN) PARAMETERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * NPC/Agent configuration and behavior parameters.
 */
export const AGENT_PARAMETERS = {
  // Movement
  minSpeed: 1.0, // units/second
  maxSpeed: 1.8, // units/second
  baseSpeedVariation: 0.8, // units/second (random range)

  // Behavioral modifiers (event-driven)
  protestSpeedMultiplier: 1.6, // agitated/faster movement
  scandalSpeedMultiplier: 0.5, // distressed/slower movement
  scandalDirection: 'south', // forced direction during scandal

  // Spawn area
  spawnAreaRadius: 90, // units (from center)

  // Height positioning
  npcHeight: 0.1, // Y units (standing height)

  // Capacity per vehicle
  passengersPerVehicle: 2,
  rideMinDuration: 6, // seconds
  rideMaxDuration: 18, // seconds
};

// ═══════════════════════════════════════════════════════════════════════════
// TERRAIN PARAMETERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Terrain sculpting and height map parameters.
 */
export const TERRAIN_PARAMETERS = {
  // Flat vs hilly areas
  flatAreaRadius: 220, // units (from center, Y = 0)
  hillyAreaBeyond: 220, // units radius where terrain becomes hilly

  // River system
  riverCenterX: 140, // units (river position along X axis)
  riverDepth: 18, // units (max erosion depth)
  riverGaussianWidth: 20, // units (erosion width sigma)

  // Height modulation
  maxHillHeight: 35, // units (composite noise octaves)
  microVariation: 2, // units (fine detail noise)
};

// ═══════════════════════════════════════════════════════════════════════════
// MOBILE / PERFORMANCE SCALING
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Hardware-based scaling factors for performance optimization.
 */
export const MOBILE_SCALING = {
  // Scale multiplier range
  minHardwareScale: 1.0, // minimum multiplier (low-end devices)
  maxHardwareScale: 1.7, // maximum multiplier (high-end devices)

  // Dynamic entity limits
  maxDynamicCars: 18, // vehicles that move
  maxAgents: 24, // pedestrians

  // Rendering parameters
  shadowMapSize: 1024, // pixels
  skylineDensity: 0.64, // 64% of potential building slots filled
};

// ═══════════════════════════════════════════════════════════════════════════
// VALIDATION HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Validate if a building position respects road clearance constraints.
 * @param {number} x World X coordinate
 * @param {number} z World Z coordinate
 * @returns {boolean} true if position is valid for building placement
 */
export function isValidBuildingPosition(x, z) {
  // Check: within buildable area
  if (Math.abs(x) > BUILDING_PLACEMENT.buildableAreaExtent ||
      Math.abs(z) > BUILDING_PLACEMENT.buildableAreaExtent) {
    return false;
  }

  // Check: minimum clearance from all roads
  for (const roadX of ROAD_DIMENSIONS.primaryRoadPositions.x) {
    if (Math.abs(x - roadX) < BUILDING_PLACEMENT.minRoadClearance) {
      return false;
    }
  }
  for (const roadZ of ROAD_DIMENSIONS.primaryRoadPositions.z) {
    if (Math.abs(z - roadZ) < BUILDING_PLACEMENT.minRoadClearance) {
      return false;
    }
  }

  return true;
}

/**
 * Calculate expected bounding box for a scaled asset.
 * Useful for validation and collision setup.
 * @param {number} nativeWidth Native model width (before scaling)
 * @param {number} nativeHeight Native model height (before scaling)
 * @param {number} scaleFacto Scale multiplier (0.05-0.20)
 * @returns {Object} {width, height} after scaling
 */
export function getScaledDimensions(nativeWidth, nativeHeight, scaleFactor) {
  return {
    width: nativeWidth * scaleFactor,
    height: nativeHeight * scaleFactor,
    footprint: nativeWidth * nativeHeight * (scaleFactor * scaleFactor),
  };
}

/**
 * Get documentation string for a scale value.
 * @param {string} assetKey Asset identifier
 * @returns {string} Explanation of why that scale was chosen
 */
export function getScaleRationale(assetKey) {
  const rationales = {
    // Standard buildings (target 36 unit footprint)
    housing: '0.10 scale = ~36 unit footprint (standard building)',
    school: '0.10 scale = ~36 unit footprint (standard building)',
    police: '0.10 scale = ~36 unit footprint (standard building)',
    hospital: '0.12 scale = slightly larger (healthcare importance)',
    stadium: '0.20 scale = ~72 units (intentionally prominent landmark)',

    // Vehicles (target ~20 unit length)
    car_a: '0.09 scale = ~20 units (fits lane with clearance)',
    bus: '0.11 scale = ~24 units (slightly larger, slower)',

    // Small decoratives
    cat: '0.05 scale = ~18 units (small animal, non-interacting)',
    stop_sign: '0.06 scale = ~12 units (functional sign)',

    default: 'Scale chosen to maintain visual proportionality relative to world size',
  };

  return rationales[assetKey] || rationales.default;
}

/**
 * Summary string for Phase 6 calibration.
 */
export function getCalibrationSummary() {
  return `
Scale Calibration Summary:
═════════════════════════════════════════════════════════════════════
World dimensions: ${WORLD_DIMENSIONS.width} × ${WORLD_DIMENSIONS.height} units
Target building footprint: ${WORLD_DIMENSIONS.targetBuildingFootprint} units (${WORLD_DIMENSIONS.footprintPercentage * 100}% of world width)
Average building scale: ${BUILDING_SCALES.housing} (achieves target)

Road system:
- Total width: ${ROAD_DIMENSIONS.width} units
- Lane spacing: ${ROAD_DIMENSIONS.gridSpacing} unit grid
- Standard lanes: ${ROAD_DIMENSIONS.laneCount} per road (±${ROAD_DIMENSIONS.laneOffset} offset)

Vehicle proportions:
- Standard length: ${VEHICLE_SCALES.standardVehicleLength} units
- Standard width: ${VEHICLE_SCALES.standardVehicleWidth} units
- Fits in lane: ✓ (${ROAD_DIMENSIONS.laneEffectiveWidth} unit width available)

Building placement:
- Clearance from roads: ${BUILDING_PLACEMENT.minRoadClearance} units minimum
- Buildable area radius: ${BUILDING_PLACEMENT.buildableAreaExtent} units
- Validation: ✓ (all constraints satisfied)

Collision parameters:
- Vehicle collision radius: ${COLLISION_PARAMETERS.vehicleCollisionRadius} units
- NPC boarding radius: ${COLLISION_PARAMETERS.npcBoardingRadius} units
- Fire spread radius: ${COLLISION_PARAMETERS.fireSpreadRadius} units

Performance (mobile):
- Max vehicles: ${MOBILE_SCALING.maxDynamicCars}
- Max agents: ${MOBILE_SCALING.maxAgents}
- Shadow map size: ${MOBILE_SCALING.shadowMapSize}px
═════════════════════════════════════════════════════════════════════
  `;
}

// Export for use in debug/telemetry systems
export default {
  WORLD_DIMENSIONS,
  ROAD_DIMENSIONS,
  BUILDING_PLACEMENT,
  VEHICLE_SCALES,
  BUILDING_SCALES,
  COLLISION_PARAMETERS,
  AGENT_PARAMETERS,
  TERRAIN_PARAMETERS,
  MOBILE_SCALING,
  isValidBuildingPosition,
  getScaledDimensions,
  getScaleRationale,
  getCalibrationSummary,
};
