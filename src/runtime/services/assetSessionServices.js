import { setMessage } from '../../ui/hud.js';
import { initAssetLoader } from '../../systems/assetLoader.js';

/**
 * Contract: asset/bootstrap messaging services for startup phases.
 */
export function createAssetSessionServices() {
  return Object.freeze({
    setMessage,
    initAssetLoader
  });
}
