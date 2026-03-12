/**
 * Encapsulates structure placement wiring to keep bootstrap thin.
 */
export function setupPlacementController({
  scene,
  state,
  shadows,
  bindPlacementInput,
  spawnInstitution,
  setMessage,
  playConstruction,
  saveGame,
  capitalize
}) {
  bindPlacementInput(scene, state, ({ type, point }) => {
    const mesh = spawnInstitution(scene, shadows, type, point, state);
    if (mesh) {
      setMessage(`${capitalize(type)} placed.`);
      playConstruction();
      saveGame(state);
    }
  });
}
