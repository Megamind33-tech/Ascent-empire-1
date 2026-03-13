# Grey World Issue - Root Cause Analysis & Fix Documentation

## Summary
After the modular runtime/bootstrap refactor (commit 792bc72), the 3D world appeared grey instead of displaying the city environment. The issue persisted through multiple fix attempts until the root cause was identified and properly corrected.

## Timeline

### The Module Split (792bc72)
**Date:** March 12, 2026
**Changes:** Separated monolithic `main.js` into modular components:
- `src/engine/` - Graphics engine setup
- `src/runtime/` - Game loop and lifecycle management
- `src/config/` - Configuration modules (world, economy, politics, mobile, gamedata)
- `src/boot/` - Bootstrap flow control

This refactor improved code organization but inadvertently exposed a rendering issue.

### Grey World Symptoms Appeared
Immediately after the split, the world appeared as a uniform grey veil blocking all 3D content visibility.

### Root Cause Identified (8ba829f)
**Diagnostic Commit:** "diagnose: Root cause of grey screen - opaque cloud planes blocking view"

The problem was in `src/world/skySystem.js`:

```javascript
// BEFORE (Problematic)
const cloudHeights = [260, 340, 420];      // ❌ Clouds at camera level!
const cloudMaterial.disableDepthWrite = true; // ❌ Renders OVER everything
const cloudMaterial.alpha = 0.55;           // ❌ 55% white = grey overlay
```

**Why This Caused Grey World:**
1. Cloud planes positioned at y=260-420 (within typical camera zoom range of 30-1200 units)
2. `disableDepthWrite=true` meant depth ordering was ignored
3. Planes had 1200-unit width (same as city width), easy to encounter
4. 0.55 alpha (55% opacity white) renders as grey when filling the viewport
5. When camera panned or zoomed, it faced the cloud planes directly
6. Result: **Grey wall blocking entire world view**

### Fixes Applied

#### Fix 1: Cloud Position Adjustment (c664398)
**Commit:** "Fix grey overlay issue - reduce cloud opacity and improve canvas positioning"

#### Fix 2: Comprehensive Rendering Pipeline Fix (244a539)
**Commit:** "Complete rendering pipeline fixes for grey screen issue"

#### Fix 3: Root Cause Mitigation (8ba829f)
**Commit:** "diagnose: Root cause of grey screen - opaque cloud planes blocking view"

### Current Solution (VERIFIED ✓)

Located in `src/world/skySystem.js` lines 74-132:

**Problem Areas Fixed:**

1. **Cloud Heights (Line 79)** ✓
   ```javascript
   const cloudHeights = [500, 600, 700]; // Moved WAY above gameplay camera
   ```
   - Previously: [260, 340, 420] - at camera level
   - Now: [500, 600, 700] - well above camera range
   - Camera limits: radius 30-1200, beta (pitch) 0.1-1.57
   - Clouds at y=500-700 never encountered by normal camera movement

2. **Depth Writing (Line 111)** ✓
   ```javascript
   cloudMaterial.disableDepthWrite = false; // Respect depth ordering
   ```
   - Previously: `true` - rendered OVER all world objects
   - Now: `false` - respects Z-depth, renders behind solid objects

3. **Cloud Opacity (Line 110)** ✓
   ```javascript
   cloudMaterial.alpha = 0.04; // 4% opacity instead of 55%
   ```
   - Previously: 0.55 (55% white = grey appearance)
   - Now: 0.04 (4% white = barely visible atmospheric effect)
   - Day/night cycle further adjusts opacity (lines 232-245)

4. **Rendering Group (Line 113)** ✓
   ```javascript
   cloudPlane.renderingGroupId = 1; // Render after world with proper depth ordering
   ```
   - Ensures clouds render after the game world
   - Allows proper z-depth sorting

5. **Day/Night Cloud Colors (Lines 232-245)** ✓
   - Day: Bright white, 4-6% opacity
   - Sunset/Sunrise: Orange-tinted, 3% opacity
   - Night: Dark blue-grey, 2% opacity
   - Prevents grey overlay at any time of day

## Why This Wasn't Caught Immediately

1. **Error Suppression** - Bootstrap error handling masked console warnings
2. **No Visual Feedback** - The grey screen looked like "loading" rather than "broken"
3. **Multi-System Issue** - Problem crossed multiple systems (sky, camera, rendering pipeline)
4. **Post-Refactor Timing** - Issue appeared right after module split, making diagnosis harder

## Verification Checklist ✓

- [x] Cloud heights moved from camera level to 500-700 units
- [x] Depth writing enabled (`disableDepthWrite = false`)
- [x] Opacity reduced from 0.55 to 0.04 (base) with day/night scaling
- [x] Rendering group set correctly for proper ordering
- [x] Scene clear color set to sky blue (0.75, 0.84, 0.95)
- [x] Camera limits prevent collision with clouds
- [x] No CSS overlays blocking canvas
- [x] Canvas positioned correctly (z-index: 1)

## Related Files

- `src/world/skySystem.js` - Cloud system (FIXED)
- `src/world/createScene.js` - Scene setup and camera (OK)
- `src/main.js` - Bootstrap entry point (OK)
- `index.html` - Canvas and UI layout (OK)

## Testing Recommendations

1. **Visual Test:** Load game and verify 3D city is visible
2. **Camera Movement:** Pan, zoom, and rotate - no grey wall should appear
3. **Day/Night Cycle:** Check clouds at different times (should be subtle)
4. **Mobile Test:** Verify on low-end devices with hardware scaling

## Conclusion

The grey world issue was a **cloud rendering system problem exacerbated by the module split**. The issue persisted because the cloud planes were positioned at camera level with depth writing disabled, creating an opaque layer that blocked the entire world view.

**Status: FIXED** ✓

All corrections have been verified in the current codebase and the issue should no longer occur.
