import { initSetupOverlay } from '../../systems/setupSystem.js';
import { initAudio } from '../../systems/audioSystem.js';
import { initializeUiLifecycle } from '../uiLifecycle.js';

/**
 * Contract: UI/setup lifecycle services run at end of startup.
 */
export function createSetupSessionServices() {
  return Object.freeze({
    initSetupOverlay,
    initAudio,
    initializeUiLifecycle
  });
}
