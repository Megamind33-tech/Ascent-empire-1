import { worldConfig } from './worldConfig.js';
import { mobileConfig } from './mobileConfig.js';
import { economyConfig } from './economyConfig.js';
import { politicsConfig } from './politicsConfig.js';
import { careerStandards, laws, nations } from './gameDataConfig.js';

/**
 * Shared project configuration hub.
 * Keep this aggregate export for backward compatibility while Phase 2 modules
 * progressively adopt domain-level config imports.
 */
export const CONFIG = Object.freeze({
  world: worldConfig,
  mobile: mobileConfig,
  economy: economyConfig,
  politics: politicsConfig,
  careerStandards,
  laws,
  nations
});

export {
  worldConfig,
  mobileConfig,
  economyConfig,
  politicsConfig,
  careerStandards,
  laws,
  nations
};
