import '@babylonjs/loaders';
import { createBootFlow, BOOT_STATES } from '../boot/bootFlow.js';
import { createCompatibilityController } from '../boot/compatibilityController.js';
import { mountCompatibilityMode } from '../compatibility/compatibilityMode.js';
import { startGameLoop } from './gameLoop.js';
import { createGameRuntimeContext } from './createGameRuntimeContext.js';
import { setupGameplaySession } from './setupGameplaySession.js';
import { createBootstrapFacades } from './bootstrapDependencies.js';

/**
 * Runtime entrypoint contract.
 * @param {HTMLCanvasElement|null} canvas render target canvas element
 * @returns {Promise<void>} resolves when startup path is initialized
 */
export async function runGameBootstrap(canvas) {
  if (!canvas) {
    throw new Error('Render canvas element not found in DOM');
  }

  let compatibility;
  const bootFlow = createBootFlow({
    onRetry3D: () => window.location.reload(),
    onCompatibilityMode: () => compatibility.activateCompatibilityMode('Your device cannot initialize full Babylon.js 3D rendering, but core strategy systems remain available.')
  });
  compatibility = createCompatibilityController({
    bootFlow,
    BOOT_STATES,
    mountCompatibilityMode
  });

  const { runtimeContextDependencies, gameplaySessionServices, gameLoopDependencies } = createBootstrapFacades();

  try {
    const runtimeContext = await createGameRuntimeContext({
      canvas,
      bootFlow,
      BOOT_STATES,
      ...runtimeContextDependencies,
      activateCompatibilityMode: compatibility.activateCompatibilityMode
    });

    if (!runtimeContext) {
      return;
    }

    const {
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
    } = await setupGameplaySession({
      runtimeContext,
      canvas,
      bootFlow,
      BOOT_STATES,
      services: gameplaySessionServices
    });

    bootFlow.setState(BOOT_STATES.ready);

    startGameLoop({
      engine,
      scene,
      state,
      world,
      ...gameLoopDependencies,
      npcSystem,
      checkpoints,
      buildNation,
      nationRuntimeRef,
      timeSystem,
      camera
    });
  } catch (err) {
    console.error('[Bootstrap] Boot error:', err);
    bootFlow.setState(BOOT_STATES.boot_error, {
      detail: `Unable to start full 3D mode. ${err.message || 'Unknown initialization issue.'}`
    });
  }
}
