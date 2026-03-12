import { updateHUD } from '../../ui/hud.js';
import { createNationWorld } from '../../world/createNationWorld.js';
import { saveGame } from '../../systems/saveSystem.js';
import { createNationLifecycle } from '../nationLifecycle.js';

/**
 * Contract: nation lifecycle and persistence services.
 */
export function createNationSessionServices() {
  return Object.freeze({
    createNationLifecycle,
    createNationWorld,
    updateHUD,
    saveGame
  });
}
