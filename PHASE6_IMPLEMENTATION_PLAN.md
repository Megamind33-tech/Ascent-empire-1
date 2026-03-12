# PHASE 6: SCALE, COLLISION & ROAD CALIBRATION - IMPLEMENTATION PLAN

**Date:** March 12, 2026
**Status:** PLANNING
**Approach:** Careful, iterative changes with validation at each step

---

## EXECUTIVE SUMMARY

Phase 6 will calibrate proportions and optimize collision systems to make the city feel proportionate and believable. Based on thorough exploration, the current systems are **mostly solid** but need **targeted refinements**:

- ✅ Scale framework is good (0.05-0.20 range with 2% city width target)
- ✅ Road lanes are well-defined (18 lanes at ±4 unit offset)
- ⚠️ Vehicle-to-road proportions need validation
- ⚠️ Collision bounds need verification and potential optimization
- ⚠️ Building placement constraints need review
- ⏳ Turning radii and intersection behavior unimplemented

---

## CURRENT STATE SUMMARY

### What's Working Well
1. **Scale System** - Unified approach (0.05-0.20 multipliers)
2. **Road Grid** - Logical 120-unit spacing with clear lane definitions
3. **Physics Engine** - Rapier3D properly configured with gravity
4. **Building Colliders** - Compound collider strategy (base + roof) is smart
5. **Boundary System** - Walls and clamping prevent out-of-world issues

### What Needs Improvement
1. **Vehicle-to-Road Fit** - Verify vehicles don't look too tiny or large relative to lanes
2. **Collision Accuracy** - Ensure collider bounds match visual footprints
3. **Traffic Spawning** - Check for overlap potential and initial positioning
4. **Building Placement** - Validate 14-unit clearance is appropriate
5. **Intersection Logic** - Currently no explicit turn handling or intersection behavior
6. **Scale Documentation** - Asset manifest needs vehicle forward axis metadata

---

## DETAILED ANALYSIS OF FINDINGS

### 1. VEHICLE SCALE VALIDATION

**Current Vehicle Dimensions (from exploration):**
- Base scale factor: **0.09** (most cars)
- Bus scale factor: **0.11** (slightly larger)
- Target footprint: ~20 units

**Road Lanes:**
- Lane offset from centerline: **±4 units**
- Total road width: **22 units** (11 units each direction)
- Lane center-to-center spacing: **8 units**

**Assessment:**
- 2 vehicles cannot fit side-by-side in one lane ✓ (correct)
- Vehicles should fit with clearance in 8-unit lane spacing ✓ (appears correct)
- **ACTION:** Verify actual vehicle bounding boxes match expected dimensions

### 2. BUILDING SCALE & PLACEMENT VALIDATION

**Building Clearance Rules:**
- Buildings must be ≥14 units from road centerlines
- Buildable area: X/Z within ±220 units (city core)

**Current Building Scales:**
- Housing: 0.10 (expected footprint ~36 units)
- Stadium: 0.20 (expected footprint ~72 units - largest)
- Cat: 0.05 (expected footprint ~18 units - smallest)

**Assessment:**
- 14-unit clearance + ~18 unit halfwidth = 32 units from road
- Room for: road (22) + clearance (14) + building (~35) = ~71 units per side
- Road spacing: 120 units → 71 + 49 = 120 ✓ (math checks out)
- **ACTION:** Document this calculation, verify with visual inspection

### 3. COLLISION SYSTEM ASSESSMENT

**Building Colliders (Compound Strategy):**
- Base: 80% of height, lower 80% of bounding box ✓
- Roof: 20% of height, upper 20%, inset to 80% ✓
- **Benefit:** Prevents climbing/clipping through roof corners
- **Assessment:** Good design, should preserve

**Vehicle/Agent Collision:**
- Uses **circle-distance detection** (not true physics bodies)
- Collision radius: 5 units
- Boarding radius: 7 units
- **Assessment:** Acceptable for gameplay, simple and performant

**Boundary Walls:**
- 4 walls at ±300 units, 40 units tall, 4 units thick
- **Assessment:** Adequate, though could be slightly more robust

---

## PHASE 6 OBJECTIVES & TASKS

