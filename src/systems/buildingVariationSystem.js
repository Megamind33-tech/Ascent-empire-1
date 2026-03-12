/**
 * buildingVariationSystem.js — Building Visual Variation & Material Theming
 * ========================================================
 * Provides material tinting, color palettes, and visual variation for buildings
 * to prevent repetitive copy-paste look while using shared asset models.
 * Implements district-specific color themes and subtle visual differences.
 */

import { StandardMaterial, PBRMaterial, Color3, Color4 } from '@babylonjs/core';

/**
 * District color themes for visual identity
 * Each district gets a base color palette that tints buildings
 */
const DISTRICT_THEMES = {
  'civic-center': {
    name: 'Government Blue',
    colors: [
      { r: 0.25, g: 0.45, b: 0.65 },  // Light blue
      { r: 0.20, g: 0.40, b: 0.60 },  // Standard blue
      { r: 0.18, g: 0.35, b: 0.55 },  // Darker blue
      { r: 0.30, g: 0.50, b: 0.70 },  // Lighter blue
    ],
    tintStrength: 0.3,
  },
  'residential-north': {
    name: 'Suburban Green',
    colors: [
      { r: 0.50, g: 0.48, b: 0.40 },  // Warm cream
      { r: 0.55, g: 0.50, b: 0.38 },  // Light tan
      { r: 0.45, g: 0.42, b: 0.35 },  // Warm brown
      { r: 0.60, g: 0.55, b: 0.42 },  // Sandy beige
    ],
    tintStrength: 0.25,
  },
  'residential-south': {
    name: 'Suburban Green',
    colors: [
      { r: 0.50, g: 0.48, b: 0.40 },
      { r: 0.55, g: 0.50, b: 0.38 },
      { r: 0.45, g: 0.42, b: 0.35 },
      { r: 0.60, g: 0.55, b: 0.42 },
    ],
    tintStrength: 0.25,
  },
  'industrial-east': {
    name: 'Industrial Gray',
    colors: [
      { r: 0.40, g: 0.40, b: 0.42 },  // Cool gray
      { r: 0.35, g: 0.35, b: 0.38 },  // Dark gray
      { r: 0.45, g: 0.45, b: 0.48 },  // Light gray
      { r: 0.32, g: 0.32, b: 0.35 },  // Charcoal
    ],
    tintStrength: 0.2,
    roughness: 0.85,
  },
  'entertainment': {
    name: 'Entertainment Gold',
    colors: [
      { r: 0.65, g: 0.55, b: 0.35 },  // Gold
      { r: 0.60, g: 0.48, b: 0.28 },  // Bronze
      { r: 0.70, g: 0.60, b: 0.40 },  // Light gold
      { r: 0.55, g: 0.45, b: 0.25 },  // Dark bronze
    ],
    tintStrength: 0.35,
  },
  'rural-periphery': {
    name: 'Rural Earth',
    colors: [
      { r: 0.55, g: 0.45, b: 0.30 },  // Earthy brown
      { r: 0.50, g: 0.40, b: 0.25 },  // Dark earth
      { r: 0.60, g: 0.50, b: 0.35 },  // Light tan
      { r: 0.48, g: 0.38, b: 0.22 },  // Deep brown
    ],
    tintStrength: 0.3,
  },
};

/**
 * Building type variation profiles
 * Defines how to vary each building type (scale, rotation, material properties)
 */
