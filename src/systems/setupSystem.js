import { CONFIG } from '../config.js';
export function initSetupOverlay(state, onStart){
  const overlay=document.getElementById('setupOverlay');
  const form=document.getElementById('setupForm');

  if (!form || !overlay) {
    console.error('[Setup] Form or overlay element not found!');
    return;
  }

  // On mobile, the browser waits up to 300 ms after a touch before firing
  // 'click' / 'submit', making the button feel unresponsive.
  // Listening on 'touchend' fires immediately and we then call requestSubmit()
  // which runs all native validation before the submit handler below.
  const submitBtn = form.querySelector('[type="submit"]');
  if (submitBtn) {
    submitBtn.addEventListener('touchend', (e) => {
      e.preventDefault(); // stop the subsequent mouse-event chain
      form.requestSubmit();
    }, { passive: false });
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    try {
      // Get fresh form values from DOM every time
      const playerNameInput = document.getElementById('playerName');
      const nationSelect = document.getElementById('playerNation');
      const districtSelect = document.getElementById('playerStart');

      if (!playerNameInput || !nationSelect || !districtSelect) {
        console.error('[Setup] One or more form elements missing!');
        return;
      }

      // Validate and set state
      const playerName = playerNameInput.value.trim() || 'Player';
      const nationIndex = Number(nationSelect.value);
      const startDistrict = districtSelect.value;

      // Validate nation index is in range
      if (nationIndex < 0 || nationIndex >= state.nations.length) {
        console.error('[Setup] Invalid nation index:', nationIndex);
        return;
      }

      // Set state properties
      state.playerName = playerName;
      state.currentNationIndex = nationIndex;
      state.startDistrict = startDistrict;

      // Increment visits counter
      state.nations[nationIndex].visits += 1;

      // Clear form before hiding
      form.reset();

      // Hide overlay
      overlay.style.display = 'none';

      // Proceed with game start
      onStart();
    } catch (err) {
      console.error('[Setup] Error during form submission:', err);
    }
  });
}