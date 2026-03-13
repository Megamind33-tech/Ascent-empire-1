/**
 * skySystem.js — Procedural Atmospheric Sky with Celestial Bodies
 * ================================================================
 * Dynamic sky with sun/moon positioning, realistic clouds, and day/night cycles.
 */

import { SkyMaterial } from '@babylonjs/materials';
import { Vector3, Color3, MeshBuilder, StandardMaterial, DynamicTexture, Mesh } from '@babylonjs/core';

export function initSky(scene, sun) {
  const skyMaterial = new SkyMaterial("skyMaterial", scene);
  skyMaterial.backFaceCulling = false;

  // Cinematic / Realistic Settings
  skyMaterial.turbidity = 1.5;   // Reduced haze for clearer visibility
  skyMaterial.luminance = 1.0;   // Standard brightness (was 1.1)
  skyMaterial.inclination = 0.5; // Day/Night
  skyMaterial.azimuth = 0.25;

  // Custom atmosphere colors
  skyMaterial.rayleigh = 2.8;
  skyMaterial.mieDirectionalG = 0.8;
  skyMaterial.mieCoefficient = 0.005;

  const skybox = MeshBuilder.CreateBox("skyBox", { size: 2000 }, scene);
  skybox.infiniteDistance = true;
  skybox.material = skyMaterial;

  // Create celestial bodies (sun and moon)
  const { sunSphere, moonSphere } = createCelestialBodies(scene);

  // Create animated clouds
  const cloudLayers = createAnimatedClouds(scene);

  // Sync sun position with sky inclination
  scene.onBeforeRenderObservable.add(() => {
    const sunPos = sun.direction.scale(-100);
    skyMaterial.sunPosition = sunPos;

    // Update celestial bodies position
    sunSphere.position = sun.position.scale(0.8);

    // Moon is opposite the sun
    moonSphere.position = sun.position.scale(-0.8);

    // Animate clouds
    animateCloudLayers(cloudLayers, scene.getEngine().frameId);
  });

  return { skybox, skyMaterial, sunSphere, moonSphere, cloudLayers };
}

function createCelestialBodies(scene) {
  // Create Sun sphere with glow
  const sunSphere = MeshBuilder.CreateSphere("sun", { diameter: 60, segments: 32 }, scene);
  const sunMaterial = new StandardMaterial("sunMaterial", scene);
  sunMaterial.emissiveColor = new Color3(1, 0.9, 0.3);
  sunMaterial.backFaceCulling = false;
  sunSphere.material = sunMaterial;
  sunSphere.renderingGroupId = 0;

  // Create Moon sphere with softer glow
  const moonSphere = MeshBuilder.CreateSphere("moon", { diameter: 50, segments: 32 }, scene);
  const moonMaterial = new StandardMaterial("moonMaterial", scene);
  moonMaterial.emissiveColor = new Color3(0.8, 0.8, 0.8);
  moonMaterial.specularColor = new Color3(0.3, 0.3, 0.3);
  moonMaterial.backFaceCulling = false;
  moonSphere.material = moonMaterial;
  moonSphere.renderingGroupId = 0;

  return { sunSphere, moonSphere };
}

function createAnimatedClouds(scene) {
  const cloudLayers = [];

  // Create 3 cloud layers at different heights for depth and movement variety
  // Keep clouds well above gameplay camera to avoid "gray wall" occluding the city.
  const cloudHeights = [500, 600, 700];
  const cloudSpeeds = [0.0008, 0.0006, 0.0004]; // Even slower wind at higher altitudes
  const cloudDensities = [0.6, 0.4, 0.5];

  cloudHeights.forEach((height, index) => {
    // Create multiple cloud planes for continuous movement effect
    const planes = [];
    for (let i = 0; i < 2; i++) {
      const cloudPlane = MeshBuilder.CreatePlane(`cloudLayer${index}_${i}`, { width: 1200, height: 600 }, scene);
      cloudPlane.position.y = height;
      cloudPlane.position.x = i * 1200 - 600; // Tile clouds
      // Plane default is vertical; rotate to horizontal sky layer overhead.
      cloudPlane.rotation.x = Math.PI / 2;
      cloudPlane.billboardMode = 0; // Don't auto-billboard

      // Create dynamic cloud texture with Perlin-like noise
      const cloudTexture = new DynamicTexture(`cloudTexture${index}_${i}`, 256, scene);
      generateCloudPattern(cloudTexture.getContext(), 256, cloudDensities[index]);
      cloudTexture.update();

      // Create material with proper alpha handling
      const cloudMaterial = new StandardMaterial(`cloudMaterial${index}_${i}`, scene);
      cloudTexture.hasAlpha = true;
      cloudMaterial.diffuseTexture = cloudTexture;
      cloudMaterial.opacityTexture = cloudTexture;
      cloudMaterial.useAlphaFromDiffuseTexture = true;
      cloudMaterial.disableLighting = false;
      cloudMaterial.specularColor = new Color3(0, 0, 0);
      cloudMaterial.emissiveColor = new Color3(1, 1, 1);
      cloudMaterial.backFaceCulling = false;
      cloudMaterial.transparencyMode = 2; // ALPHA_BLEND
      cloudMaterial.alpha = 0.04; // Significantly reduced opacity to avoid grey overlay
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