const BUILDING_PROFILES = {
  'housing': {
    scaleRange: [0.90, 1.10],           // ±10% scale variation
    rotationSnap: Math.PI / 4,           // 45° increments for some randomness
    roughnessRange: [0.75, 0.85],
    metallic: 0.02,
    allowPaletteIndex: [0, 1, 2, 3],   // Can use any color in palette
  },
  'cottage': {
    scaleRange: [0.85, 1.15],
    rotationSnap: Math.PI / 4,
    roughnessRange: [0.80, 0.90],
    metallic: 0.01,
    allowPaletteIndex: [0, 1, 2, 3],
  },
  'store': {
    scaleRange: [0.95, 1.05],           // ±5% scale variation
    rotationSnap: Math.PI / 2,          // 90° only (street-aligned)
    roughnessRange: [0.70, 0.80],
    metallic: 0.05,
    allowPaletteIndex: [0, 1],         // Limited color variation
  },
  'police': {
    scaleRange: [0.98, 1.02],
    rotationSnap: Math.PI / 2,
    roughnessRange: [0.75, 0.85],
    metallic: 0.03,
    allowPaletteIndex: [0, 1],
  },
  'hospital': {
    scaleRange: [0.97, 1.03],
    rotationSnap: Math.PI / 2,
    roughnessRange: [0.70, 0.80],
    metallic: 0.02,
    allowPaletteIndex: [0, 1],
  },
  'school': {
    scaleRange: [0.95, 1.05],
    rotationSnap: Math.PI / 2,
    roughnessRange: [0.75, 0.85],
    metallic: 0.03,
    allowPaletteIndex: [0, 1],
  },
  'stadium': {
    scaleRange: [0.90, 1.10],
    rotationSnap: Math.PI / 2,
    roughnessRange: [0.65, 0.75],
    metallic: 0.08,
    allowPaletteIndex: [0, 1, 2],
  },
  'mine': {
    scaleRange: [0.85, 1.15],
    rotationSnap: Math.PI / 4,
    roughnessRange: [0.80, 0.95],
    metallic: 0.10,
    allowPaletteIndex: [0, 1, 2],
  },
  'refinery': {
    scaleRange: [0.85, 1.15],
    rotationSnap: Math.PI / 4,
    roughnessRange: [0.75, 0.90],
    metallic: 0.12,
    allowPaletteIndex: [0, 1, 2],
  },
  'barracks': {
    scaleRange: [0.90, 1.10],
    rotationSnap: Math.PI / 2,
    roughnessRange: [0.80, 0.90],
    metallic: 0.05,
    allowPaletteIndex: [0, 1],
  },
  'base': {
    scaleRange: [0.90, 1.10],
    rotationSnap: Math.PI / 2,
    roughnessRange: [0.80, 0.90],
    metallic: 0.05,
    allowPaletteIndex: [0, 1],
  },
  'rural_farm': {
    scaleRange: [0.85, 1.15],
    rotationSnap: Math.PI / 4,
    roughnessRange: [0.85, 0.95],
    metallic: 0.02,
    allowPaletteIndex: [0, 1, 2, 3],
  },
  'greenhouse': {
    scaleRange: [0.90, 1.10],
    rotationSnap: Math.PI / 4,
    roughnessRange: [0.60, 0.75],      // More reflective (glass)
    metallic: 0.20,
    allowPaletteIndex: [1, 2],
  },
};

/**
 * Create a material with district-specific tinting
 * Clones and tints materials so repeated buildings look different
 *
 * @param {Scene} scene Babylon.js scene
 * @param {string} districtId District identifier
 * @param {string} buildingKey Building type key
 * @returns {Material} PBR material with tinting applied
 */
export function createDistrictMaterial(scene, districtId, buildingKey) {
  const theme = DISTRICT_THEMES[districtId] || DISTRICT_THEMES['residential-north'];
  const profile = BUILDING_PROFILES[buildingKey] || {};

  // Pick a color from the district's palette
  const allowedIndices = profile.allowPaletteIndex || [0, 1, 2, 3];
  const colorIndex = allowedIndices[Math.floor(Math.random() * allowedIndices.length)];
  const color = theme.colors[colorIndex];

  // Create a unique material
  const materialId = `mat-${districtId}-${buildingKey}-${Date.now()}-${Math.random()}`;
  const material = new PBRMaterial(materialId, scene);

  // Base albedo with tint
  const baseColor = new Color3(
    0.5 + color.r * (theme.tintStrength || 0.25),
    0.5 + color.g * (theme.tintStrength || 0.25),
    0.5 + color.b * (theme.tintStrength || 0.25)
  );
  material.albedoColor = baseColor;

  // Surface properties with variation
  const roughnessRange = profile.roughnessRange || [0.75, 0.85];
  material.roughness = roughnessRange[0] + Math.random() * (roughnessRange[1] - roughnessRange[0]);
  material.metallic = profile.metallic || 0.03;
  material.microSurface = 0.6;
  material.environmentIntensity = 0.75;

  return material;
}

