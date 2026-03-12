/**
 * Centralized game loop runner to keep bootstrap orchestration thin.
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
  let last = performance.now();

  engine.runRenderLoop(() => {
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

    scene.render();
  });
}
