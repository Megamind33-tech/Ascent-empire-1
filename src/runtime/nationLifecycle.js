/**
 * Nation lifecycle orchestration for world rebuilds.
 * Keeps nation load/reload behavior isolated from bootstrap wiring.
 */
export function createNationLifecycle({
  state,
  scene,
  shadows,
  createNationWorld,
  updateHUD,
  setMessage,
  saveGame,
  deviceTier = 'mid'
}) {
  const nationRuntimeRef = { current: null };

  function buildNation() {
    try {
      if (!state.nations || state.currentNationIndex >= state.nations.length) {
        console.error('[BuildNation] Invalid nation index:', state.currentNationIndex);
        setMessage('Error: Invalid nation selection');
        return;
      }

      nationRuntimeRef.current = createNationWorld(scene, shadows, state, deviceTier);
      updateHUD(state);

      const nationName = state.nations[state.currentNationIndex]?.name || 'Unknown';
      setMessage(`${nationName} loaded.`);
      saveGame(state);
    } catch (err) {
      console.error('[BuildNation] Error building nation world:', err);
      setMessage(`Error loading nation: ${err.message}`);
    }
  }

  return {
    buildNation,
    nationRuntimeRef
  };
}
