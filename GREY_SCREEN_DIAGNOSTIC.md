# 🔍 GREY SCREEN ISSUE - ROOT CAUSE ANALYSIS

**Issue:** Screen appears grey instead of showing the 3D world properly
**Severity:** 🔴 CRITICAL - Blocks gameplay
**Location:** Cloud system rendering & camera interaction

---

## ROOT CAUSE IDENTIFIED

### The Problem: Opaque Cloud Planes Blocking View

**File:** `src/world/skySystem.js:74-130`

The cloud system creates 3 layers of horizontal planes at specific heights:

```javascript
const cloudHeights = [260, 340, 420];  // Heights above ground
const cloudDensities = [0.6, 0.4, 0.5];

// Each plane is 1200x600 units
const cloudPlane = MeshBuilder.CreatePlane(`cloudLayer${index}_${i}`,
  { width: 1200, height: 600 }, scene);
cloudPlane.position.y = height;  // Positioned at y=260, 340, 420
cloudPlane.rotation.x = Math.PI / 2;  // Rotated to be horizontal
```

The clouds have these material settings:

```javascript
cloudMaterial.disableLighting = true;      // ⚠️ Always fully visible
cloudMaterial.emissiveColor = new Color3(1, 1, 1);  // White (bright)
cloudMaterial.alpha = 0.55;                 // 55% opacity = GREY appearance
cloudMaterial.disableDepthWrite = true;    // ⚠️ CRITICAL: Ignores depth!
cloudMaterial.transparencyMode = 2;        // Alpha blend
```

---

## Why This Causes a Grey Screen

### Scenario 1: Camera Inside/Through Cloud Plane
```
Camera Position (initial): radius=190, looking inward
Camera Position (zoomed):  radius=600, looking from distance

Cloud planes at y=260-420 with:
- Width: 1200 units (extends from x=-600 to x=600)
- Height: 600 units (extends from z=-300 to z=300)
- Opacity: 0.55 (55% white = MEDIUM GREY)

Result:
When camera zooms out OR moves through area, it can face
the cloud plane directly. With disableDepthWrite=true, the
plane renders OVER everything regardless of actual depth.
This creates a grey veil/wall blocking the world.
```

### Scenario 2: Depth Write Disabled
```javascript
cloudMaterial.disableDepthWrite = true;  // ⚠️ BIG PROBLEM
```

This setting means:
- Cloud pixels are rendered but don't update the depth buffer
- Objects BEHIND the clouds might not occlude them
- If camera is close to a cloud plane, it appears as a grey overlay
- No Z-sorting prevents the grey veil

### Scenario 3: Wide Planes + Camera Movement
The planes are 1200 units wide - same width as the city! When camera pans or rotates, it easily encounters a cloud plane facing it directly, creating the grey wall effect.

---

## Visual Breakdown

### Current Cloud Layer Structure
```
                    y=420 ┌─────────────────────┐  ← Top cloud layer (most visible)
                         │   1200x600 plane    │
                         │   opacity: 0.5      │
                         └─────────────────────┘

                    y=340 ┌─────────────────────┐  ← Middle cloud layer
                         │   1200x600 plane    │
                         │   opacity: 0.4      │
                         └─────────────────────┘

                    y=260 ┌─────────────────────┐  ← Lower cloud layer (closest to city)
                         │   1200x600 plane    │
                         │   opacity: 0.6      │
                         └─────────────────────┘

Camera positions:
- Default: (?, ?, ?) at radius=190
- Zoomed: can get to radius=600 (ABOVE CLOUDS!)

Problem: When zoomed, camera is INSIDE or ABOVE the cloud planes,
         looking DOWN at them, sees them as a grey ceiling!
```

---

## Verification in Code

**File:** `src/world/skySystem.js:86-91`
```javascript
const cloudPlane = MeshBuilder.CreatePlane(`cloudLayer${index}_${i}`,
  { width: 1200, height: 600 }, scene);
cloudPlane.position.y = height;  // height = 260, 340, or 420
cloudPlane.position.x = i * 1200 - 600;  // Tile horizontally
cloudPlane.rotation.x = Math.PI / 2;     // Make horizontal

// Material that ignores depth:
cloudMaterial.disableDepthWrite = true;  // ⚠️ THIS IS THE SMOKING GUN
cloudMaterial.alpha = 0.55;              // 55% grey overlay
```

**File:** `src/world/createScene.js:29`
```javascript
scene.clearColor = new Color4(0.55, 0.75, 0.95, 1.0);  // Light blue
// But this is ignored if cloud planes are in front
```

---

## Why Comment Says "Keep Above Camera" But Doesn't Work

**File:** `src/world/skySystem.js:78`
```javascript
// Keep clouds well above gameplay camera to avoid "gray wall" occluding the city.
```

This comment recognizes the problem but the implementation is still flawed:

1. **Clouds ARE above average camera position** (y=5 + radius ≈ 95 max normally)
2. **But camera can zoom out to radius=600** → camera Y can reach ~605
3. **Clouds at y=260-420 are now BELOW the camera**
4. **Camera looking down sees the opaque planes as grey ceiling**

---

