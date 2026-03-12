import { createRuntimeContextFacade } from './runtimeContextFacade.js';
import { createGameplaySessionServices } from './gameplaySessionServices.js';
import { createGameLoopFacade } from './gameLoopFacade.js';

/**
 * Contract: bootstrap-level dependency factory used by runGameBootstrap.
 */
export function createBootstrapFacades() {
  return Object.freeze({
    runtimeContextDependencies: createRuntimeContextFacade(),
    gameplaySessionServices: createGameplaySessionServices(),
    gameLoopDependencies: createGameLoopFacade()
  });
}

