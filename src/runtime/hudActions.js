import { politicsConfig } from '../config/index.js';

/**
 * Creates a stable HUD action dispatcher so main bootstrap only composes systems.
 */
export function createHudActionHandler({
  state,
  performAction,
  saveGame,
  loadGame,
  updateHUD,
  setMessage,
  onTravel,
  onLoad
}) {
  return async (action) => {
    try {
      if (action.type === 'travel') {
        onTravel(action.index);
      } else {
        const result = performAction(state, action);
        if (result === 'save') {
          const saved = await saveGame(state);
          if (!saved) {
            console.warn('[HUD Action] Save failed');
          }
        } else if (result === 'load') {
          const ok = await loadGame(state);
          if (ok) {
            onLoad();
          } else {
            console.warn('[HUD Action] Load failed');
          }
        }
      }
      updateHUD(state);
    } catch (err) {
      console.error('[HUD Action Handler] Error:', err.message);
      setMessage(`Error: ${err.message}`);
    }
  };
}

/**
 * Handles nation travel validation and state updates.
 */
export function createTravelHandler({ state, saveGame, setMessage }) {
  return (index, options = {}) => {
    try {
      const { forceReload = false, skipValidation = false } = options;

      if (index < 0 || index >= state.nations.length) {
        console.error('[Travel] Invalid nation index:', index);
        setMessage('Error: Invalid travel destination');
        return;
      }

      const target = state.nations[index];
      if (!target) {
        console.error('[Travel] Target nation is null');
        setMessage('Error: Travel destination not found');
        return;
      }

      if (index === state.currentNationIndex && !forceReload) {
        setMessage(`Already in ${target.name}`);
        return;
      }

      if (!skipValidation && index !== 0) {
        const requiredLegitimacy = target.coastal
          ? politicsConfig.travelLegitimacy.coastalNation
          : politicsConfig.travelLegitimacy.inlandNation;

        if (state.legitimacy < requiredLegitimacy) {
          setMessage(`Travel Denied: ${target.name} requires level ${requiredLegitimacy} legitimacy (Passport).`);
          return;
        }
      }

      state.currentNationIndex = index;
      state.pendingWorldReload = true;
      setMessage(`Traveling to ${target.name}...`);
      saveGame(state);
    } catch (err) {
      console.error('[Travel] Error during travel:', err.message);
      setMessage('Error: Travel failed');
    }
  };
}