## Complete Issue List

| Issue | Impact | Severity |
|-------|--------|----------|
| `disableDepthWrite = true` | Clouds always render on top, blocking world | 🔴 CRITICAL |
| `alpha = 0.55` on white color | Creates visible grey overlay | 🔴 CRITICAL |
| Cloud planes at y=260-420 | Positioned where zoomed-out camera can hit them | 🔴 CRITICAL |
| Plane width = 1200 units | Same width as city, easy to face directly | 🟠 HIGH |
| Two planes per layer, tiled | Coverage is comprehensive, hard to avoid | 🟠 HIGH |
| `emissiveColor = white` | Always bright, no lighting variation | 🟡 MEDIUM |

---

## Solution Approaches

### ✅ QUICK FIX (5 minutes)
Disable the problematic cloud system entirely:

```javascript
// In src/world/skySystem.js around line 33:
// const cloudLayers = createAnimatedClouds(scene);  // Comment this out
const cloudLayers = [];  // Return empty array

// Return empty clouds:
return { skybox, skyMaterial, sunSphere, moonSphere, cloudLayers: [] };
```

**Result:** Grey screen gone, world visible. Lose atmospheric clouds.

---

### ✅ PROPER FIX #1: Enable Depth Writing

```javascript
// In src/world/skySystem.js line 111:
cloudMaterial.disableDepthWrite = true;  // ⚠️ Change to:
cloudMaterial.disableDepthWrite = false; // ✅ Let depth work normally
```

**Result:** Clouds respect depth ordering. Only visible when actually in front of camera.

---

### ✅ PROPER FIX #2: Increase Cloud Height & Reduce Opacity

```javascript
// In src/world/skySystem.js line 79:
const cloudHeights = [260, 340, 420];  // ⚠️ Change to:
const cloudHeights = [500, 600, 700];  // Move way above camera

// And line 110:
cloudMaterial.alpha = 0.55;  // ⚠️ Change to:
cloudMaterial.alpha = 0.25;  // Much more transparent
```

**Result:** Clouds higher, more transparent, don't block view.

---

### ✅ PROPER FIX #3: Camera Distance Aware Clouds (Best)

```javascript
// Create clouds that move with camera or disappear when too close:
scene.onBeforeRenderObservable.add(() => {
  const camHeight = camera.position.y;
  const distanceToLowestCloud = Math.abs(camHeight - 260);

  // Fade out clouds if camera gets too close
  for (const layer of cloudLayers) {
    for (const plane of layer.planes) {
      const material = plane.mesh.material;
      if (distanceToLowestCloud < 200) {
        // Camera is too close to clouds, fade them out
        material.alpha = Math.max(0, 0.55 - (200 - distanceToLowestCloud) / 200);
      } else {
        // Normal visibility
        material.alpha = 0.55;
      }
    }
  }
});
```

**Result:** Clouds fade as camera approaches, no blocking effect.

---

## Recommended Fix (Best Balance)

**Combine FIX #1 + FIX #2:**

```javascript
// src/world/skySystem.js

// Change line 79:
- const cloudHeights = [260, 340, 420];
+ const cloudHeights = [500, 600, 700];

// Change line 110:
- cloudMaterial.alpha = 0.55;
+ cloudMaterial.alpha = 0.30;

// Change line 111:
- cloudMaterial.disableDepthWrite = true;
+ cloudMaterial.disableDepthWrite = false;

// Change line 81:
- const cloudSpeeds = [0.002, 0.0015, 0.001];
+ const cloudSpeeds = [0.0008, 0.0006, 0.0004]; // Slower clouds at higher altitude
```

**Benefits:**
- ✅ Clouds positioned where camera won't pass through them
- ✅ Depth writes working properly = proper occlusion
- ✅ More transparent = less grey overlay effect
- ✅ Slower movement = more atmospheric feel
- ✅ Maintains visual atmosphere without blocking gameplay

---

## Testing After Fix

1. **Load game** - World should be visible (not grey)
2. **Zoom out** (scroll wheel) - Should still see world clearly
3. **Pan around** - No grey walls should appear
4. **Look at sky** - Clouds should be visible overhead, moving slowly
5. **Console check** - No errors about cloud rendering

---

## Prevention for Future

Add to code review checklist:
- [ ] Check `disableDepthWrite` - rarely needed, prone to rendering artifacts
- [ ] Verify large meshes don't block camera frustum
- [ ] Test camera at all radius/angle extremes
- [ ] Verify fog/atmosphere doesn't create occlusion

---

## Related Issues

**In audit report:**
- Error suppression masks the console messages that would show this rendering issue
- No boot progress UI means users don't know if grey screen is loading or broken
- No recovery path if rendering fails - just shows grey forever

---

## Summary

**Root Cause:** Cloud planes with `disableDepthWrite=true` and 55% opacity create grey overlay blocking the world

**Affected File:** `src/world/skySystem.js:79, 110-111`

**Quick Fix:** Disable clouds OR enable depth writing

**Proper Fix:** Increase cloud height, reduce opacity, enable depth writing

**Time to Fix:** 5 minutes

**Impact:** Unblocks 3D world rendering