### Objective 1: Validate & Document Scale Proportions

**Task 1.1: Create Scale Documentation Module**
- File: `src/systems/scaleCalibration.js`
- Purpose: Centralize scale ratios and proportions
- Content:
  ```javascript
  // World dimensions
  const WORLD_WIDTH = 1800; // units
  const TARGET_BUILDING_FOOTPRINT = 36; // 2% of world width
  const AVERAGE_SCALE = 0.10; // achieves ~36 unit footprint

  // Road dimensions
  const ROAD_WIDTH_TOTAL = 22; // 11 per direction from centerline
  const LANE_OFFSET = 4; // units from road centerline
  const LANE_WIDTH = 8; // center-to-center spacing

  // Vehicle proportions
  const AVERAGE_VEHICLE_LENGTH = 20; // units (fits in lane)
  const AVERAGE_VEHICLE_WIDTH = 8; // units
  const VEHICLE_CLEARANCE = 2; // units safety margin per side

  // Building placement
  const MIN_ROAD_CLEARANCE = 14; // minimum distance from road centerline
  const BUILDABLE_AREA_EXTENT = 220; // X/Z distance from center
  ```

**Task 1.2: Verify Vehicle Dimensions**
- Measure actual vehicle bounding boxes after scaling
- Confirm: vehicles fit in lanes with appropriate clearance
- Document actual measurements vs expected

**Task 1.3: Validate Building Footprints**
- Sample 5 buildings: housing, stadium, hospital, base, police
- Measure post-scale bounding boxes
- Confirm: all fit within buildable grid with 14-unit clearance

**Task 1.4: Document Scaling Ratios**
- Create table: Asset Type → Scale → Expected Footprint → Actual Footprint
- Identify any outliers or inconsistencies
- Flag for correction if found

### Objective 2: Optimize Collision System

**Task 2.1: Review Building Collider Sizing**
- Verify compound collider extents match mesh bounding boxes
- Check that collider doesn't exceed visible model bounds
- Confirm roof portion doesn't clip through intersecting objects

**Task 2.2: Optimize NPC/Vehicle Collision Radii**
- Current: 5 unit collision radius
- Assessment: Might be slightly large (half of vehicle width)
- **Proposed:** Keep at 5 units (simple, safe)
- Document: Why this radius is appropriate

**Task 2.3: Test Collision Detection Accuracy**
- Manually verify at least 3 scenarios:
  1. Vehicle passing agent → collision triggers
  2. Agent navigating around building → proper avoidance
  3. Vehicle hitting wall → bounces appropriately

**Task 2.4: Document Collision Strategy**
- Create: `src/systems/collisionCalibration.js`
- Content: All collision radius values with justifications
- Include: Fallback behavior descriptions

### Objective 3: Validate Traffic Placement & Spacing

**Task 3.1: Audit Vehicle Spawn Positions**
- Current formula: `-240 + (i * 54) % 480`
- Verify: No initial overlaps
- Confirm: 54-unit spacing adequate for vehicle length (~20 units)
- Assessment: ✓ 54 units > 20 unit vehicle length + clearances

**Task 3.2: Review Lane Assignment**
- 18 defined lanes (9 roads, 2 per road)
- Current: 16 cars spawned initially
- Distribution check: Even spread across lanes?
- **Proposed:** Log initial positions to verify

**Task 3.3: Validate Agent Spawn Area**
- Spawn area: ±90 units (city center)
- Max agents: 24
- Assessment: Adequate density, no obvious clustering issues

### Objective 4: Improve Building Placement Validation

**Task 4.1: Review Build Pad Positions**
- 24 construction anchors (building pads)
- Verify: All within buildable area (±220 units)
- Verify: All meet 14-unit road clearance
- Check: Even distribution, no clusters

**Task 4.2: Enhance Placement Constraint Documentation**
- Current code: Basic distance checks
- **Action:** Add validation helper functions
- Content: `isValidBuildPosition(x, z)` with clear rules

**Task 4.3: Test Edge Cases**
- Building at minimum clearance (14 units) works?
- Building at road intersection works?
- Multiple buildings adjacent properly spaced?

### Objective 5: Add Turning Radius & Intersection Logic (Foundation)

