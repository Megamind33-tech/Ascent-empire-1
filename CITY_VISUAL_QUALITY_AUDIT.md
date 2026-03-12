# CITY VISUAL QUALITY AUDIT & FIX PLAN

**Date:** March 12, 2026
**Status:** Diagnostic & Planning Phase
**Priority:** CRITICAL - Must fix before Phase 9

---

## IDENTIFIED ISSUES

### 1. VEHICLES NOT VISIBLE
**Severity:** CRITICAL
**Symptoms:** No cars visible on roads despite traffic system running

**Root Cause Analysis:**
- Vehicle scale: 0.09 (very small, ~18 units in 1800-unit world)
- Vehicle Y position: 0.4 (might be clipping into road or too high)
- Vehicles on roads at specific Z coordinates (e.g., z=116, z=124 near z=120 road)
- Road Y position: 0.12 (vehicles might be below or above roads)

**Vehicle Positioning Issues:**
```
Road height: 0.12
Vehicle height: 0.4
Road lanes: Z = ±116, ±124, ±236, ±244 (offsets from road centerline ±120, ±240, ±0)
```

**Hypothesis:**
- Vehicles are too small to see (0.09 scale)
- Y positioning mismatch between road and vehicle
- Z lane coordinates might not align properly with actual roads

---

### 2. BUILDING SIZE UNIFORMITY
**Severity:** HIGH
**Symptoms:** All houses/housing buildings appear same size, no visual variety

**Root Cause Analysis:**
- Base scale variation: Only ±10% (line 81 in cityPlanner.js)
- Scale range for housing: 0.10 * (0.9 to 1.1) = 0.09 to 0.11
- This is VERY subtle and imperceptible
- All buildings in same district use same base scale

**Impact:**
- "Fan house" uniform appearance
- No building size hierarchy
- Monotonous cityscape
- Looks unrealistic

**Needed Improvements:**
- Increase variation to ±20-30% (0.07 to 0.13 for housing)
- Add per-building-type size multipliers
- Create size tiers: small, medium, large variants
- Vary scale per district type

---

### 3. BUILDING OVERLAPS & PLACEMENT
**Severity:** HIGH
**Symptoms:** Buildings on top of each other, not properly spaced

**Root Cause Analysis:**
- Min spacing per district: 18-30 units (districtPlanner.js line 40, 56, etc.)
- Building footprints: ~36 units (2% of 1800-unit world)
- Spacing requirement: 18 units might be insufficient
- Placement validation might be too lenient

**Distance Calculation:**
- If building A footprint = 36 units
- If building B footprint = 36 units
- Minimum spacing 18 = buildings nearly touching (36+36+18 = 90 centers)
- Should be at least 30-40 units minimum spacing

---

### 4. VEGETATION QUALITY ISSUES
**Severity:** MEDIUM
**Symptoms:** Vegetation doesn't look natural, poor placement distribution

**Root Cause Analysis:**
- Tree scale: 0.08-0.12 (only ±20% variation)
- Shrub scale: 0.03-0.06 (only ±50% on small objects)
- Clustering factor: 0.7 (moderate, could be stronger)
- Vegetation not following terrain properly
- No height variation (all at Y=0.1)

**Vegetation Placement Issues:**
- Only respects building distance (18 units)
- Doesn't account for vegetation-to-vegetation visual depth
- No natural grouping patterns
- No terrain elevation awareness

---

## SCALE AUDIT

### Current Building Scales
```javascript
// Civic buildings
housing:        0.10
school:         0.10
hospital:       0.12
stadium:        0.20  // Only large building!

// Industrial
mine:           0.15
refinery:       0.15
barracks:       0.15

// Rural
cottage:        0.10
rural_farm:     0.12
```

**Problem:** Most buildings in 0.10-0.12 range
- 0.10 = 36 units footprint
- 0.12 = 43 units footprint
- Only 19% difference between "small" and "large"
- Needs 50-100% variation

### Recommended Scales (Per Building Type)
```javascript
// CIVIC - varied sizes for city importance
housing:        0.08 - 0.14  (small-medium residential)
school:         0.13 - 0.17  (medium institution)
hospital:       0.16 - 0.22  (large institution)
stadium:        0.22 - 0.28  (very large landmark)

// INDUSTRIAL - larger, more imposing
mine:           0.18 - 0.25  (large production)
refinery:       0.20 - 0.28  (very large production)
barracks:       0.17 - 0.24  (medium-large military)

// RURAL - smaller, cottage-like
cottage:        0.07 - 0.11  (small residential)
rural_farm:     0.10 - 0.16  (medium farm)
greenhouse:     0.09 - 0.13  (medium structure)
```

