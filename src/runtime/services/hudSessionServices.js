import { initHUD } from '../../ui/hud.js';
import { loadGame } from '../../systems/saveSystem.js';
import { performAction } from '../../systems/economySystem.js';
import { handleCameraAction } from '../../utils/cameraControls.js';
import { createHudActionHandler, createTravelHandler } from '../hudActions.js';

/**
 * Contract: HUD action/travel wiring services.
 */
export function createHudSessionServices() {
  return Object.freeze({
    createTravelHandler,
    createHudActionHandler,
    performAction,
    loadGame,
    initHUD,
    handleCameraAction
  });
}
