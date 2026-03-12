import { CONFIG } from '../config.js';
import { createIntroScreen } from '../ui/introScreen.js';
import { createInitializationScreen } from '../ui/initializationScreen.js';

export async function initSetupOverlay(state, onStart){
  // Phase 1: Show cinematic intro screen
  await createIntroScreen();

  // Phase 2: Show initialization/loading screen
  await createInitializationScreen();

  // Phase 3: Show nation selection form
  const overlay=document.getElementById('setupOverlay');
  const form=document.getElementById('setupForm');

  if (!form || !overlay) {
    console.error('[Setup] Form or overlay element not found!');
    return;
  }

  // Make overlay visible
  overlay.style.display = 'flex';
  // Avoid browser-native hidden form validity traps on mobile webviews.
  form.noValidate = true;

  // Use 'change' events to validate selections immediately
  const playerNameInput = document.getElementById('playerName');
  const nationSelect = document.getElementById('playerNation');
  const districtSelect = document.getElementById('playerStart');

  if (!playerNameInput || !nationSelect || !districtSelect) {
    console.error('[Setup] One or more form elements missing!');
    return;
  }

  // Provide robust defaults so startup cannot dead-end on mobile validation quirks.
  if (!playerNameInput.value?.trim()) playerNameInput.value = 'Player';
  if (!nationSelect.value) nationSelect.value = '0';
  if (!districtSelect.value) districtSelect.value = 'capital-core';

  // Add input validation for live feedback
  playerNameInput.addEventListener('input', () => {
    playerNameInput.value = playerNameInput.value.trim();
  });

  nationSelect.addEventListener('change', () => {
    console.log('[Setup] Nation selected:', nationSelect.value);
  });

  districtSelect.addEventListener('change', () => {
    console.log('[Setup] District selected:', districtSelect.value);
  });

  let hasStarted = false;
  const startGameFromSetup = (event) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    if (hasStarted) return;

    try {
      // Get fresh form values from DOM
      const playerName = playerNameInput.value.trim() || 'Player';
      const nationIndexStr = nationSelect.value;
      const startDistrict = districtSelect.value;

      console.log('[Setup] Form submitted with:', { playerName, nationIndexStr, startDistrict });

      // Use safe defaults if UI selections are unavailable in constrained mobile webviews.
      const safeNationIndexStr = nationIndexStr || '0';
      const safeStartDistrict = startDistrict || 'capital-core';

      const nationIndex = Number(safeNationIndexStr);

      // Validate nation index is in range
      if (isNaN(nationIndex) || nationIndex < 0 || nationIndex >= state.nations.length) {
        console.error('[Setup] Invalid nation index:', nationIndex);
        alert('Invalid nation selection');
        return;
      }

      // Set state properties
      state.playerName = playerName;
      state.currentNationIndex = nationIndex;
      state.startDistrict = safeStartDistrict;

      // Increment visits counter
      state.nations[nationIndex].visits += 1;

      console.log('[Setup] State updated successfully');

      hasStarted = true;
      // Hide overlay
      overlay.style.display = 'none';

      // Clear form after hiding overlay
      form.reset();

      // Proceed with game start
      onStart();
    } catch (err) {
      hasStarted = false;
      console.error('[Setup] Error during form submission:', err);
      alert('Error starting game: ' + err.message);
    }
  };

  form.addEventListener('submit', startGameFromSetup);

  // Mobile/webview hardening: some runtimes may not dispatch submit reliably.
  const startButton = form.querySelector('button[type="submit"]');
  if (startButton) {
    startButton.addEventListener('click', startGameFromSetup);
  }
}