**Task 5.1: Create Turning Radius Definitions**
- File: `src/systems/trafficCalibration.js`
- Content:
  ```javascript
  const TURNING_RADII = {
    car: 8,      // units (tight turn)
    bus: 12,     // units (wider turn)
    default: 10  // units (average)
  };
  ```

**Task 5.2: Document Intersection Behavior Gaps**
- Current: Vehicles move straight through intersections
- Gap: No actual turning logic
- Note: Phase 6 foundation; Phase 7 can implement

**Task 5.3: Prepare for Phase 7 Traffic Improvements**
- Document: What turning logic would need
- Identify: Which code changes required

---

## IMPLEMENTATION SEQUENCE

### Phase 6A: Documentation & Validation (Safe, No Code Changes)
1. ✓ Thorough exploration (complete)
2. Create scale documentation module
3. Create collision documentation module
4. Validate proportions (manual measurement)
5. Test collision scenarios manually
6. Document all findings

### Phase 6B: Code Enhancements (Low Risk, High Value)
1. Add scale calibration constants
2. Add collision calibration constants
3. Add validation helper functions
4. Update asset manifest with vehicle forward axis
5. Add logging for diagnostics

### Phase 6C: Testing & Validation
1. Build and verify no errors
2. Test game startup
3. Verify vehicle movement still correct
4. Test traffic behavior
5. Test building placement

### Phase 6D: Documentation & Reporting
1. Create Phase 6 summary
2. Document all scale values
3. Document all collision parameters
4. Create calibration guide for future phases
5. Commit and push

---

## SPECIFIC FILES TO MODIFY

### Files to CREATE (Low Risk - New Content)
1. `src/systems/scaleCalibration.js` - Scale constants & documentation
2. `src/systems/collisionCalibration.js` - Collision parameters & documentation
3. `src/systems/trafficCalibration.js` - Traffic/turning parameters

### Files to ENHANCE (Medium Risk - Review First)
1. `src/systems/assetLoader.js` - Document scale rationale
2. `public/assets/assetManifest.json` - Add vehicle forward axis metadata
3. `src/world/createCity.js` - Add placement validation helper
4. `src/world/createNationWorld.js` - Add diagnostic logging

### Files to REVIEW (No Changes)
1. `src/systems/rapierWorld.js` - Verify physics setup
2. `src/systems/physicsInteractionSystem.js` - Verify collision logic
3. `src/config/worldConfig.js` - Understand world dimensions
4. `src/config/mobileConfig.js` - Understand hardware scaling

---

## RISK MITIGATION STRATEGY

| Risk | Mitigation |
|------|-----------|
| Breaking existing vehicle/building scales | Create new modules, don't modify existing scale logic |
| Collision system becoming unstable | Only document current behavior, no physics engine changes |
| Unexpected proportions | Validate with visual inspection before/after |
| Lost documentation | Create separate calibration modules for clarity |
| Regression in traffic behavior | Test vehicle movement thoroughly before commit |

---

## SUCCESS CRITERIA

- ✅ All scale values documented with rationale
- ✅ Collision parameters clearly defined and commented
- ✅ Validation helper functions added (non-breaking)
- ✅ No regression in vehicle/building behavior
- ✅ Build succeeds without errors
- ✅ Game starts and plays normally
- ✅ All proportions verified as appropriate
- ✅ Foundation laid for Phase 7 improvements

---

## ESTIMATED TIMELINE

- Phase 6A (Documentation): 1-2 hours
- Phase 6B (Code Enhancements): 1-2 hours
- Phase 6C (Testing): 30 minutes
- Phase 6D (Reporting): 30 minutes
- **Total: 3-4 hours**

---

## NEXT PHASE HANDOFF (Phase 7)

Phase 7 will receive:
- ✅ Complete scale and collision documentation
- ✅ Clear separation of concerns (calibration modules)
- ✅ Foundation for turning radius implementation
- ✅ City planning can use validated constraints
- ✅ Improved code clarity for design iteration

---

**Status:** READY FOR IMPLEMENTATION
**Approach:** Thorough, careful, non-breaking changes
**Next:** Begin Phase 6A documentation work
