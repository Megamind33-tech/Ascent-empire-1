import { Engine } from '@babylonjs/core';

/**
 * Detect runtime renderer support before any Babylon engine instance is created.
 */
export async function detectGraphicsSupport() {
  return {
    webglSupported: isBabylonEngineSupported(),
    webgpuSupported: Boolean(globalThis.navigator?.gpu)
  };
}

/**
 * Handle Babylon support API compatibility across versions.
 */
export function isBabylonEngineSupported() {
  if (typeof Engine.isSupported === 'function') {
    return Boolean(Engine.isSupported());
  }

  if (typeof Engine.IsSupported === 'function') {
    return Boolean(Engine.IsSupported());
  }

  if (typeof Engine.IsSupported !== 'undefined') {
    return Boolean(Engine.IsSupported);
  }

  return false;
}
