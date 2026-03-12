# 🔬 GREY SCREEN - DEEPER RENDERING AUDIT

**Date:** March 12, 2026
**Status:** Investigating remaining grey screen causes after cloud fix

---

## Issues Found in Deeper Audit

### 🔴 CRITICAL ISSUE #1: Skybox Not Being Captured/Used

**File:** `src/world/createScene.js:91`
**Current Code:**
```javascript
const { skyMaterial, sunSphere, moonSphere, cloudLayers } = initSky(scene, sun);
```

**Problem:** The `skybox` mesh is created in `skySystem.js` line 25-27:
```javascript
const skybox = MeshBuilder.CreateBox("skyBox", { size: 2000 }, scene);
skybox.infiniteDistance = true;
skybox.material = skyMaterial;
```

But it's **NOT being destructured in createScene.js**!

**Impact:**
- Skybox mesh exists in scene but is not stored in any variable
- Cannot control its rendering group, visibility, or properties
- If skybox is being culled or not rendered, there's no way to debug it

**Symptom of this issue:**
- World appears grey/dark because the Babylon.js SkyMaterial might not be rendering
- Without the skybox, the scene.clearColor becomes visible instead (light blue)
- But if fog is overlaying that, user sees grey

**Fix Required:**
```javascript
// src/world/createScene.js line 91:
const { skybox, skyMaterial, sunSphere, moonSphere, cloudLayers } = initSky(scene, sun);

// Then set rendering group:
skybox.renderingGroupId = -1;  // Background layer (renders first)
```

---

### 🔴 CRITICAL ISSUE #2: Missing Rendering Groups on Sky Elements

**File:** `src/world/skySystem.js`

**Current State:**
```javascript
// Skybox (line 25-27)
const skybox = MeshBuilder.CreateBox("skyBox", { size: 2000 }, scene);
skybox.infiniteDistance = true;
// NO renderingGroupId assigned - defaults to 0 (WORLD LAYER)

// Cloud planes (line 87-88)
const cloudPlane = MeshBuilder.CreatePlane(`cloudLayer${index}_${i}`,
  { width: 1200, height: 600 }, scene);
// NO renderingGroupId assigned - defaults to 0 (WORLD LAYER)

// Sun/Moon (lines 60, 69)
sunSphere.renderingGroupId = 0;  // ✅ Explicitly set
moonSphere.renderingGroupId = 0; // ✅ Explicitly set
```

**Problem:** In Babylon.js rendering groups:
- `-1` = Background (renders FIRST, behind everything)
- `0` = Default/World (renders SECOND, main scene)
- `1+` = Foreground (renders LAST, in front of everything)

**Current Issue:**
- Skybox is at group 0 = renders same time as world
- Cloud planes are at group 0 = render same time as world
- No explicit ordering = relies on mesh addition order
- Can cause z-fighting or incorrect depth ordering

**What SHOULD happen:**
```javascript
// Skybox should be background
skybox.renderingGroupId = -1;

// Clouds should render AFTER world (so they're in front with depth testing)
cloudPlane.renderingGroupId = 1;
```

---

### 🟠 HIGH ISSUE #3: Fog Settings Might Be Killing Visibility

**Files:** `src/world/createScene.js:62-65` and `src/world/sceneTuning.js:34-36`

**createScene.js Sets:**
```javascript
scene.fogMode = Scene.FOGMODE_LINEAR;
scene.fogColor = new Color3(0.75, 0.82, 0.90);  // Light blue
scene.fogStart = CONFIG.world.fogStart;        // 600 (from config)
scene.fogEnd = CONFIG.world.fogEnd;            // 1400 (from config)
```

**sceneTuning.js OVERRIDES:**
```javascript
scene.fogMode = 1;      // LINEAR (same)
scene.fogStart = 500;   // Changes 600 → 500 (fog closer to camera)
scene.fogEnd = 1600;    // Changes 1400 → 1600 (fog extends further)
scene.fogColor = new Color3(0.75, 0.82, 0.90);  // Light blue (same)
```

**Potential Issue:**
- Fog starts at 500 units from camera
- Camera initial radius = 190, so fog starts at ~310 units from camera
- At initial distance, fog is NOT active (camera is closer than fogStart)
- But if camera moves/zooms, fog blending could create grey effect

