/**
 * collisionCalibration.js — Collision System Documentation & Calibration
 * =======================================================================
 * Comprehensive documentation of all collision systems, physics parameters,
 * and interaction radii used throughout Ascent Empire. This module ensures
 * consistency and clarity in physics simulation and hit detection.
 *
 * ARCHITECTURE OVERVIEW:
 * - Buildings: True Rapier3D physics bodies with compound colliders
 * - Vehicles/NPCs: Circle-distance detection (simplified, performant)
 * - Boundaries: Invisible walls + coordinate clamping
 * - Environmental: Water hazards, fire spread via distance checks
 */

// ═══════════════════════════════════════════════════════════════════════════
// PHYSICS ENGINE CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Rapier3D physics world configuration.
 * Drives all true physics-based collision (buildings, boundary walls).
 */
export const PHYSICS_WORLD_CONFIG = {
  // Gravity simulation
  gravity: {
    x: 0, // units/s² (no sideways acceleration)
    y: -9.81, // units/s² (Earth-like gravity, unused for ground-based entities)
    z: 0, // units/s² (no sideways acceleration)
  },

  // Time stepping
  timestep: null, // Set dynamically: Math.min(dt, 1/30) max 30Hz updates
  maxFrameTimeStep: 1 / 30, // seconds (33ms = 30Hz update cap)

  // Solver parameters
  numSolverIterations: 4, // Physics constraint iterations per step
  dampingRatio: 0.99, // Energy damping (0.99 = minimal damping)

  // Enablement flags
  enableBuildingPhysics: true, // All buildings have rigid bodies
  enableWallPhysics: true, // Boundary walls have physics bodies
  enableDynamicEntities: false, // Vehicles don't use physics bodies (distance-based instead)
};

// ═══════════════════════════════════════════════════════════════════════════
// BUILDING COLLISION SYSTEM
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Building collision configuration.
 * Uses compound colliders: base + roof portions for visual accuracy.
 */
export const BUILDING_COLLISION = {
  // Rigid body type
  bodyType: 'fixed', // Buildings are immovable
  properties: {
    restitution: 0.1, // Minimal bounce
    friction: 0.5, // Moderate friction
    angularDamping: 0.1, // Rotation damping
  },

  // Compound collider strategy
  colliderStrategy: 'compound', // Two-part collider: base + roof

  // Base collider (lower 80% of building height)
  baseCollider: {
    type: 'cuboid',
    heightFraction: 0.8, // 80% of total bounding box height
    offsetY: -0.2, // Positioned in lower 20%
    purpose: 'Prevent vehicle/NPC clipping through lower structure',
    extentCalculation: 'Uses mesh bounding box extents directly',
  },

  // Roof collider (upper 20% of building height, inset)
  roofCollider: {
    type: 'cuboid',
    heightFraction: 0.2, // 20% of total bounding box height
    offsetY: 0.8, // Positioned in upper 80%
    insetFraction: 0.8, // Inset to 80% of base extent (prevents corner clipping)
    purpose: 'Block clipping through roof corners and overhangs',
  },

  // Position mapping
  positionReference: 'mesh.position', // Uses asset world position directly

  // Notes on design
  designRationale: `
Compound collider design provides:
1. Realistic collision with building base (prevents walking through walls)
2. Roof overhangs don't extend far beyond collision bounds
3. Visual precision: collider matches visible model footprint
4. Performance: two simple cuboids better than complex mesh colliders
  `,
};

// ═══════════════════════════════════════════════════════════════════════════
// BOUNDARY WALL COLLISION SYSTEM
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Boundary wall configuration.
 * 4 invisible walls contain the play area.
 */
