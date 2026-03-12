import { createRuntimeContextFacade } from './runtimeContextFacade.js';
import { createGameplaySessionServices } from './gameplaySessionServices.js';
import { createGameLoopFacade } from './gameLoopFacade.js';
import { detectDeviceTier } from '../systems/deviceDetection.js';

/**
 * Contract: bootstrap-level dependency factory used by runGameBootstrap.
 */
export function createBootstrapFacades() {
  const runtimeDeps = createRuntimeContextFacade();
  return Object.freeze({
    runtimeContextDependencies: {
      ...runtimeDeps,
      detectDeviceTier // Add device detection to runtime context deps
    },
    gameplaySessionServices: createGameplaySessionServices(),
    gameLoopDependencies: createGameLoopFacade()
  });
}

