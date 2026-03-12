/**
 * terrainHeightSampler.js — Terrain Height Sampling & Alignment
 * ============================================================
 * Provides functions to query and align objects to the procedural terrain.
 * Critical for preventing floating/buried buildings and ensuring proper grounding.
 */

import { Vector3 } from '@babylonjs/core';

/**
 * Sample the terrain height at a given world position using the same noise functions
 * that generated the terrain in createTerrain.js
 *
 * @param {number} x World X coordinate
 * @param {number} z World Z coordinate
 * @returns {number} The terrain height (Y value) at this position
 */
export function sampleTerrainHeight(x, z) {
  const cityDist = Math.max(Math.abs(x), Math.abs(z));
  const cityCore = cityDist < 220;
  const road = Math.abs(x) < 24 || Math.abs(z) < 24 ||
              Math.abs(x - 160) < 16 || Math.abs(x + 160) < 16 ||
              Math.abs(z - 160) < 16 || Math.abs(z + 160) < 16;

  let y = 0;

  if (!cityCore && !road) {
    const blend = Math.min(1.0, (cityDist - 220) / 160);

    // Multi-octave noise (same as createTerrain.js)
    const baseTerrain = fractalNoise(x * 0.005, z * 0.005, 5, 0.6, 2.0) * 35;
    const hillDetail = fractalNoise(x * 0.015, z * 0.015, 4, 0.5, 2.1) * 12;
    const microVariation = fractalNoise(x * 0.08, z * 0.08, 3, 0.4, 2.2) * 3;

    y = blend * (baseTerrain + hillDetail + microVariation);
  }

  // River erosion (same as createTerrain.js)
  const riverCut = Math.exp(-Math.pow((x - 140) * 0.008, 2)) * 18;
  if (!road) y -= riverCut;

  return y;
}

/**
 * Calculate the local terrain slope at a position (average height difference to neighbors)
 *
 * @param {number} x World X coordinate
 * @param {number} z World Z coordinate
 * @param {number} sampleRadius Distance to sample neighbors (default 20)
 * @returns {number} Slope value (0 = flat, 1 = steep)
 */
export function getTerrainSlope(x, z, sampleRadius = 20) {
  const centerHeight = sampleTerrainHeight(x, z);
  let totalSlope = 0;
  const samplePoints = [
    { dx: sampleRadius, dz: 0 },
    { dx: -sampleRadius, dz: 0 },
    { dx: 0, dz: sampleRadius },
    { dx: 0, dz: -sampleRadius },
  ];

  for (const { dx, dz } of samplePoints) {
    const neighborHeight = sampleTerrainHeight(x + dx, z + dz);
    totalSlope += Math.abs(neighborHeight - centerHeight);
  }

  return totalSlope / (sampleRadius * samplePoints.length);
}

/**
 * Align a node to the ground at a given position
 * Sets the node's Y position to match the terrain height
 *
 * @param {TransformNode} node Babylon.js node to align
 * @param {number} x World X coordinate
 * @param {number} z World Z coordinate
 * @param {Object} options Configuration options
 * @param {number} options.yOffset Additional Y offset to apply (e.g., for standing on terrain)
 * @param {boolean} options.clampPitch Clamp pitch rotation based on slope (keep upright)
 * @param {boolean} options.clampRoll Clamp roll rotation based on slope (keep level)
 * @param {number} options.maxSlopeAngle Max rotation angle from slope (radians, default Math.PI/8)
 * @returns {void}
 */
export function alignNodeToGround(node, x, z, options = {}) {
  const {
    yOffset = 0.1,
    clampPitch = true,
    clampRoll = true,
    maxSlopeAngle = Math.PI / 8,
  } = options;

  // Sample height and slope
  const height = sampleTerrainHeight(x, z);
  const slope = getTerrainSlope(x, z);

  // Set position
  node.position.x = x;
  node.position.y = height + yOffset;
  node.position.z = z;

  // Optional: Adjust rotation to follow slope (keep building mostly upright)
  if ((clampPitch || clampRoll) && slope > 0.05) {
    // Calculate slope direction (simplified: use height difference in cardinal directions)
    const northHeight = sampleTerrainHeight(x, z + 20);
    const eastHeight = sampleTerrainHeight(x + 20, z);
    const centerHeight = sampleTerrainHeight(x, z);

    const pitchAngle = Math.atan2(northHeight - centerHeight, 20);
    const rollAngle = Math.atan2(eastHeight - centerHeight, 20);

    // Clamp to max slope angle
    const clampedPitch = Math.max(-maxSlopeAngle, Math.min(maxSlopeAngle, pitchAngle));
    const clampedRoll = Math.max(-maxSlopeAngle, Math.min(maxSlopeAngle, rollAngle));

    if (clampPitch) node.rotation.x = clampedPitch;
    if (clampRoll) node.rotation.z = clampedRoll;
  }
}

