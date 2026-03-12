import { bindPlacementInput } from '../../systems/input.js';
import { spawnInstitution } from '../../world/createInstitutions.js';
import { playConstruction } from '../../systems/audioSystem.js';
import { capitalize } from '../../utils/stringFormat.js';
import { setupPlacementController } from '../placementController.js';

/**
 * Contract: structure placement orchestration services.
 */
export function createPlacementSessionServices() {
  return Object.freeze({
    setupPlacementController,
    bindPlacementInput,
    spawnInstitution,
    playConstruction,
    capitalize
  });
}
