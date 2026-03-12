import { Engine } from '@babylonjs/core';

/**
 * Detect runtime renderer support before any Babylon engine instance is created.
 */
export async function detectGraphicsSupport() {
  const contextSupport = detectContextSupport();

  return {
    webglSupported: isBabylonEngineSupported() || contextSupport.webgl,
    webgpuSupported: Boolean(globalThis.navigator?.gpu)
  };
}

/**
 * Some mobile webviews report Babylon static support inaccurately.
 * Probe the browser directly as a fallback before disabling 3D mode.
 */
function detectContextSupport() {
  try {
    const canvas = globalThis.document?.createElement?.('canvas');
    if (!canvas) return { webgl: false };

    const webgl2 = canvas.getContext('webgl2');
    const webgl1 = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

    canvas.remove?.();
    return { webgl: Boolean(webgl2 || webgl1) };
  } catch {
    return { webgl: false };
  }
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