**Recommended Fix:**
- Fog should start further (600+) to prevent world obscuring
- OR ensure fog color matches sky color exactly

---

### 🟠 HIGH ISSUE #4: Scene Clear Color Not Matching Sky

**File:** `src/world/createScene.js:29`
```javascript
scene.clearColor = new Color4(0.55, 0.75, 0.95, 1.0);
```

**Issue:** Clear color is used when scene first renders or if nothing is drawn.

**Current Values:**
- R: 0.55 (light)
- G: 0.75 (lighter)
- B: 0.95 (very light blue)

**But skySystem sets:**
```javascript
// In updateSkyIntensity:
const daySky = new Color3(0.72, 0.82, 0.93);
const nightSky = new Color3(0.02, 0.03, 0.07);
```

**Mismatch:**
- Clear color: (0.55, 0.75, 0.95) - different from both day/night sky
- This can cause visible seam or color popping

**Recommendation:**
```javascript
// Make clear color match day sky
scene.clearColor = new Color4(0.72, 0.82, 0.93, 1.0);
```

---

### 🟡 MEDIUM ISSUE #5: Camera Initialization Might Show Grey Before Scene Loads

**File:** `src/world/createScene.js:37`
```javascript
const camera = new ArcRotateCamera('camera', -Math.PI / 2.2, 1.05, 190,
  new Vector3(0, 5, 0), scene);
```

**Analysis:**
- Initial radius: 190 (distance from target)
- Initial target: (0, 5, 0)
- Beta: 1.05 radians ≈ 60 degrees elevation
- Alpha: -Math.PI/2.2 ≈ horizontal rotation

**Camera position calculation:**
```
x = target.x + radius * sin(beta) * cos(alpha)
y = target.y + radius * cos(beta)
z = target.z + radius * sin(beta) * sin(alpha)

x ≈ 0 + 190 * 0.866 * cos(-1.43) ≈ -130
y ≈ 5 + 190 * 0.498 ≈ 100
z ≈ 0 + 190 * 0.866 * sin(-1.43) ≈ -163
```

**Issue:** Camera is positioned to look DOWN at origin, not straight across
- Could be looking DOWN at clouds if they render
- With clouds at y=500-700, camera at y=100 is looking UP at them
- Not the issue

---

### 🟡 MEDIUM ISSUE #6: SkyMaterial Might Not Be Rendering

**File:** `src/world/skySystem.js:11-23`

**SkyMaterial Settings:**
```javascript
const skyMaterial = new SkyMaterial("skyMaterial", scene);
skyMaterial.backFaceCulling = false;  // ✅ Good - render both sides
skyMaterial.turbidity = 2.5;
skyMaterial.luminance = 1.1;         // Brightness
skyMaterial.inclination = 0.5;       // Day/night
skyMaterial.azimuth = 0.25;
skyMaterial.rayleigh = 2.8;
skyMaterial.mieDirectionalG = 0.8;
skyMaterial.mieCoefficient = 0.005;
```

**Potential Issues:**
1. `luminance = 1.1` might be too high - could wash out to white/grey
2. `turbidity = 2.5` might create haze that appears grey
3. Material updates happen in `scene.onBeforeRenderObservable` (line 36-48)
   - If this observable doesn't fire, sky won't update

**Recommendation:**
```javascript
skyMaterial.luminance = 1.0;   // Standard brightness
skyMaterial.turbidity = 1.5;   // Less haze
```

---

### 🟡 MEDIUM ISSUE #7: Cloud Planes Might Still Be Blocking at Wrong Angles

**File:** `src/world/skySystem.js:87-91`

**Current Setup (After My Fix):**
```javascript
cloudHeights = [500, 600, 700];  // High altitude
cloudPlane.position.y = height;
cloudPlane.rotation.x = Math.PI / 2;  // Horizontal

// But no renderingGroupId!
// And no check if camera is looking directly at them
```

**Remaining Issue:**
- Cloud planes are 1200 units wide, 600 units tall
- They're positioned horizontally at y=500, 600, 700
- Position x alternates: ±600, so coverage is from x=-600 to x=1200
- If camera orbits or pans, it could face them directly