/**
 * Apply visual variation to a building mesh
 * Modifies scale, rotation, and material properties to create uniqueness
 *
 * @param {TransformNode} mesh Building mesh
 * @param {string} districtId District identifier
 * @param {string} buildingKey Building type key
 * @param {Scene} scene Babylon.js scene
 * @param {Object} options Additional options
 * @returns {Object} Applied variations { scale, rotation, material }
 */
export function applyBuildingVariation(mesh, districtId, buildingKey, scene, options = {}) {
  const { baseScale = 1.0, baseRotation = 0 } = options;
  const profile = BUILDING_PROFILES[buildingKey] || {};

  // Scale variation
  const scaleRange = profile.scaleRange || [0.95, 1.05];
  const scaleVariation = scaleRange[0] + Math.random() * (scaleRange[1] - scaleRange[0]);
  const finalScale = baseScale * scaleVariation;

  // Rotation with snap points (cardinal + 45° angles)
  let rotation = baseRotation;
  if (profile.rotationSnap) {
    const snapCount = Math.floor((2 * Math.PI) / profile.rotationSnap);
    const snapIndex = Math.floor(Math.random() * snapCount);
    rotation = baseRotation + (snapIndex * profile.rotationSnap);
  }

  // Apply to mesh
  mesh.scaling.set(finalScale, finalScale, finalScale);
  mesh.rotation.y = rotation;

  // Apply material with district tinting
  const material = createDistrictMaterial(scene, districtId, buildingKey);
  mesh.material = material;

  // Apply to child meshes
  mesh.getChildMeshes().forEach(child => {
    child.material = material;
  });

  return {
    scale: finalScale,
    rotation,
    material,
  };
}

/**
 * Get a variation-adjusted scale value
 * Useful for applying variation without full material management
 *
 * @param {string} buildingKey Building type key
 * @returns {number} Scale multiplier (0.85-1.15 typically)
 */
export function getVariationScale(buildingKey) {
  const profile = BUILDING_PROFILES[buildingKey] || {};
  const scaleRange = profile.scaleRange || [0.95, 1.05];
  return scaleRange[0] + Math.random() * (scaleRange[1] - scaleRange[0]);
}

/**
 * Get a variation-adjusted rotation value
 * Respects snap points defined for each building type
 *
 * @param {string} buildingKey Building type key
 * @param {number} baseRotation Base rotation in radians (default 0)
 * @returns {number} Rotation in radians
 */
export function getVariationRotation(buildingKey, baseRotation = 0) {
  const profile = BUILDING_PROFILES[buildingKey] || {};

  if (profile.rotationSnap) {
    const snapCount = Math.floor((2 * Math.PI) / profile.rotationSnap);
    const snapIndex = Math.floor(Math.random() * snapCount);
    return baseRotation + (snapIndex * profile.rotationSnap);
  }

  return baseRotation + (Math.random() - 0.5) * 0.2;
}

/**
 * Get material properties for a building type
 * Useful for PBR material creation
 *
 * @param {string} buildingKey Building type key
 * @returns {Object} { roughness, metallic, microSurface }
 */
export function getBuildingMaterialProperties(buildingKey) {
  const profile = BUILDING_PROFILES[buildingKey] || {};
  const roughnessRange = profile.roughnessRange || [0.75, 0.85];

  return {
    roughness: roughnessRange[0] + Math.random() * (roughnessRange[1] - roughnessRange[0]),
    metallic: profile.metallic || 0.03,
    microSurface: 0.6,
  };
}

/**
 * Get the district theme for a given district ID
 *
 * @param {string} districtId District identifier
 * @returns {Object} Theme object { name, colors, tintStrength, ... }
 */
export function getDistrictTheme(districtId) {
  return DISTRICT_THEMES[districtId] || DISTRICT_THEMES['residential-north'];
}

/**
 * Get all available themes
 *
 * @returns {Object} All themes keyed by districtId
 */
export function getAllThemes() {
  return { ...DISTRICT_THEMES };
}
