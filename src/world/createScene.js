import { Engine, Scene, Color3, Color4, ArcRotateCamera, Vector3, HemisphericLight, DirectionalLight, PointLight, ShadowGenerator, GlowLayer } from '@babylonjs/core';
import { initSky, updateSkyIntensity } from './skySystem.js';
import { applyReadabilityEnhancements } from './sceneTuning.js';
import { CONFIG } from '../config.js';

export function createScene(canvas, providedEngine, deviceTier = 'mid') {
  console.group('[BOOT] Scene Creation');

  if (!canvas) {
    throw new Error('Canvas element is required for scene creation');
  }

  console.log('[BOOT] Canvas validated, creating Babylon engine/scene');
  console.log(`[BOOT] Using device tier: ${deviceTier}`);

  // Use provided engine or create new one (should always be provided in normal boot flow)
  const engine = providedEngine || new Engine(canvas, true, {
    preserveDrawingBuffer: false,
    stencil: true,
    antialias: true,
    adaptToDeviceRatio: true
  });

  if (!engine) {
    throw new Error('Failed to create or use Babylon engine');
  }

  // Create scene with proper clear color (matches daytime sky)
  const scene = new Scene(engine);
  scene.clearColor = new Color4(0.75, 0.84, 0.95, 1.0);

  // Safeguard: ensure clear color is never black or too dark
  const isTooDark = scene.clearColor.r < 0.2 && scene.clearColor.g < 0.2 && scene.clearColor.b < 0.2;
  if (isTooDark) {
    console.warn('[BOOT] Clear color was too dark, resetting to sky blue');
    scene.clearColor = new Color4(0.75, 0.84, 0.95, 1.0);
  }

  // Set hardware scaling for mobile optimization based on device tier
  const scalingConfig = CONFIG.mobile.hardwareScaling[deviceTier] || CONFIG.mobile.hardwareScaling.mid;
  let baseScale = clamp(window.devicePixelRatio, scalingConfig.minScale, scalingConfig.maxScale);

  // For low-end devices, be more aggressive with scaling
  if (deviceTier === 'low') {
    baseScale = Math.min(baseScale, 2.5);  // Cap at 2.5x downscaling for low-end
  }

  engine.setHardwareScalingLevel(1 / baseScale);
  console.log(`[BOOT] Hardware scaling level set to ${1 / baseScale} (device tier: ${deviceTier}, scale: ${baseScale})`);

  // Disable unnecessary rendering features for low-end devices
  if (deviceTier === 'low') {
    scene.collisionsEnabled = false;  // Disable collision detection for better performance
    scene.workerCollisions = false;
    console.log('[BOOT] Collision detection disabled for low-end device');
  }

  console.log('[BOOT] Scene created, setting up camera');

  // Create and configure camera
  const camera = new ArcRotateCamera('camera', -Math.PI / 2.2, 1.05, 190, new Vector3(0, 5, 0), scene);
  camera.lowerRadiusLimit = 30;
  camera.upperRadiusLimit = 1200;
  camera.lowerBetaLimit = 0.1;
  camera.upperBetaLimit = Math.PI / 2.2;
  camera.wheelDeltaPercentage = 0.015;
  camera.panningSensibility = 60;
  camera.inertia = 0.7;
  camera.angularSensibility = 300;

  // Ensure camera has proper defaults
  if (!camera.target) {
    camera.target = new Vector3(0, 5, 0);
  }

  // Enable collision detection to prevent camera clipping through objects
  camera.collisionRadius = new Vector3(10, 10, 10);
  camera.checkCollisions = true;

  // Attach camera controls to canvas
  try {
    camera.attachControl(canvas, true);
    if (!camera.inputs) {
      throw new Error('Camera inputs not properly initialized');
    }
    console.log('[BOOT] Camera attached to canvas');
  } catch (err) {
    const message = `Failed to attach camera controls: ${err.message}. Game will not be interactive.`;
    console.error('[BOOT]', message);
    console.error('[BOOT] Stack:', err.stack);

    // Show error to user and throw to prevent unplayable game
    throw new Error(message);
  }

  console.log('[BOOT] Configuring lighting and environment');

  // Configure scene environment
  scene.fogMode = Scene.FOGMODE_LINEAR;
  scene.fogColor = new Color3(0.75, 0.84, 0.95);
  scene.fogStart = CONFIG.world.fogStart;
  scene.fogEnd = CONFIG.world.fogEnd;

  // Lighting setup - optimize for device tier
  const hemi = new HemisphericLight('hemi', new Vector3(0.2, 1, 0.1), scene);
  if (deviceTier === 'low') {
    hemi.intensity = 1.2;  // Slightly reduced for mobile
  } else {
    hemi.intensity = 1.35;
  }
  hemi.groundColor = new Color3(0.45, 0.47, 0.45);

  const sun = new DirectionalLight('sun', new Vector3(-0.4, -1, -0.2), scene);
  sun.position = new Vector3(180, 260, -100);
  if (deviceTier === 'low') {
    sun.intensity = 2.5;  // Slightly reduced for mobile
  } else {
    sun.intensity = 2.8;
  }

  const moonLight = new PointLight('moon', new Vector3(-180, 120, 80), scene);
  moonLight.intensity = 0.12;

  // Disable moon light for low-end devices to save performance
  if (deviceTier === 'low') {
    moonLight.intensity = 0.05;  // Reduce night-time lighting
    moonLight.range = 500;  // Limit light range on mobile
  } else {
    moonLight.range = 1000;
  }

  // Shadows - configure based on device tier
  const shadowConfig = CONFIG.mobile.shadowConfig[deviceTier] || CONFIG.mobile.shadowConfig.mid;
  const shadows = new ShadowGenerator(shadowConfig.mapSize, sun);
  shadows.useBlurExponentialShadowMap = shadowConfig.useBlurExponential;
  shadows.blurKernel = shadowConfig.blurKernel;
  console.log(`[BOOT] Shadow quality set to ${deviceTier} tier (map size: ${shadowConfig.mapSize}, blur kernel: ${shadowConfig.blurKernel})`);

  // Glow effects - disable or reduce for mobile devices
  let glow = null;
  if (deviceTier === 'low') {
    // Disable glow entirely for low-end devices
    glow = new GlowLayer('glow', scene);
    glow.intensity = 0;  // Disabled for mobile performance
    console.log('[BOOT] Glow layer disabled for low-end device');
  } else if (deviceTier === 'mid') {
    glow = new GlowLayer('glow', scene);
    glow.intensity = 0.15;  // Reduced for mobile
  } else {
    glow = new GlowLayer('glow', scene);
    glow.intensity = 0.4;
  }

  console.log('[BOOT] Initializing sky and celestial objects');

  // Initialize sky with sun/moon - pass device tier for optimization
  const { skybox, skyMaterial, sunSphere, moonSphere, cloudLayers } = initSky(scene, sun, deviceTier);
  skybox.renderingGroupId = -1;  // Render skybox first, as background

  // Add glow to celestial bodies only if glow layer is enabled
  if (glow && glow.intensity > 0) {
    glow.addIncludedOnlyMesh(sunSphere);
    glow.addIncludedOnlyMesh(moonSphere);
  }

  // Apply readability enhancements
  applyReadabilityEnhancements(scene, {
    reduceFog: true,
    improveContrast: true,
    enhanceLighting: true,
    increaseGlow: true
  });

  // Sky controller for day/night cycle
  function skyController(daylight) {
    updateSkyIntensity(skyMaterial, daylight, sunSphere, moonSphere, cloudLayers);
    const daySky = new Color3(0.72, 0.82, 0.93);
    const nightSky = new Color3(0.02, 0.03, 0.07);
    scene.fogColor = Color3.Lerp(nightSky, daySky, daylight);
  }

  // Attach resize handler to maintain aspect ratio
  const resizeListener = () => {
    if (engine && !engine.isDisposed) {
      engine.resize();
    }
  };
  window.addEventListener('resize', resizeListener);

  console.log('[BOOT] Scene creation complete');
  console.groupEnd();

  return {
    engine,
    scene,
    camera,
    hemi,
    sun,
    moonLight,
    shadows,
    skyController
  };
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}
