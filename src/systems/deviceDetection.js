/**
 * deviceDetection.js — Device Capability Detection
 * ================================================
 * Detects device capabilities at startup to inform LOD and performance decisions.
 * Runs once, result cached and available throughout game lifetime.
 */

/**
 * Detect device tier based on WebGL version, memory, GPU capabilities, and screen size.
 * Conservative approach favors lower tiers for mobile devices.
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

    // Detect if device is mobile/tablet
    const isMobileDevice = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(
      navigator.userAgent.toLowerCase()
    );

    // Get screen size for viewport detection
    const screenWidth = window.innerWidth || screen.width;
    const screenHeight = window.innerHeight || screen.height;
    const totalPixels = screenWidth * screenHeight;

    // Determine tier based on combined factors with mobile bias
    let tier = 'mid'; // default

    if (isMobileDevice) {
      // Mobile devices: much more conservative
      // Only classify as 'mid' if: WebGL 2.0 + 6GB+ memory + large screen
      if (webglVersion === 2 && deviceMemory >= 6 && totalPixels > 2000000) {
        tier = 'mid';
      } else {
        // Default mobile devices to 'low' for better performance
        tier = 'low';
      }
    } else {
      // Desktop/laptop devices
      // High-end: WebGL 2.0 + good GPU + sufficient memory (8GB+)
      if (webglVersion === 2 && deviceMemory >= 8 && capabilities.maxTextureSize >= 2048) {
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
    }

    console.log(
      `[DeviceDetection] Tier: ${tier} | Mobile: ${isMobileDevice} | WebGL: ${webglVersion} | Memory: ${deviceMemory}GB | Screen: ${screenWidth}x${screenHeight} | MaxTexture: ${capabilities.maxTextureSize}`
    );

    // Clean up temporary canvas
    canvas.remove();

    return tier;
  } catch (err) {
    console.error('[DeviceDetection] Error detecting device tier:', err.message);
    return 'low'; // Safe default for mobile
  }
}

/**
 * Get detailed GPU capability information.
 * @param {WebGLRenderingContext} gl
 * @returns {Object} GPU capabilities object
 */
function getGPUCapabilities(gl) {
  if (!gl) {
    return {
      maxTextureSize: 1024,
      maxRenderbufferSize: 1024,
      maxViewportDims: [1024, 1024],
      hasDrawBuffers: false,
      maxDrawBuffers: 1,
      hasAnisotropic: false,
      maxAnisotropy: 1,
    };
  }

  const safeGetParameter = (key, fallback) => {
    if (key == null) return fallback;
    try {
      const value = gl.getParameter(key);
      return value ?? fallback;
    } catch {
      return fallback;
    }
  };

  const drawBuffersExt = gl.getExtension('WEBGL_draw_buffers');
  const anisotropicExt =
    gl.getExtension('EXT_texture_filter_anisotropic') ||
    gl.getExtension('MOZ_EXT_texture_filter_anisotropic') ||
    gl.getExtension('WEBKIT_EXT_texture_filter_anisotropic');

  const maxDrawBuffers =
    safeGetParameter(gl.MAX_DRAW_BUFFERS, null) ||
    safeGetParameter(drawBuffersExt?.MAX_DRAW_BUFFERS_WEBGL, 1);

  const maxAnisotropy =
    safeGetParameter(anisotropicExt?.MAX_TEXTURE_MAX_ANISOTROPY_EXT, 1);

  return {
    maxTextureSize: safeGetParameter(gl.MAX_TEXTURE_SIZE, 1024),
    maxRenderbufferSize: safeGetParameter(gl.MAX_RENDERBUFFER_SIZE, 1024),
    maxViewportDims: safeGetParameter(gl.MAX_VIEWPORT_DIMS, [1024, 1024]),
    hasDrawBuffers: Boolean(gl.MAX_DRAW_BUFFERS || drawBuffersExt),
    maxDrawBuffers,
    hasAnisotropic: Boolean(anisotropicExt),
    maxAnisotropy,
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
