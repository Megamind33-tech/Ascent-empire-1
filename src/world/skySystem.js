/**
 * skySystem.js — Procedural Atmospheric Sky with Celestial Bodies
 * ================================================================
 * Dynamic sky with sun/moon positioning, realistic clouds, and day/night cycles.
 */

import { SkyMaterial } from '@babylonjs/materials';
import { Vector3, Color3, MeshBuilder, StandardMaterial, DynamicTexture, Mesh } from '@babylonjs/core';

export function initSky(scene, sun, deviceTier = 'mid') {
  const skyMaterial = new SkyMaterial("skyMaterial", scene);
  skyMaterial.backFaceCulling = false;

  // Mobile optimization: reduce turbidity for better clarity
  if (deviceTier === 'low') {
    skyMaterial.turbidity = 1.2;   // Slightly clearer for mobile
  } else {
    skyMaterial.turbidity = 1.5;   // Reduced haze for clearer visibility
  }

  skyMaterial.luminance = 1.0;   // Standard brightness
  skyMaterial.inclination = 0.5; // Day/Night
  skyMaterial.azimuth = 0.25;

  // Custom atmosphere colors
  skyMaterial.rayleigh = 2.8;
  skyMaterial.mieDirectionalG = 0.8;
  skyMaterial.mieCoefficient = 0.005;

  const skybox = MeshBuilder.CreateBox("skyBox", { size: 2000 }, scene);
  skybox.infiniteDistance = true;
  skybox.material = skyMaterial;

  // Create celestial bodies (sun and moon) - optimized for device tier
  const { sunSphere, moonSphere } = createCelestialBodies(scene, deviceTier);

  // Create animated clouds - optimized for device tier
  const cloudLayers = createAnimatedClouds(scene, deviceTier);

  // Get camera to position celestial bodies relative to it
  const camera = scene.activeCamera;

  // Sync sun position with sky inclination and position celestial bodies correctly
  scene.onBeforeRenderObservable.add(() => {
    const sunPos = sun.direction.scale(-100);
    skyMaterial.sunPosition = sunPos;

    // Position celestial bodies relative to camera at a fixed distance in the sky
    // This prevents them from appearing in front of the camera or interfering with gameplay
    if (camera && sunSphere && moonSphere) {
      const cameraPos = camera.position.clone();
      const distanceFromCamera = 500; // Position far away to be in the sky

      // Sun position: in the direction of the sun light, far from camera
      sunSphere.position = cameraPos.add(sun.direction.scale(-distanceFromCamera));

      // Moon position: opposite the sun
      moonSphere.position = cameraPos.add(sun.direction.scale(distanceFromCamera));
    }

    // Animate clouds
    animateCloudLayers(cloudLayers, scene.getEngine().frameId);
  });

  return { skybox, skyMaterial, sunSphere, moonSphere, cloudLayers };
}

function createCelestialBodies(scene, deviceTier = 'mid') {
  // Reduce polygon count for mobile devices to improve performance
  let segments = 32;
  if (deviceTier === 'low') {
    segments = 12;  // Low-end: minimal polygons
  } else if (deviceTier === 'mid') {
    segments = 16;  // Mid-range: reduced for mobile
  }

  // Create Sun sphere with glow
  const sunSphere = MeshBuilder.CreateSphere("sun", { diameter: 60, segments }, scene);
  const sunMaterial = new StandardMaterial("sunMaterial", scene);
  sunMaterial.emissiveColor = new Color3(1, 0.9, 0.3);
  sunMaterial.backFaceCulling = false;
  sunMaterial.disableLighting = true;  // Sun doesn't need lighting calculations
  sunSphere.material = sunMaterial;
  sunSphere.renderingGroupId = 2;  // Render after skybox and clouds, before UI

  // Create Moon sphere with softer glow
  const moonSphere = MeshBuilder.CreateSphere("moon", { diameter: 50, segments }, scene);
  const moonMaterial = new StandardMaterial("moonMaterial", scene);
  moonMaterial.emissiveColor = new Color3(0.8, 0.8, 0.8);
  moonMaterial.specularColor = new Color3(0.3, 0.3, 0.3);
  moonMaterial.backFaceCulling = false;
  moonMaterial.disableLighting = true;  // Moon doesn't need lighting calculations
  moonSphere.material = moonMaterial;
  moonSphere.renderingGroupId = 2;  // Render after skybox and clouds, before UI

  // Disable unnecessary features for mobile performance
  sunSphere.isPickable = false;
  moonSphere.isPickable = false;

  return { sunSphere, moonSphere };
}

