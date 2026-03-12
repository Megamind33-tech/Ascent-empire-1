import { stepRapier } from '../systems/rapierWorld.js';
import { runEconomyTick } from '../systems/economySystem.js';
import { runPoliticalTick } from '../systems/politicalSystem.js';
import { runEventTick } from '../systems/eventSystem.js';
import { updatePhysicsInteractions } from '../systems/physicsInteractionSystem.js';
import { updateCareer } from '../systems/careerSystem.js';
import { updateMedia } from '../systems/mediaSystem.js';
import { updateHUD } from '../ui/hud.js';
import { updateCameraNavigation } from '../systems/input.js';

export function createGameLoopFacade() {
  return Object.freeze({
    stepRapier,
    runEconomyTick,
    runPoliticalTick,
    runEventTick,
    updatePhysicsInteractions,
    updateCareer,
    updateMedia,
    updateHUD,
    updateCameraNavigation
  });
}
