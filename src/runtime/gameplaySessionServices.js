import { createWorldSessionServices } from './services/worldSessionServices.js';
import { createAssetSessionServices } from './services/assetSessionServices.js';
import { createNationSessionServices } from './services/nationSessionServices.js';
import { createPlacementSessionServices } from './services/placementSessionServices.js';
import { createProgressionSessionServices } from './services/progressionSessionServices.js';
import { createHudSessionServices } from './services/hudSessionServices.js';
import { createSetupSessionServices } from './services/setupSessionServices.js';

/**
 * Contract: grouped runtime services consumed by setupGameplaySession.
 */
export function createGameplaySessionServices() {
  return Object.freeze({
    world: createWorldSessionServices(),
    assets: createAssetSessionServices(),
    nation: createNationSessionServices(),
    placement: createPlacementSessionServices(),
    progression: createProgressionSessionServices(),
    hud: createHudSessionServices(),
    setup: createSetupSessionServices()
  });
}
