/**
 * skySystem.js — Procedural Atmospheric Sky
 * ===========================================
 * Replaces the basic clearColor with a dynamic SkyMaterial.
 * Handles sun position, scattering, and horizon blurring.
 */

import { SkyMaterial } from '@babylonjs/materials';
import { Vector3, Color3, MeshBuilder } from '@babylonjs/core';

export function initSky(scene, sun) {
  const skyMaterial = new SkyMaterial("skyMaterial", scene);
  skyMaterial.backFaceCulling = false;

  // Cinematic / Realistic Settings
  skyMaterial.turbidity = 1.2;
  skyMaterial.luminance = 1.0;
  skyMaterial.inclination = 0.5; // Day/Night 
  skyMaterial.azimuth = 0.25;

  // Custom atmosphere colors
  skyMaterial.rayleigh = 2.0;
  skyMaterial.mieDirectionalG = 0.8;
  skyMaterial.mieCoefficient = 0.005;

  const skybox = scene.createDefaultSkybox(null, true, 2000) || import('@babylonjs/core').then(({MeshBuilder}) => MeshBuilder.CreateBox('skybox', {size: 2000}, scene));
  skybox.material = skyMaterial;

  // Sync sun position with sky inclination
  scene.onBeforeRenderObservable.add(() => {
    // sun.direction is where light goes; skyMaterial needs sun position
    const sunPos = sun.direction.scale(-100);
    skyMaterial.sunPosition = sunPos;
  });

  return { skybox, skyMaterial };
}

export function updateSkyIntensity(skyMaterial, daylight) {
  // daylight is 0.0 (night) to 1.0 (day)
  skyMaterial.inclination = 0.5 - (daylight * 0.5); 
  skyMaterial.luminance = 0.1 + (daylight * 0.9);
}
