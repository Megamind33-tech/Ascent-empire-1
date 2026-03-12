/**
 * sceneTuning.js — Scene Visual Tuning & Readability
 * ================================================
 * Provides functions to tune environment settings for clarity and visual impact.
 * Focuses on fog, lighting, glow, and color balance for better readability.
 */

import { Color3 } from '@babylonjs/core';

/**
 * Apply readability enhancements to a scene
 * Improves visibility of terrain, roads, and buildings on first view
 *
 * @param {Scene} scene Babylon.js scene
 * @param {Object} options Configuration options
 * @param {boolean} options.reduceFog Reduce fog range for better city visibility (default: true)
 * @param {boolean} options.improveContrast Enhance color contrast and saturation (default: true)
 * @param {boolean} options.enhanceLighting Improve light balance (default: true)
 * @param {boolean} options.increaseGlow Increase glow effect on highlights (default: true)
 */
export function applyReadabilityEnhancements(scene, options = {}) {
  const {
    reduceFog = true,
    improveContrast = true,
    enhanceLighting = true,
    increaseGlow = true,
  } = options;

  // ── Fog Tuning ──────────────────────────────────────────────────
  // Make the city more visible by reducing fog start distance
  if (reduceFog) {
    // More visible fog that doesn't choke off the city
    scene.fogMode = 1; // LINEAR
    scene.fogStart = 500;    // Push fog start further out for better city visibility
    scene.fogEnd = 1600;     // Extended visibility range
    scene.fogColor = new Color3(0.75, 0.82, 0.90); // Warmer, brighter sky fog
  }

  // ── Color/Contrast Tuning ───────────────────────────────────────
  // Make terrain, roads, and buildings more distinct visually
  if (improveContrast) {
    // Slightly warmer, clearer atmosphere
    // This is typically done through lighting and sky adjustments
    // For now, we enhance fog color
    scene.fogColor = new Color3(0.75, 0.82, 0.90);
  }

  // ── Lighting Balance ────────────────────────────────────────────
  // If we have lights registered on the scene, we can adjust them
  if (enhanceLighting && scene.lights && scene.lights.length > 0) {
    for (const light of scene.lights) {
      // Enhance directional light (sun)
      if (light.name === 'sun' || light instanceof window.BABYLON?.DirectionalLight) {
        if (light.intensity < 2.0) {
          light.intensity *= 1.05; // Slight boost to sun
        }
      }

      // Tone down ground color if it's a hemispheric light
      if (light.name === 'hemi' || light instanceof window.BABYLON?.HemisphericLight) {
        if (light.groundColor) {
          // Slightly boost ground color to reduce shadows on terrain
          light.groundColor = new Color3(0.20, 0.22, 0.24);
        }
        if (light.intensity < 1.0) {
          light.intensity *= 1.02;
        }
      }
    }
  }

  // ── Glow Enhancement ────────────────────────────────────────────
  // Make light sources more prominent
  if (increaseGlow) {
    const glowLayer = scene.glowLayers?.length > 0 ? scene.glowLayers[0] : null;
    if (glowLayer) {
      // Increase glow intensity slightly for better visual pop
      glowLayer.intensity = 0.25; // Was 0.18, now more noticeable
    }
  }

  console.log('[SceneTuning] Applied readability enhancements to scene');
}

/**
 * Adjust rendering scale based on device performance
 * Helps mobile devices maintain frame rate while keeping quality
 *
 * @param {Engine} engine Babylon.js engine
 * @param {string} tier 'low', 'mid', or 'high'
 */
export function setRenderingTier(engine, tier = 'mid') {
  const scaling = {
    low: 0.75,   // 75% of native resolution (better performance)
    mid: 0.9,    // 90% of native resolution (balanced)
    high: 1.0,   // 100% of native resolution (maximum quality)
  };

  const scale = scaling[tier] || scaling.mid;
  engine.setHardwareScalingLevel(1 / scale);
  console.log(`[SceneTuning] Set rendering tier to ${tier} (scale: ${scale})`);
}

/**
 * Create a terrain-specific clear color based on time of day
 * Makes the scene feel more alive and realistic
 *
 * @param {Scene} scene Babylon.js scene
 * @param {number} daylight Value between 0 (night) and 1 (day)
 */
export function updateClearColorForTime(scene, daylight) {
  // Night: deep blue
  // Day: bright blue
  const nightColor = new Color3(0.05, 0.08, 0.15);
  const dayColor = new Color3(0.74, 0.82, 0.93);

  const clearColor = Color3.Lerp(nightColor, dayColor, daylight);
  scene.clearColor.r = clearColor.r;
  scene.clearColor.g = clearColor.g;
  scene.clearColor.b = clearColor.b;
}

/**
 * Optimize shadow quality for better terrain/building definition
 * Balances visual quality with performance
 *
 * @param {ShadowGenerator} shadows Babylon.js shadow generator
 * @param {string} quality 'low', 'mid', or 'high'
 */
export function configureShadowQuality(shadows, quality = 'mid') {
  const configs = {
    low: {
      mapSize: 1024,
      blurKernel: 8,
      useBlurExponential: false,
    },
    mid: {
      mapSize: 2048,
      blurKernel: 16,
      useBlurExponential: true,
    },
    high: {
      mapSize: 4096,
      blurKernel: 32,
      useBlurExponential: true,
    },
  };

  const config = configs[quality] || configs.mid;

  // Apply shadow settings
  if (shadows) {
    shadows.useBlurExponentialShadowMap = config.useBlurExponential;
    shadows.blurKernel = config.blurKernel;
    // Note: mapSize is set during ShadowGenerator creation, can't change it
  }

  console.log(`[SceneTuning] Configured shadow quality to ${quality}`);
}

/**
 * Disable unnecessary scene features for performance
 * Useful for lower-end devices
 *
 * @param {Scene} scene Babylon.js scene
 */
export function optimizeForLowEndDevices(scene) {
  // Disable post-processing effects
  scene.glowLayers?.forEach(g => g.dispose());

  // Reduce shadow cascades
  const lights = scene.lights || [];
  lights.forEach(light => {
    if (light.shadowGenerator) {
      light.shadowGenerator.useBlurExponentialShadowMap = false;
    }
  });

  // Disable reflection probes if present
  if (scene.reflectionProbes) {
    scene.reflectionProbes.forEach(p => p.dispose());
  }

  console.log('[SceneTuning] Optimized scene for low-end devices');
}

/**
 * Get recommended settings for current device
 * Returns configuration object based on device capabilities
 *
 * @returns {Object} { tier, renderingQuality, shadowQuality, enableGlow }
 */
export function getRecommendedSettings() {
  // Detect device based on memory, CPU, etc.
  const isLowEnd = navigator.deviceMemory <= 4 || navigator.hardwareConcurrency <= 2;
  const isMidRange = !isLowEnd && navigator.deviceMemory <= 8;

  if (isLowEnd) {
    return {
      tier: 'low',
      renderingQuality: 'low',
      shadowQuality: 'low',
      enableGlow: false,
      reduceFog: true,
    };
  } else if (isMidRange) {
    return {
      tier: 'mid',
      renderingQuality: 'mid',
      shadowQuality: 'mid',
      enableGlow: true,
      reduceFog: true,
    };
  } else {
    return {
      tier: 'high',
      renderingQuality: 'high',
      shadowQuality: 'high',
      enableGlow: true,
      reduceFog: true,
    };
  }
}
