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
  activateCompatibilityMode
}) {
  bootFlow.setState(BOOT_STATES.checking_support);
  const support = await detectGraphicsSupport();

  if (!support.webglSupported && !support.webgpuSupported) {
    activateCompatibilityMode('WebGL and WebGPU are unavailable in this browser/runtime. Running 2D strategy mode.');
    return null;
  }

  bootFlow.setState(BOOT_STATES.loading_engine, {
    detail: support.webgpuSupported
      ? 'Attempting WebGPU startup with WebGL fallback.'
      : 'WebGPU unavailable. Starting WebGL mode.'
  });

  const { engine } = await createBestAvailableEngine(canvas, support);
  const state = createGameState();
  const { scene, camera, hemi, sun, moonLight, shadows, skyController } = createScene(canvas, engine);

  if (!scene || !camera || !engine) {
    throw new Error('Failed to initialize scene, camera, or engine');
  }

  state.worldRefs.scene = scene;
  state.worldRefs.engine = engine;
  state.worldRefs.camera = camera;

  return {
    engine,
    state,
    scene,
    camera,
    hemi,
    sun,
    moonLight,
    shadows,
    skyController
  };
}
