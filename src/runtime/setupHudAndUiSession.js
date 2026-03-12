/**
 * Sets up HUD actions, setup overlay, and runtime UI hooks.
 * @param {object} deps grouped HUD/setup dependencies
 * @returns {Promise<void>}
 */
export async function setupHudAndUiSession({
  state,
  camera,
  buildNation,
  services
}) {
  const { hud: hudServices, setup: setupServices, assets: assetServices, nation: nationServices } = services;

  const handleTravel = hudServices.createTravelHandler({
    state,
    saveGame: nationServices.saveGame,
    setMessage: assetServices.setMessage
  });

  const onHudAction = hudServices.createHudActionHandler({
    state,
    performAction: hudServices.performAction,
    saveGame: nationServices.saveGame,
    loadGame: hudServices.loadGame,
    updateHUD: nationServices.updateHUD,
    setMessage: assetServices.setMessage,
    onTravel: handleTravel,
    onLoad: buildNation
  });

  hudServices.initHUD(state, onHudAction, (action) => hudServices.handleCameraAction(camera, action));

  await setupServices.initSetupOverlay(state, () => {
    setupServices.initAudio();
    buildNation();
  });

  assetServices.setMessage('Build your base. Legitimacy comes before mobility, and mobility comes before power.');
  setupServices.initializeUiLifecycle({
    state,
    setupDebugTrigger: () => {
      import('../ui/hud.js').then(({ triggerDebugEvent }) => {
        window.debugEvent = () => triggerDebugEvent(state);
      });
    }
  });
}
