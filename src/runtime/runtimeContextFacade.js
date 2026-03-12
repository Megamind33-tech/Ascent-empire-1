import { createGameState } from '../state/gameState.js';
import { createScene } from '../world/createScene.js';
import { detectGraphicsSupport } from '../engine/graphicsSupport.js';
import { createBestAvailableEngine } from '../engine/createEngine.js';

export function createRuntimeContextFacade() {
  return Object.freeze({
    detectGraphicsSupport,
    createBestAvailableEngine,
    createScene,
    createGameState
  });
}
