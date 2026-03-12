/**
 * Builds the validated 3D runtime context or returns null for compatibility mode.
 * @param {object} deps startup dependencies for support checks and scene creation
 * @returns {Promise<object|null>} runtime context for 3D flow, or null for fallback mode
 */
export async function createGameRuntimeContext({
  canvas,
  bootFlow,
  BOOT_STATES,
  detectGraphicsSupport,
  createBestAvailableEngine,
  createScene,
  createGameState,
  activateCompatibilityMode,
  detectDeviceTier = null
}) {
  console.group('[BOOT] Graphics Support Check');
  bootFlow.setState(BOOT_STATES.checking_support);

  // Detect device capabilities for optimization
  let deviceTier = 'mid'; // default
  if (detectDeviceTier) {
    try {
      deviceTier = await detectDeviceTier();
      console.log('[BOOT] Device tier detected:', deviceTier);
    } catch (err) {
      console.warn('[BOOT] Device detection failed, defaulting to mid-range:', err.message);
    }
  }

  const support = await detectGraphicsSupport();
  console.log('[BOOT] Graphics support:', { webgl: support.webglSupported, webgpu: support.webgpuSupported });

  if (!support.webglSupported && !support.webgpuSupported) {
    console.log('[BOOT] No WebGL/WebGPU support - activating compatibility mode');
    activateCompatibilityMode('WebGL and WebGPU are unavailable in this browser/runtime. Running 2D strategy mode.');
    return null;
  }

  console.groupEnd();

  console.group('[BOOT] Engine Initialization');
  bootFlow.setState(BOOT_STATES.loading_engine, {
    detail: support.webgpuSupported
      ? 'Attempting WebGPU startup with WebGL fallback.'
      : 'WebGPU unavailable. Starting WebGL mode.'
  });

  const { engine, mode } = await createBestAvailableEngine(canvas, support);
  console.log('[BOOT] Engine created in', mode, 'mode');

  if (!engine) {
    throw new Error('Failed to create Babylon engine');
  }

  const state = createGameState();
  console.log('[BOOT] Game state created');

  const sceneData = createScene(canvas, engine);
  const { scene, camera, hemi, sun, moonLight, shadows, skyController } = sceneData;

  // Ensure engine dimensions match canvas on initial creation
  engine.resize();
  console.log('[BOOT] Engine resized to match canvas');

  // Validate critical objects
  if (!scene) throw new Error('Scene creation failed');
  if (!camera) throw new Error('Camera creation failed');
  if (!engine) throw new Error('Engine is missing after scene creation');

  console.log('[BOOT] Scene, camera, and lighting initialized');

  // Store references in game state
  state.worldRefs.scene = scene;
  state.worldRefs.engine = engine;
  state.worldRefs.camera = camera;
  state.deviceTier = deviceTier;

  console.groupEnd();

  return {
    engine,
    state,
    scene,
    camera,
    hemi,
    sun,
    moonLight,
    shadows,
    skyController,
    deviceTier
  };
}
