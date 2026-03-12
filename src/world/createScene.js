import { Engine, Scene, Color3, Color4, ArcRotateCamera, Vector3, HemisphericLight, DirectionalLight, PointLight, ShadowGenerator, GlowLayer } from '@babylonjs/core';
import { initSky, updateSkyIntensity } from './skySystem.js';
import { applyReadabilityEnhancements } from './sceneTuning.js';
import { CONFIG } from '../config.js';

export function createScene(canvas, providedEngine) {
  console.group('[BOOT] Scene Creation');

  if (!canvas) {
    throw new Error('Canvas element is required for scene creation');
  }

  console.log('[BOOT] Canvas validated, creating Babylon engine/scene');

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

  // Set hardware scaling for mobile optimization
  engine.setHardwareScalingLevel(1 / clamp(window.devicePixelRatio, CONFIG.mobile.hardwareScalingMin, CONFIG.mobile.hardwareScalingMax));

  console.log('[BOOT] Scene created, setting up camera');

  // Create and configure camera
  const camera = new ArcRotateCamera('camera', -Math.PI / 2.2, 1.05, 190, new Vector3(0, 5, 0), scene);
  camera.lowerRadiusLimit = 55;
  camera.upperRadiusLimit = 600;
  camera.lowerBetaLimit = 0.5;
  camera.upperBetaLimit = 1.3;
  camera.wheelDeltaPercentage = 0.012;
  camera.panningSensibility = 80;

  // Ensure camera has proper defaults
  if (!camera.target) {
    camera.target = new Vector3(0, 5, 0);
  }

  // Attach camera controls to canvas
  try {
    const attached = camera.attachControl(canvas, true);
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

  // Lighting setup
  const hemi = new HemisphericLight('hemi', new Vector3(0.2, 1, 0.1), scene);
  hemi.intensity = 1.35;
  hemi.groundColor = new Color3(0.45, 0.47, 0.45);

  const sun = new DirectionalLight('sun', new Vector3(-0.4, -1, -0.2), scene);
  sun.position = new Vector3(180, 260, -100);
  sun.intensity = 2.8;

  const moonLight = new PointLight('moon', new Vector3(-180, 120, 80), scene);
  moonLight.intensity = 0.12;

  // Shadows
  const shadows = new ShadowGenerator(CONFIG.mobile.shadowMapSize, sun);
  shadows.useBlurExponentialShadowMap = true;
  shadows.blurKernel = 16;

  // Glow effects
  const glow = new GlowLayer('glow', scene);
  glow.intensity = 0.4;

  console.log('[BOOT] Initializing sky and celestial objects');

  // Initialize sky with sun/moon
  const { skybox, skyMaterial, sunSphere, moonSphere, cloudLayers } = initSky(scene, sun);
  skybox.renderingGroupId = -1;  // Render skybox first, as background
  glow.addIncludedOnlyMesh(sunSphere);
  glow.addIncludedOnlyMesh(moonSphere);

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
