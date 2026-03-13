export const mobileConfig = Object.freeze({
  // Hardware scaling levels by device tier (higher = more downscaling for better performance)
  // Used to calculate: engine.setHardwareScalingLevel(1 / scaling)
  hardwareScaling: {
    low: {
      minScale: 2.0,    // 50% resolution for low-end devices
      maxScale: 3.0,    // Can go to 33% if needed
    },
    mid: {
      minScale: 1.5,    // 67% resolution for mid-range
      maxScale: 2.2,    // Can scale to 45% if needed
    },
    high: {
      minScale: 1.0,    // 100% resolution for high-end
      maxScale: 1.5,    // Can scale to 67% if needed
    }
  },
  // Shadow configuration by device tier
  shadowConfig: {
    low: {
      mapSize: 512,
      blurKernel: 4,
      useBlurExponential: false,
    },
    mid: {
      mapSize: 1024,
      blurKernel: 8,
      useBlurExponential: true,
    },
    high: {
      mapSize: 2048,
      blurKernel: 16,
      useBlurExponential: true,
    }
  },
  // Entity limits by device tier
  entityLimits: {
    low: {
      maxDynamicCars: 8,
      maxAgents: 12,
      skylineDensity: 0.4,
    },
    mid: {
      maxDynamicCars: 16,
      maxAgents: 20,
      skylineDensity: 0.6,
    },
    high: {
      maxDynamicCars: 24,
      maxAgents: 32,
      skylineDensity: 0.8,
    }
  }
});
