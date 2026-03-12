import { Engine } from '@babylonjs/core';

const ENGINE_OPTIONS = {
  preserveDrawingBuffer: false,
  stencil: true,
  antialias: true,
  adaptToDeviceRatio: true
};

/**
 * Prefer WebGPU when available, with robust WebGL fallback.
 */
export async function createBestAvailableEngine(canvas, support) {
  if (support.webgpuSupported) {
    try {
      const { WebGPUEngine } = await import('@babylonjs/core/Engines/webgpuEngine');
      const webgpuEngine = new WebGPUEngine(canvas, {
        antialias: true,
        adaptToDeviceRatio: true
      });

      // Some mobile/webview environments can hang indefinitely on WebGPU init.
      const initTimeoutMs = 5000;
      await Promise.race([
        webgpuEngine.initAsync(),
        new Promise((_, reject) => {
          setTimeout(() => reject(new Error(`WebGPU init timed out after ${initTimeoutMs}ms`)), initTimeoutMs);
        })
      ]);

      return { engine: webgpuEngine, mode: 'webgpu' };
    } catch (error) {
      console.warn('[Bootstrap] WebGPU initialization failed, falling back to WebGL.', error);
    }
  }

  if (!support.webglSupported) {
    throw new Error('No supported 3D renderer found (WebGL/WebGPU).');
  }

  const webglEngine = new Engine(canvas, true, ENGINE_OPTIONS);
  return { engine: webglEngine, mode: 'webgl' };
}
