/**
 * deviceDetection.js — Device Capability Detection
 * ================================================
 * Detects device capabilities at startup to inform LOD and performance decisions.
 * Runs once, result cached and available throughout game lifetime.
 */

/**
 * Detect device tier based on WebGL version, memory, and GPU capabilities.
 * @returns {Promise<'low' | 'mid' | 'high'>}
 */
export async function detectDeviceTier() {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2');
    const glFallback = canvas.getContext('webgl');

    // Determine WebGL version
    let webglVersion = 1;
    if (gl) {
      webglVersion = 2;
    } else if (!glFallback) {
      console.warn('[DeviceDetection] No WebGL support detected; defaulting to low-end device');
      return 'low';
    }

    // Check device memory (navigator.deviceMemory returns GB)
    const deviceMemory = navigator.deviceMemory || 4;

    // Check GPU capabilities
    const capabilities = getGPUCapabilities(gl || glFallback);

    // Determine tier based on combined factors
    let tier = 'mid'; // default

    // High-end: WebGL 2.0 + good GPU + sufficient memory
    if (webglVersion === 2 && deviceMemory >= 4 && capabilities.maxTextureSize >= 2048) {
      tier = 'high';
    }
    // Low-end: WebGL 1.0 only, or very limited memory
    else if (webglVersion === 1 || deviceMemory < 2) {
      tier = 'low';
    }
    // Mid-range: Everything else
    else {
      tier = 'mid';
    }

    console.log(
      `[DeviceDetection] Tier: ${tier} | WebGL: ${webglVersion} | Memory: ${deviceMemory}GB | MaxTexture: ${capabilities.maxTextureSize}`
    );

    // Clean up temporary canvas
    canvas.remove();

    return tier;
  } catch (err) {
    console.error('[DeviceDetection] Error detecting device tier:', err.message);
    return 'mid'; // Safe default
  }
}

/**
 * Get detailed GPU capability information.
 * @param {WebGLRenderingContext} gl
 * @returns {Object} GPU capabilities object
 */
function getGPUCapabilities(gl) {
  if (!gl) {
    return { maxTextureSize: 1024, hasDrawBuffers: false, maxDrawBuffers: 1 };
  }

  return {
    maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
    maxRenderbufferSize: gl.getParameter(gl.MAX_RENDERBUFFER_SIZE),
    maxViewportDims: gl.getParameter(gl.MAX_VIEWPORT_DIMS),
    hasDrawBuffers: !!gl.getExtension('WEBGL_draw_buffers'),
    maxDrawBuffers: gl.getParameter(gl.getExtension('WEBGL_draw_buffers')?.MAX_DRAW_BUFFERS_WEBGL || 1),
    hasAnisotropic: !!gl.getExtension('EXT_texture_filter_anisotropic'),
    maxAnisotropy: gl.getParameter(gl.getExtension('EXT_texture_filter_anisotropic')?.MAX_TEXTURE_MAX_ANISOTROPY_EXT || 1),
  };
}

/**
 * Get boolean helpers for tier checking.
 * @param {string} tier
 * @returns {Object} boolean helper functions
 */
export function getTierHelpers(tier) {
  return {
    isLowEnd: tier === 'low',
    isMidRange: tier === 'mid',
    isHighEnd: tier === 'high',
  };
}

/**
 * Get recommended settings for device tier.
 * @param {string} tier
 * @returns {Object} recommended configuration
 */
export function getSettingsForTier(tier) {
  switch (tier) {
    case 'high':
      return {
        renderResolution: 1.0,
        shadowMapSize: 2048,
        particleCount: 1000,
        lightCount: 16,
        fogQuality: 'high',
        enableSSAO: true,
      };
    case 'mid':
      return {
        renderResolution: 0.85,
        shadowMapSize: 1024,
        particleCount: 500,
        lightCount: 8,
        fogQuality: 'medium',
        enableSSAO: false,
      };
    case 'low':
    default:
      return {
        renderResolution: 0.7,
        shadowMapSize: 512,
        particleCount: 200,
        lightCount: 4,
        fogQuality: 'low',
        enableSSAO: false,
      };
  }
}