---

## VEHICLE SCALE & POSITIONING AUDIT

### Current Vehicle Configuration
```javascript
// All cars
car_a, car_b, car_c, car_model, gtr, sports_car: 0.09
police_car: 0.09
suv: 0.09
bus: 0.11

// Position Y: 0.4 (on road)
// Roads at Y: 0.12
```

**Problem:**
- Scale 0.09 = 32.4 unit footprint (too small for visibility)
- Should be ~25-35 units but visible
- Y position 0.4 is 0.28 units above road (might be visible, might clip)

### Recommended Vehicle Scales
```javascript
// Regular cars - more visible
car_a: 0.12  (was 0.09)
car_b: 0.12  (was 0.09)
car_c: 0.12  (was 0.09)
car_model: 0.12  (was 0.09)
gtr: 0.12  (was 0.09)
sports_car: 0.12  (was 0.09)
police_car: 0.12  (was 0.09)
suv: 0.12  (was 0.09)

// Bus - larger
bus: 0.14  (was 0.11)
```

---

## MINIMUM SPACING AUDIT

### Current Configuration
```javascript
// districtPlanner.js
'civic-center':         minSpacing: 20
'residential-north':    minSpacing: 18
'residential-south':    minSpacing: 18
'industrial-east':      minSpacing: 25
'entertainment':        minSpacing: 30
'rural-periphery':      minSpacing: 25
```

**Problem:**
- Building footprint ≈36 units
- Minimum spacing 18-30 units
- Two buildings could be: 36 + 18 + 36 = 90 unit distance
- Looks cramped when buildings this close

### Recommended Spacing
```javascript
// Each district accounts for building size variation
// Formula: baseSpacing + (expectedBuildingSize * 0.5)

'civic-center':         minSpacing: 35    // (was 20, compact but organized)
'residential-north':    minSpacing: 30    // (was 18, suburban feel)
'residential-south':    minSpacing: 30    // (was 18, suburban feel)
'industrial-east':      minSpacing: 40    // (was 25, large factories)
'entertainment':        minSpacing: 40    // (was 30, plaza-like)
'rural-periphery':      minSpacing: 35    // (was 25, spread out)
```

---

## VEGETATION AUDIT

### Current Configuration
```javascript
Trees:
  - Target: 45
  - Scale: 0.08-0.12
  - Min distance from buildings: 18
  - Min between trees: 12
  - Clustering: 0.7

Shrubs:
  - Target: 60
  - Scale: 0.03-0.06 (very small!)
  - Min distance from buildings: 10
  - Min between shrubs: 6
  - Clustering: 0.5
```

**Problems:**
- Shrubs at 0.03-0.06 scale are barely visible
- Only ±50% scale variation on small objects doesn't help
- Clustering factor 0.7 might be too moderate
- No height variation on placement
- Vegetation doesn't account for visual depth

### Recommended Vegetation Config
```javascript
Trees:
  - Target: 55-65  (increase from 45)
  - Scale: 0.10-0.16  (more visible, was 0.08-0.12)
  - Min distance from buildings: 20  (was 18)
  - Min between trees: 15  (was 12, less crowded)
  - Clustering: 0.8  (stronger clustering, was 0.7)
  - Height variation: Y offset ±2 units

Shrubs:
  - Target: 80-100  (increase from 60)
  - Scale: 0.06-0.12  (much more visible, was 0.03-0.06)
  - Min distance from buildings: 12  (was 10)
  - Min between shrubs: 8  (was 6)
  - Clustering: 0.6  (more spread, was 0.5)
  - Height variation: Y offset ±1 unit
```

---

## ACTIONABLE FIX PLAN

### Phase 1: Vehicle Visibility (CRITICAL)
1. **Increase vehicle scales** (0.09 → 0.12)
   - File: `src/systems/assetLoader.js` lines 263-271
   - Update getModelScale() for all vehicles
   - Impact: Vehicles ~33% larger, more visible

2. **Debug vehicle positioning**
   - Enable diagnostic logging in createNationWorld.js line 222
   - Log vehicle initial positions and lane assignments
   - Verify Z positions align with road lanes

3. **Verify road geometry**
   - Check road Y position vs vehicle Y position
   - Ensure no Z-fighting or clipping

