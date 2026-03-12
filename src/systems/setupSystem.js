import { CONFIG } from '../config.js';
import { createIntroScreen } from '../ui/introScreen.js';
import { createInitializationScreen } from '../ui/initializationScreen.js';

export async function initSetupOverlay(state, onStart){
  // Phase 1: Show cinematic intro screen (skip with timeout)
  await createIntroScreen();

  // Phase 2: Show initialization/loading screen (skip with timeout)
  await createInitializationScreen();

  // Phase 3: Auto-start with default values instead of blocking on form
  // This allows the 3D scene to render immediately
  const overlay = document.getElementById('setupOverlay');
  const form = document.getElementById('setupForm');

  try {
    // Use default values to start the game immediately
    const playerName = 'Player';
    const nationIndex = 0;
    const startDistrict = 'capital-core';

    console.log('[Setup] AUTO-STARTING with defaults:', { playerName, nationIndex, startDistrict });

    // Set state properties
    state.playerName = playerName;
    state.currentNationIndex = nationIndex;
    state.startDistrict = startDistrict;

    // Increment visits counter
    state.nations[nationIndex].visits += 1;

    console.log('[Setup] State updated successfully - proceeding to 3D scene');

    // Hide overlay if it exists (never made it visible)
    if (overlay) {
      overlay.style.display = 'none';
    }

    // Proceed with game start - allows render loop to begin
    onStart();

  } catch (err) {
    console.error('[Setup] Error during auto-start:', err);
    // Still proceed even if setup fails - better to show 3D scene than error
    if (overlay) {
      overlay.style.display = 'none';
    }
    onStart();
  }
}