export const BOUNDARY_WALL_CONFIG = {
  // Wall parameters
  halfExtent: 300, // units (from center to wall centerline)
  wallThickness: 4, // units
  wallHeight: 40, // units (tall enough to stop all entities)

  // Wall positions (centerline coordinates)
  walls: {
    north: { x: 0, z: -304, description: 'North boundary' },
    south: { x: 0, z: 304, description: 'South boundary' },
    east: { x: 304, z: 0, description: 'East boundary' },
    west: { x: -304, z: 0, description: 'West boundary' },
  },

  // Collision type
  bodyType: 'fixed', // Immovable walls
  colliderType: 'cuboid',

  // Dimensions per wall
  northWall: {
    width: 612, // HALF_EXTENT * 2 + WALL_THICK * 2
    depth: 4, // WALL_THICK
    height: 40,
  },
  southWall: {
    width: 612,
    depth: 4,
    height: 40,
  },
  eastWall: {
    width: 4, // WALL_THICK
    depth: 608, // Adjusted for proper coverage
    height: 40,
  },
  westWall: {
    width: 4,
    depth: 608,
    height: 40,
  },

  // Additional safety: coordinate clamping
  enforceClamping: true,
  clampRadius: 298, // units (HALF_EXTENT - 2, ensures entities stay inside walls)

  // Purpose
  purpose: 'Hard boundaries preventing entity escape, redundant with coordinate clamping',
};

// ═══════════════════════════════════════════════════════════════════════════
// DYNAMIC ENTITY COLLISION (Vehicles & NPCs)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Vehicle and NPC collision detection.
 * Uses simplified circle-distance checks (not true physics bodies).
 * This design prioritizes gameplay performance over physics accuracy.
 */