**Camera Frustum Issue:**
- Camera FOV is standard (≈90 degrees)
- At distance 190, can see horizontally ~300 units
- Cloud plane is 1200 wide - MUCH larger
- Camera positioned centrally will almost always see a cloud

**Symptom:**
- If camera faces a cloud plane directly with `disableDepthWrite = false`
- Even though depth write is enabled now, the cloud might still be visible if it's in the frustum

---

## Summary Table: Rendering Issues

| Issue | Severity | File | Impact | Status |
|-------|----------|------|--------|--------|
| Skybox not captured | 🔴 CRITICAL | createScene.js | Sky might not render | Not fixed |
| Missing renderingGroupId on skybox | 🔴 CRITICAL | skySystem.js | Render order undefined | Not fixed |
| Missing renderingGroupId on clouds | 🟠 HIGH | skySystem.js | Depth ordering unclear | Not fixed |
| Fog overrides clear color | 🟡 MEDIUM | sceneTuning.js | Visual seams possible | Not addressed |
| Clear color mismatch | 🟡 MEDIUM | createScene.js | Color popping | Not addressed |
| SkyMaterial luminance | 🟡 MEDIUM | skySystem.js | Might wash out to grey | Not addressed |
| Cloud planes always in view | 🟡 MEDIUM | skySystem.js | Still blocking with depth | Not addressed |

---

## Root Cause Hypothesis

The grey screen is likely caused by **COMBINATION of:**

1. **Skybox not being rendered** (not captured/stored, no renderingGroupId)
2. **Scene.clearColor being visible** (appears light blue, but with fog can look grey)
3. **Fog blending** when camera moves (fog color blends with objects)
4. **Cloud planes still being in camera view** despite fixes
5. **SkyMaterial might have visibility settings that hide it**

---

## Recommended Complete Fix

### Step 1: Fix Skybox Capture & Rendering Group
```javascript
// src/world/createScene.js line 91
const { skybox, skyMaterial, sunSphere, moonSphere, cloudLayers } = initSky(scene, sun);
skybox.renderingGroupId = -1;  // Ensure it renders first as background
console.log('[BOOT] Skybox captured and configured');
```

### Step 2: Fix Cloud Plane Rendering Group
```javascript
// src/world/skySystem.js line 113-114 (inside cloud plane loop)
cloudPlane.isPickable = false;
cloudPlane.renderingGroupId = 1;  // Render AFTER world, let depth handle it
cloudPlane.material = cloudMaterial;
```

### Step 3: Standardize Clear Color
```javascript
// src/world/createScene.js line 29
scene.clearColor = new Color4(0.72, 0.82, 0.93, 1.0);  // Match daytime sky
```

### Step 4: Adjust SkyMaterial
```javascript
// src/world/skySystem.js lines 15-16
skyMaterial.turbidity = 1.5;   // Less atmospheric haze
skyMaterial.luminance = 1.0;   // Standard brightness (was 1.1)
```

### Step 5: Verify Fog Doesn't Choke World
```javascript
// src/world/sceneTuning.js line 34-35
scene.fogStart = 800;   // Start fog further away
scene.fogEnd = 2000;    // Let world be visible
```

---

## Testing After All Fixes

1. [ ] Load game - world visible (not grey)
2. [ ] Initial camera view - sky is blue, world is visible
3. [ ] Zoom out (mouse wheel) - sky remains visible, no grey veil
4. [ ] Pan camera around - no grey walls appear
5. [ ] Console logs show skybox captured and renderingGroupId set
6. [ ] No visual seams between sky and world
7. [ ] Clouds subtle but visible overhead

---

## Prevention

Add to code review:
- [ ] All Sky/Atmosphere meshes must have explicit renderingGroupId
- [ ] Skybox/Sky materials must be tested in scene context
- [ ] Clear color must match expected sky color
- [ ] Fog parameters must be tested with world scale
- [ ] Camera position must be tested at all radius/angle extremes

---

**Confidence Level:** 🟡 MEDIUM - These are rendering pipeline issues that could cause grey screen, but visual verification needed after fixes.