function createAnimatedClouds(scene, deviceTier = 'mid') {
  const cloudLayers = [];

  // Mobile optimization: reduce cloud layers and density
  let cloudHeights, cloudSpeeds, cloudDensities, numPlanes;

  if (deviceTier === 'low') {
    // Low-end: single cloud layer, minimal density
    cloudHeights = [600];
    cloudSpeeds = [0.0004];
    cloudDensities = [0.25];  // Much lower density
    numPlanes = 1;  // Only 1 plane per layer
  } else if (deviceTier === 'mid') {
    // Mid-range: 2 cloud layers
    cloudHeights = [500, 650];
    cloudSpeeds = [0.0006, 0.0003];
    cloudDensities = [0.4, 0.3];  // Reduced density
    numPlanes = 2;
  } else {
    // High-end: full 3 layers
    cloudHeights = [500, 600, 700];
    cloudSpeeds = [0.0008, 0.0006, 0.0004];
    cloudDensities = [0.6, 0.4, 0.5];
    numPlanes = 2;
  }

  cloudHeights.forEach((height, index) => {
    const planes = [];
    for (let i = 0; i < numPlanes; i++) {
      const cloudPlane = MeshBuilder.CreatePlane(`cloudLayer${index}_${i}`, { width: 1200, height: 600 }, scene);
      cloudPlane.position.y = height;
      cloudPlane.position.x = i * 1200 - 600; // Tile clouds
      // Plane default is vertical; rotate to horizontal sky layer overhead.
      cloudPlane.rotation.x = Math.PI / 2;
      cloudPlane.billboardMode = 0; // Don't auto-billboard

      // Create dynamic cloud texture with Perlin-like noise
      // Use lower resolution for mobile devices to save memory
      const textureRes = deviceTier === 'low' ? 128 : 256;
      const cloudTexture = new DynamicTexture(`cloudTexture${index}_${i}`, textureRes, scene);
      generateCloudPattern(cloudTexture.getContext(), textureRes, cloudDensities[index]);
      cloudTexture.update();

      // Create material with proper alpha handling
      const cloudMaterial = new StandardMaterial(`cloudMaterial${index}_${i}`, scene);
      cloudTexture.hasAlpha = true;
      cloudMaterial.diffuseTexture = cloudTexture;
      cloudMaterial.opacityTexture = cloudTexture;
      cloudMaterial.useAlphaFromDiffuseTexture = true;
      cloudMaterial.disableLighting = true;  // Disable lighting calculations for clouds
      cloudMaterial.specularColor = new Color3(0, 0, 0);
      cloudMaterial.emissiveColor = new Color3(1, 1, 1);
      cloudMaterial.backFaceCulling = false;
      cloudMaterial.transparencyMode = 2; // ALPHA_BLEND
      cloudMaterial.alpha = deviceTier === 'low' ? 0.02 : 0.04; // Even lower for low-end
      cloudMaterial.disableDepthWrite = false;
      cloudPlane.isPickable = false;
      cloudPlane.renderingGroupId = 1;  // Render after world, with proper depth ordering
      cloudPlane.material = cloudMaterial;

      planes.push({
        mesh: cloudPlane,
        material: cloudMaterial,
        startX: cloudPlane.position.x
      });
    }

    cloudLayers.push({
      planes: planes,
      speed: cloudSpeeds[index],
      offsetX: 0,
      height: height
    });
  });

  return cloudLayers;
}