export const DYNAMIC_COLLISION = {
  // Architecture decision
  implementation: 'distance-based (not physics bodies)',
  rationale: `
Simplified distance-based detection chosen for:
1. Performance: 40+ entities with true physics bodies = expensive
2. Gameplay: Circle radii provide intuitive, predictable behavior
3. Mobile compatibility: Low CPU cost enables better frame rates
4. Determinism: No surprise physics interactions
  `,

  // Vehicle collision with NPCs
  vehicleCollision: {
    detectionType: 'circle-distance (XZ plane)',
    collisionRadius: 5, // units
    detectionThreshold: 5.0, // units (trigger at exactly radius distance)
    effect: 'NPC dies instantly (car_collision)',
    logLevel: 'debug', // Log each collision event
    safetyMargin: 0, // No padding (tight collision)

    calculation: `
distance = sqrt((npc.x - vehicle.x)² + (npc.z - vehicle.z)²)
collision = distance < 5.0
    `,
  },

  // NPC boarding vehicles
  boardingSystem: {
    detectionRadius: 7, // units (larger than collision radius)
    requirementCapacity: '<2 passengers', // Must have room
    boardingChance: 0.08, // 8% probability per frame
    boardingAnimation: 'Position offset by ±1.2 units (seat position)',
    rideDuration: { min: 6, max: 18 }, // seconds

    boardingLogic: `
if (distance < 7.0 && passengers < 2 && random() < 0.08):
  - NPC enters boarding state
  - Position offset to seat position (left/right)
  - Exit after 6-18 second ride
    `,
  },

  // Fire spread hazard
  fireSpread: {
    spreadRadius: 40, // units (buildings within this distance can ignite)
    spreadProbability: 0.0006, // per second per building pair
    autoExtinguish: {
      enabled: true,
      condition: 'police.count > 0',
      duration: 120, // seconds before auto-extinguish
    },
    spreadLogic: `
for each burning_building:
  for each nearby_building (distance < 40):
    if random() < 0.0006 * dt:
      nearby_building.setFire()
    `,
  },

  // Water hazard collision
  waterHazard: {
    waterLevelY: 3.0, // units (Y coordinate defining water surface)
    detectionType: 'Y-position check',
    hazardEffect: 'Drowning (death after 3 seconds)',
    drownTime: 3.0, // seconds before death
    hazardLogic: `
if (entity.position.y < 3.0):
  entity.timeInWater += dt
  if (entity.timeInWater > 3.0):
    entity.kill('drowning')
    `,

    coastalNationCheck: {
      enabled: true,
      condition: 'nation.isCoastal',
      waterLevelWithinBounds: '3.5 units',
    },
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// NPC INTERACTION BOUNDARIES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * NPC movement and interaction boundaries.
 */
export const NPC_BOUNDARIES = {
  // Hard boundary (clamping)
  maxDistanceFromCenter: 298, // units
  clampLogic: `
if (abs(npc.x) > 298): npc.x = sign(npc.x) * 298
if (abs(npc.z) > 298): npc.z = sign(npc.z) * 298
  `,

  // Soft boundaries (target selection)
  spawnAreaRadius: 90, // units from center
  maxWaypointDistance: 170, // units from center

  // Target detection
  targetThreshold: 4, // units² (squared distance, = 2 unit radius)
  targetSelectionLogic: `
if (distance² < 4.0):
  // Reached target, select new waypoint
  target.x = random(-170, 170)
  target.z = random(-170, 170)
  `,
};

// ═══════════════════════════════════════════════════════════════════════════
// COLLISION RESPONSE BEHAVIOR
// ═══════════════════════════════════════════════════════════════════════════

/**
 * How collisions are handled and what happens as a result.
 */
export const COLLISION_RESPONSES = {
  // Vehicle hits NPC
  vehicleHitsNPC: {
    trigger: 'vehicle collision radius < NPC distance',
    responses: [
      'NPC death (car_collision)',
      'Sound effect (if implemented)',
      'Visual effect: death animation',
      'Statistics: increment car_collision counter',
    ],
  },

  // NPC boards vehicle
  npcBoarding: {
    trigger: 'NPC in boarding radius + capacity + chance',
    responses: [
      'NPC enters boarding state',
      'NPC follows vehicle (offset position)',
      'Ride timer: 6-18 seconds',
      'NPC exits at journey end',
    ],
  },

  // NPC hits building
  npcHitsBuilding: {
    trigger: 'NPC path intersects building',
    responses: [
      'Implicit: NPC selects new target',
      'No explicit collision response',
      'Behavior: wander away to new waypoint',
    ],
  },

  // Vehicle hits building
  vehicleHitsBuilding: {
    trigger: 'Vehicle path intersects building collider (Rapier)',
    responses: [
      'Vehicle stops (path blocked)',
      'No bounce or physics response',
      'Behavior: Implicit wrapping at map edge',
    ],
  },

  // Entity approaches fire
  entityNearFire: {
    trigger: 'Building within 40 unit fire spread radius + probability',
    responses: [
      'Fire spreads to nearby building',
      'Chain reaction possible',
      'Auto-extinguish if police deployed',
    ],
  },

  // Entity in water
  entityInWater: {
    trigger: 'Entity Y position < 3.0 units',
    responses: [
      'Drowning timer starts',
      '3 second countdown',
      'NPC death if timer exceeds 3.0s',
    ],
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// COLLISION SYSTEM VALIDATION & TESTING
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Validation functions for collision system correctness.
 */

/**
 * Check if vehicle and NPC positions would collide.
 * @param {Vector3} vehiclePos Vehicle world position
 * @param {Vector3} npcPos NPC world position
 * @returns {boolean} true if collision should occur
 */
export function checkVehicleNPCCollision(vehiclePos, npcPos) {
  const dx = vehiclePos.x - npcPos.x;
  const dz = vehiclePos.z - npcPos.z;
  const distanceSq = dx * dx + dz * dz;
  return distanceSq < (DYNAMIC_COLLISION.vehicleCollision.collisionRadius ** 2);
}

/**
 * Check if NPC is in boarding range of vehicle.
 * @param {Vector3} vehiclePos Vehicle position
 * @param {Vector3} npcPos NPC position
 * @returns {boolean} true if boarding is possible
 */
export function checkBoardingRange(vehiclePos, npcPos) {
  const dx = vehiclePos.x - npcPos.x;
  const dz = vehiclePos.z - npcPos.z;
  const distance = Math.sqrt(dx * dx + dz * dz);
  return distance < DYNAMIC_COLLISION.boardingSystem.detectionRadius;
}

/**
 * Check if building is within fire spread distance.
 * @param {Vector3} sourcePos Fire source position
 * @param {Vector3} targetPos Target building position
 * @returns {boolean} true if fire can spread
 */
export function checkFireSpread(sourcePos, targetPos) {
  const dx = sourcePos.x - targetPos.x;
  const dz = sourcePos.z - targetPos.z;
  const distance = Math.sqrt(dx * dx + dz * dz);
  return distance < DYNAMIC_COLLISION.fireSpread.spreadRadius;
}

/**
 * Check if NPC is within water hazard.
 * @param {Vector3} npcPos NPC position
 * @returns {boolean} true if NPC is in water
 */
export function checkWaterHazard(npcPos) {
  return npcPos.y < DYNAMIC_COLLISION.waterHazard.waterLevelY;
}

/**
 * Check if NPC is within play area bounds.
 * @param {Vector3} npcPos NPC position
 * @returns {boolean} true if within bounds
 */
export function checkBoundaryClamp(npcPos) {
  const maxDist = NPC_BOUNDARIES.maxDistanceFromCenter;
  return Math.abs(npcPos.x) <= maxDist && Math.abs(npcPos.z) <= maxDist;
}

// ═══════════════════════════════════════════════════════════════════════════
// DIAGNOSTIC & DEBUGGING HELPERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get summary of collision system configuration.
 */
export function getCollisionSystemSummary() {
  return `
Collision System Summary:
═════════════════════════════════════════════════════════════════════
Physics Engine: Rapier3D (dimforge/rapier3d-compat)

Building Collision:
- Type: True physics bodies (Rapier)
- Strategy: Compound colliders (base + roof)
- Immovable: Yes (fixed rigid bodies)

Boundary System:
- Walls: 4 invisible walls at play area edges
- Clamping: Coordinate clamping at ±298 units
- Double-redundancy: Walls + clamping

Vehicle/NPC Interaction:
- Implementation: Distance-based circle detection (NOT physics bodies)
- Collision radius: ${DYNAMIC_COLLISION.vehicleCollision.collisionRadius} units
- Boarding radius: ${DYNAMIC_COLLISION.boardingSystem.detectionRadius} units
- Rationale: Performance optimization for 40+ entities

Environmental Hazards:
- Fire spread: ${DYNAMIC_COLLISION.fireSpread.spreadRadius} unit radius
- Water hazard: Y < ${DYNAMIC_COLLISION.waterHazard.waterLevelY} units
- Drowning time: ${DYNAMIC_COLLISION.waterHazard.drownTime} seconds

NPC Boundaries:
- Max distance from center: ${NPC_BOUNDARIES.maxDistanceFromCenter} units
- Spawn area radius: ${NPC_BOUNDARIES.spawnAreaRadius} units
- Target reach threshold: ${NPC_BOUNDARIES.targetThreshold} units²

Performance:
- Physics timestep: max 30Hz (${PHYSICS_WORLD_CONFIG.maxFrameTimeStep}s)
- Solver iterations: ${PHYSICS_WORLD_CONFIG.numSolverIterations}
- Dynamic entities (no physics): ${DYNAMIC_COLLISION.implementation}

═════════════════════════════════════════════════════════════════════
  `;
}

/**
 * Get list of all collision triggers and their effects.
 */
export function getCollisionTriggersList() {
  return `
Collision Trigger Reference:
═════════════════════════════════════════════════════════════════════
1. Vehicle-NPC collision (distance < 5.0):
   → NPC dies immediately (car_collision)

2. NPC boarding (distance < 7.0 + capacity + chance):
   → NPC enters vehicle, offset to seat
   → Rides for 6-18 seconds
   → Exits at ride end

3. Fire spread (distance < 40.0 + probability):
   → Nearby building catches fire
   → Chain reaction possible
   → Auto-extinguish with police

4. Water hazard (Y < 3.0):
   → NPC drowns after 3 seconds
   → Death effect: drowning

5. Boundary violation (distance > 298):
   → Position clamped to ±298
   → Prevents out-of-world escape

═════════════════════════════════════════════════════════════════════
  `;
}

// Default export for convenience
export default {
  PHYSICS_WORLD_CONFIG,
  BUILDING_COLLISION,
  BOUNDARY_WALL_CONFIG,
  DYNAMIC_COLLISION,
  NPC_BOUNDARIES,
  COLLISION_RESPONSES,
  checkVehicleNPCCollision,
  checkBoardingRange,
  checkFireSpread,
  checkWaterHazard,
  checkBoundaryClamp,
  getCollisionSystemSummary,
  getCollisionTriggersList,
};
