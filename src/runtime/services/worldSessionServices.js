import { createRapierWorld, createFixedBox } from '../../systems/rapierWorld.js';
import { createPlayerMarker } from '../../world/createPlayerMarker.js';
import { subscribeInteractions } from '../../systems/physicsInteractionSystem.js';
import { subscribeAudioEvents } from '../../systems/audioSystem.js';
import { initDecisionHooks } from '../../ui/decisionModal.js';
import { initOverlayClosers } from '../../ui/gazetteCareerUI.js';
import { initMediaSystem } from '../../systems/mediaSystem.js';
import { initLedgerUI } from '../../ui/EconomicLedger.js';
import { initMobileControls } from '../../systems/mobileControls.js';
import { setupCameraKeyboardShortcuts } from '../../utils/cameraControls.js';
import { initializeRuntimeSystems } from '../initializeRuntimeSystems.js';

/**
 * Contract: world bootstrap services required before asset/nation setup.
 */
export function createWorldSessionServices() {
  return Object.freeze({
    createRapierWorld,
    initializeRuntimeSystems,
    createFixedBox,
    createPlayerMarker,
    subscribeInteractions,
    subscribeAudioEvents,
    initDecisionHooks,
    initOverlayClosers,
    initMediaSystem,
    initLedgerUI,
    initMobileControls,
    setupCameraKeyboardShortcuts
  });
}