/**
 * Align a building footprint to the ground, sampling multiple points
 * Useful for larger structures like roads or compound buildings
 *
 * @param {TransformNode} node Babylon.js node to align
 * @param {Object} footprintData Footprint specification
 * @param {number} footprintData.centerX Center X coordinate
 * @param {number} footprintData.centerZ Center Z coordinate
 * @param {number} footprintData.width Width of footprint
 * @param {number} footprintData.depth Depth of footprint
 * @param {Object} options Alignment options (same as alignNodeToGround)
 * @returns {Object} Alignment result { centerHeight, avgSlope, isValid }
 */
export function alignCompoundBuildingFootprint(node, footprintData, options = {}) {
  const { centerX, centerZ, width, depth } = footprintData;
  const { yOffset = 0.1, clampPitch = false, clampRoll = false } = options;

  // Sample height at multiple points on the footprint
  const samples = [];
  const samplePoints = [
    { x: centerX, z: centerZ },                           // center
    { x: centerX - width / 2, z: centerZ },              // left
    { x: centerX + width / 2, z: centerZ },              // right
    { x: centerX, z: centerZ - depth / 2 },              // front
    { x: centerX, z: centerZ + depth / 2 },              // back
  ];

  for (const pt of samplePoints) {
    samples.push(sampleTerrainHeight(pt.x, pt.z));
  }

  const centerHeight = samples[0];
  const avgHeight = samples.reduce((a, b) => a + b, 0) / samples.length;
  const maxHeightDiff = Math.max(...samples) - Math.min(...samples);
  const avgSlope = maxHeightDiff / Math.max(width, depth);

  // Position at center with average offset
  node.position.x = centerX;
  node.position.y = centerHeight + yOffset;
  node.position.z = centerZ;

  // Slightly tilt if slope is high (creates natural-looking grading)
  if ((clampPitch || clampRoll) && avgSlope > 0.05) {
    const pitchDiff = samples[4] - samples[3];
    const rollDiff = samples[2] - samples[1];
    if (clampPitch) node.rotation.x = pitchDiff * 0.1;
    if (clampRoll) node.rotation.z = rollDiff * 0.1;
  }

  return {
    centerHeight,
    avgHeight,
    avgSlope,
    isValid: maxHeightDiff < 2, // Flat enough for building
  };
}

/**
 * Check if a position is too steep for building placement
 *
 * @param {number} x World X coordinate
 * @param {number} z World Z coordinate
 * @param {number} maxSlope Maximum allowed slope (0-1, default 0.15)
 * @returns {boolean} True if slope is acceptable for building
 */
export function isAcceptableSlope(x, z, maxSlope = 0.15) {
  const slope = getTerrainSlope(x, z);
  return slope <= maxSlope;
}

/**
 * Perlin-like noise (copied from createTerrain.js for consistency)
 */
function perlinNoise(x, z, seed = 0) {
  const n = Math.sin(x * 12.9898 + z * 78.233 + seed) * 43758.5453;
  return n - Math.floor(n);
}

/**
 * Improved interpolation
 */
function smoothstep(t) {
  return t * t * (3 - 2 * t);
}

/**
 * Multi-octave fractal noise (copied from createTerrain.js)
 */
function fractalNoise(x, z, octaves = 5, persistence = 0.55, lacunarity = 2.0) {
  let value = 0;
  let amplitude = 1;
  let frequency = 1;
  let maxValue = 0;

  for (let i = 0; i < octaves; i++) {
    value += amplitude * (perlinNoise(x * frequency, z * frequency, i) * 2 - 1);
    maxValue += amplitude;
    amplitude *= persistence;
    frequency *= lacunarity;
  }

  return value / maxValue;
}