### Phase 2: Building Size Variety (HIGH)
1. **Increase scale variation** (±10% → ±25%)
   - File: `src/world/cityPlanner.js` line 81
   - Change: `0.9 + Math.random() * 0.2` → `0.75 + Math.random() * 0.5`
   - Impact: Much more visible variation (25-75% of base scale)

2. **Add per-building-type size multipliers**
   - Small buildings: -15% from base
   - Medium buildings: ±0%
   - Large buildings: +20% from base
   - Apply multiplier after base scale selection

3. **Implement size tiers per district**
   - Civic: mix of small (offices), medium (schools), large (stadiums)
   - Residential: mostly small/medium (houses)
   - Industrial: large (factories, warehouses)
   - Rural: small/medium (cottages, farms)

### Phase 3: Building Spacing & Overlap Fixes (HIGH)
1. **Increase minimum spacing**
   - File: `src/systems/districtPlanner.js` lines 40-120
   - Update minSpacing per district (20 → 35-40)
   - Impact: Less crowded, more spacious city

2. **Improve placement validation**
   - File: `src/systems/placementValidator.js` line 44-53
   - Enhance distance checking algorithm
   - Consider building sizes in spacing calculation

3. **Verify placement success rates**
   - Add logging: How many placements attempted vs successful?
   - If <50% success rate, increase spacing more

### Phase 4: Vegetation Quality Improvements (MEDIUM)
1. **Increase vegetation scale and visibility**
   - File: `src/systems/detailPlacement.js` line 25-35
   - Trees: 0.08-0.12 → 0.10-0.16
   - Shrubs: 0.03-0.06 → 0.06-0.12
   - Impact: Vegetation much more visible

2. **Add height variation**
   - Vary Y position by ±2 units for trees
   - Vary Y position by ±1 unit for shrubs
   - Creates visual depth illusion

3. **Improve clustering algorithms**
   - Increase clustering factor for trees
   - Decrease for shrubs (more spread out)
   - Add grouping logic (trees in clusters, shrubs as understory)

4. **Increase vegetation targets**
   - Trees: 45 → 60
   - Shrubs: 60 → 90
   - Better coverage of world

---

## TESTING & VALIDATION

### Visual Tests (User Verification)
```
[ ] Vehicle Scale - Cars easily visible on roads
[ ] Vehicle Positioning - Cars sitting ON roads, not clipping
[ ] Building Size Variation - Clear visual difference between small/medium/large
[ ] Building Spacing - No overlapping buildings, comfortable spacing
[ ] Vegetation Coverage - Trees and shrubs visible throughout
[ ] Vegetation Quality - Natural-looking grouping, not random scatter
[ ] Overall City - Visually coherent, immersive, no "plastic" feeling
```

### Diagnostic Logging Tests
```
[ ] Vehicle creation: 25+ vehicles spawned
[ ] Vehicle positioning: All vehicles on assigned lanes
[ ] Building placement: 60-65 buildings placed with variety
[ ] Building sizing: Size variation visible (min/max ratio > 1.5x)
[ ] Vegetation placement: 100+ vegetation pieces distributed
[ ] No console errors or warnings
```

### Performance Tests
```
[ ] Build succeeds: npm run build passes
[ ] Frame rate: 60 FPS maintained
[ ] Memory: No leaks detected
[ ] Load time: <3 seconds world creation
```

---

## IMPLEMENTATION ORDER

1. **First:** Fix vehicle visibility (easiest, highest impact)
   - Update getModelScale() for vehicles
   - Test and verify

2. **Second:** Increase building scale variation
   - Update cityPlanner.js scale calculation
   - Test visual results

3. **Third:** Fix building overlaps
   - Increase minSpacing in districtPlanner.js
   - Re-run placement validation

4. **Fourth:** Improve vegetation quality
   - Update detailPlacement.js scales and positioning
   - Test visual results

5. **Final:** Comprehensive testing and validation
   - Verify all visual improvements
   - Check performance impact
   - Commit fixes

---

## EXPECTED IMPROVEMENTS

### Before Fixes
- Invisible vehicles
- Uniform building sizes (all "same")
- Overlapping buildings
- Barely visible vegetation
- City feels plastic/artificial

### After Fixes
- ✅ Visible, properly scaled vehicles
- ✅ Clear building size variation (small/medium/large)
- ✅ Well-spaced buildings (no overlaps)
- ✅ Visible, natural-looking vegetation
- ✅ Immersive, cohesive city environment

---

**Status:** Ready for implementation
**Next Step:** Begin fixes in priority order
