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

  // Use 'change' events to validate selections immediately
  const playerNameInput = document.getElementById('playerName');
  const nationSelect = document.getElementById('playerNation');
  const districtSelect = document.getElementById('playerStart');

  if (!playerNameInput || !nationSelect || !districtSelect) {
    console.error('[Setup] One or more form elements missing!');
    return;
  }

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

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    event.stopPropagation();

    try {
      // Get fresh form values from DOM
      const playerName = playerNameInput.value.trim() || 'Player';
      const nationIndexStr = nationSelect.value;
      const startDistrict = districtSelect.value;

      console.log('[Setup] Form submitted with:', { playerName, nationIndexStr, startDistrict });

      // Validate inputs
      if (!nationIndexStr || nationIndexStr === '') {
        console.error('[Setup] No nation selected');
        alert('Please select a nation');
        return;
      }

      if (!startDistrict || startDistrict === '') {
        console.error('[Setup] No starting position selected');
        alert('Please select a starting position');
        return;
      }

      const nationIndex = Number(nationIndexStr);

      // Validate nation index is in range
      if (isNaN(nationIndex) || nationIndex < 0 || nationIndex >= state.nations.length) {
        console.error('[Setup] Invalid nation index:', nationIndex);
        alert('Invalid nation selection');
        return;
      }

      // Set state properties
      state.playerName = playerName;
      state.currentNationIndex = nationIndex;
      state.startDistrict = startDistrict;

      // Increment visits counter
      state.nations[nationIndex].visits += 1;

      console.log('[Setup] State updated successfully');

      // Hide overlay
      overlay.style.display = 'none';

      // Clear form after hiding overlay
      form.reset();

      // Proceed with game start
      onStart();
    } catch (err) {
      console.error('[Setup] Error during form submission:', err);
      alert('Error starting game: ' + err.message);
    }
  });
}