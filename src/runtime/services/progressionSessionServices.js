import { createTimeSystem } from '../../systems/timeSystem.js';
import { createNPCSystem } from '../../systems/npcSystem.js';
import { startAutoCheckpoints } from '../../systems/saveSystem.js';

/**
 * Contract: progression tick providers (time, npc, checkpoints).
 */
export function createProgressionSessionServices() {
  return Object.freeze({
    createTimeSystem,
    createNPCSystem,
    startAutoCheckpoints
  });
}
