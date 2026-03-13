import { Engine } from '@babylonjs/core';

// Detect if running on mobile device
const isMobileDevice = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(
  navigator.userAgent.toLowerCase()
);

/**
 * Get optimized engine options based on device type
 */
function getOptimizedEngineOptions() {
  const baseOptions = {
    preserveDrawingBuffer: false,
    stencil: false,  // Disable stencil for mobile performance
    antialias: false,  // Disable MSAA for mobile, use FXAA instead
    adaptToDeviceRatio: true
  };

  if (isMobileDevice) {
    // Mobile-specific optimizations
    return {
      ...baseOptions,
      failIfMajorPerformanceCaveat: true,  // Fail rather than degrade silently
      disableWebGL2Support: false,  // Allow WebGL2 but don't require it
      doNotHandleContextLost: false,  // Handle context loss properly on mobile
    };
  }

  // Desktop can use more features
  return {
    ...baseOptions,
    stencil: true,
    antialias: true,
  };
}

/**
 * Use WebGL primarily, with optional WebGPU attempt only on desktop.
 * Mobile devices should stick with WebGL for stability and compatibility.
 */
export async function createBestAvailableEngine(canvas, support) {
  // Skip WebGPU on mobile - stick with stable WebGL
  if (isMobileDevice) {
    console.log('[Bootstrap] Mobile device detected - using WebGL directly');
    if (!support.webglSupported) {
      throw new Error('No WebGL support found on mobile device.');
    }
    const webglEngine = new Engine(canvas, true, getOptimizedEngineOptions());
    return { engine: webglEngine, mode: 'webgl' };
  }

  // Desktop: try WebGPU first, fall back to WebGL
  if (support.webgpuSupported) {
    try {
      const { WebGPUEngine } = await import('@babylonjs/core/Engines/webgpuEngine');
      const webgpuEngine = new WebGPUEngine(canvas, {
        antialias: true,
        adaptToDeviceRatio: true
      });

      // Some webview environments can hang indefinitely on WebGPU init.
      const initTimeoutMs = 5000;
      await Promise.race([
        webgpuEngine.initAsync(),
        new Promise((_, reject) => {
          setTimeout(() => reject(new Error(`WebGPU init timed out after ${initTimeoutMs}ms`)), initTimeoutMs);
        })
      ]);

      console.log('[Bootstrap] WebGPU engine initialized successfully');
      return { engine: webgpuEngine, mode: 'webgpu' };
    } catch (error) {
      console.warn('[Bootstrap] WebGPU initialization failed, falling back to WebGL.', error);
    }
  }

  if (!support.webglSupported) {
    throw new Error('No supported 3D renderer found (WebGL/WebGPU).');
  }

  console.log('[Bootstrap] Using WebGL engine');
  const webglEngine = new Engine(canvas, true, getOptimizedEngineOptions());
  return { engine: webglEngine, mode: 'webgl' };
}
