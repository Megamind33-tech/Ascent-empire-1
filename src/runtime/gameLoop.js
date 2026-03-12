/**
 * Centralized game loop runner to keep bootstrap orchestration thin.
 * Runs physics, economy, politics, event systems, and scene rendering each frame.
 */
export function startGameLoop({
  engine,
  scene,
  state,
  world,
  stepRapier,
  runEconomyTick,
  runPoliticalTick,
  runEventTick,
  npcSystem,
  checkpoints,
  updatePhysicsInteractions,
  updateCareer,
  updateMedia,
  buildNation,
  nationRuntimeRef,
  timeSystem,
  updateHUD,
  updateCameraNavigation,
  camera
}) {
  // Validate all required dependencies
  const missingDeps = [];
  if (!engine) missingDeps.push('engine');
  if (!scene) missingDeps.push('scene');
  if (!state) missingDeps.push('state');
  if (!world) missingDeps.push('world');
  if (!stepRapier || typeof stepRapier !== 'function') missingDeps.push('stepRapier');
  if (!runEconomyTick || typeof runEconomyTick !== 'function') missingDeps.push('runEconomyTick');
  if (!runPoliticalTick || typeof runPoliticalTick !== 'function') missingDeps.push('runPoliticalTick');
  if (!runEventTick || typeof runEventTick !== 'function') missingDeps.push('runEventTick');
  if (!npcSystem) missingDeps.push('npcSystem');
  if (!updateHUD || typeof updateHUD !== 'function') missingDeps.push('updateHUD');
  if (!updateCameraNavigation || typeof updateCameraNavigation !== 'function') missingDeps.push('updateCameraNavigation');
  if (!camera) missingDeps.push('camera');

  if (missingDeps.length > 0) {
    console.error('[BOOT] Game loop missing dependencies:', missingDeps.join(', '));
    throw new Error(`Cannot start game loop: missing ${missingDeps.join(', ')}`);
  }

  let last = performance.now();
  let firstFrameRendered = false;
  let errorCount = 0;

  console.log('[BOOT] Registering render loop with Babylon engine');

  engine.runRenderLoop(() => {
    try {
      const now = performance.now();
      const dt = Math.min(0.05, (now - last) * 0.001);
      last = now;

      if (!state.gamePaused) {
        stepRapier(world, dt);
        runEconomyTick(state, dt);
        runPoliticalTick(state, dt);
        runEventTick(state, dt);

        npcSystem.update(dt);
        checkpoints.update(dt);
        updatePhysicsInteractions(state, dt);
        updateCareer(state, dt);
        updateMedia(state, dt);

        if (state.pendingWorldReload) {
          buildNation();
          state.pendingWorldReload = false;
        }

        if (nationRuntimeRef.current) {
          nationRuntimeRef.current.update(dt, now * 0.001);
        }

        timeSystem.update();
        updateHUD(state);
        updateCameraNavigation(camera, dt);
      }

      // Render the scene
      scene.render();

      // Signal that first frame has been rendered
      if (!firstFrameRendered) {
        firstFrameRendered = true;
        globalThis.__ASCENT_FIRST_FRAME_RENDERED__ = true;
        console.log('[BOOT] First frame rendered successfully');
      }

      // Reset error counter on successful frame
      errorCount = 0;

    } catch (err) {
      errorCount++;
      // ALWAYS log errors - don't suppress. Use rate limiting if needed for analytics.
      console.error('[GameLoop] Runtime error in frame:', err.message);
      console.error('[GameLoop] Stack trace:', err.stack);

      // High error count warning
      if (errorCount > 5) {
        console.warn(`[GameLoop] High error rate detected (${errorCount} errors). Game may be unstable.`);
      }

      // Continue rendering even if a frame has errors (graceful degradation)
    }
  });

  // Add resize handler to maintain canvas size
  const resizeHandler = () => {
    if (engine && !engine.isDisposed) {
      engine.resize();
      console.log('[BOOT] Engine resized');
    }
  };
  window.addEventListener('resize', resizeHandler);

  console.log('[BOOT] Render loop started and resize handler attached');
}