function generateCloudPattern(ctx, size, density) {
  // Start with transparent
  ctx.fillStyle = 'rgba(255, 255, 255, 0)';
  ctx.fillRect(0, 0, size, size);

  // Generate cloud-like perlin noise using multiple layers of circles
  const cloudCount = Math.floor(size / 30 * density);

  for (let i = 0; i < cloudCount; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const radius = 15 + Math.random() * 50;
    const intensity = 0.3 + Math.random() * 0.6;

    // Create soft cloud puffs with radial gradients
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, `rgba(255, 255, 255, ${intensity})`);
    gradient.addColorStop(0.5, `rgba(255, 255, 255, ${intensity * 0.5})`);
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  // Add some smaller details for realism
  for (let i = 0; i < cloudCount * 0.5; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const radius = 5 + Math.random() * 15;

    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, `rgba(220, 220, 220, 0.4)`);
    gradient.addColorStop(1, 'rgba(220, 220, 220, 0)');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

function animateCloudLayers(cloudLayers, frameId) {
  cloudLayers.forEach((layer) => {
    // Smoothly move clouds across the sky
    layer.offsetX += layer.speed;

    layer.planes.forEach((plane, idx) => {
      // Calculate position with wrapping for seamless tiling
      const totalWidth = 1200 * 2;
      const newX = (plane.startX + layer.offsetX) % totalWidth;

      // Wrap around when off-screen
      if (newX < -1200) {
        plane.mesh.position.x = plane.startX + totalWidth + layer.offsetX;
      } else if (newX > 1200) {
        plane.mesh.position.x = plane.startX - totalWidth + layer.offsetX;
      } else {
        plane.mesh.position.x = plane.startX + layer.offsetX;
      }
    });
  });
}

export function updateSkyIntensity(skyMaterial, daylight, sunSphere, moonSphere, cloudLayers) {
  // daylight is 0.0 (night) to 1.0 (day)
  skyMaterial.inclination = 0.5 - (daylight * 0.5);
  skyMaterial.luminance = 0.1 + (daylight * 0.9);

  // Update celestial body visibility and intensity
  if (sunSphere) {
    sunSphere.visibility = Math.max(0.3, daylight); // Sun always slightly visible
    // Sun becomes more intense and brighter during day
    const sunMat = sunSphere.material;
    if (sunMat) {
      const sunBrightness = 0.5 + daylight * 0.5;
      sunMat.emissiveColor = new Color3(1, 0.9 * sunBrightness, 0.3 * sunBrightness);
    }
  }

  if (moonSphere) {
    moonSphere.visibility = Math.max(0.05, 1 - daylight); // Moon visible at night
    // Moon glows more during clear nights
    const moonMat = moonSphere.material;
    if (moonMat) {
      const moonGlow = 0.6 + (1 - daylight) * 0.4;
      moonMat.emissiveColor = new Color3(0.8 * moonGlow, 0.8 * moonGlow, 0.8 * moonGlow);
    }
  }

  // Update cloud colors based on day/night cycle
  if (cloudLayers) {
    cloudLayers.forEach((layer) => {
      layer.planes.forEach((plane) => {
        const mat = plane.material;
        if (mat) {
          // Clouds are white during day, darker and more orange during sunset, blue-gray at night
          if (daylight > 0.5) {
            // Day: bright white clouds - much more transparent
            mat.emissiveColor = new Color3(1, 1, 1);
            mat.alpha = 0.04 + daylight * 0.02;
          } else if (daylight > 0.2) {
            // Sunset/sunrise: orange-tinted clouds - very light
            const sunsetFactor = (0.5 - daylight) / 0.3;
            mat.emissiveColor = new Color3(1, 0.7 - sunsetFactor * 0.2, 0.4 - sunsetFactor * 0.2);
            mat.alpha = 0.03;
          } else {
            // Night: dark blue-gray clouds - minimal visibility to prevent grey overlay
            mat.emissiveColor = new Color3(0.2, 0.25, 0.35);
            mat.alpha = 0.02;
          }
        }
      });
    });
  }
}
