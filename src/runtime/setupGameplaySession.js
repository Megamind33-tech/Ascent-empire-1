import { setupWorldSession } from './setupWorldSession.js';
import { setupHudAndUiSession } from './setupHudAndUiSession.js';

/**
 * Composes gameplay session modules after a valid 3D runtime context exists.
 * @param {object} deps grouped runtime setup dependencies
 * @returns {Promise<object>} loop-ready runtime handles
 */
export async function setupGameplaySession({
  runtimeContext,
  canvas,
  bootFlow,
  BOOT_STATES,
  services
}) {
  const { engine, scene, camera, state } = runtimeContext;

  const {
    world,
    buildNation,
    nationRuntimeRef,
    timeSystem,
    npcSystem,
    checkpoints
  } = await setupWorldSession({
    runtimeContext,
    canvas,
    bootFlow,
    BOOT_STATES,
    services
  });

  setupHudAndUiSession({
    state,
    camera,
    buildNation,
    services
  });

  return {
    engine,
    scene,
    camera,
    state,
    world,
    npcSystem,
    checkpoints,
    timeSystem,
    buildNation,
    nationRuntimeRef
  };
}
