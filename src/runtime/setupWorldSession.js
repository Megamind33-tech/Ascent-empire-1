/**
 * Sets up world/runtime systems, asset pipeline, nation lifecycle, and progression timers.
 * @param {object} deps grouped world/session dependencies
 * @returns {Promise<object>} world/session runtime handles
 */
export async function setupWorldSession({
  runtimeContext,
  canvas,
  bootFlow,
  BOOT_STATES,
  services
}) {
  const { world: worldServices, assets: assetServices, nation: nationServices, placement: placementServices, progression: progressionServices } = services;

  const {
    state,
    scene,
    camera,
    hemi,
    sun,
    moonLight,
    shadows,
    skyController
  } = runtimeContext;

  const { RAPIER, world } = await worldServices.createRapierWorld();

  await worldServices.initializeRuntimeSystems({
    state,
    canvas,
    camera,
    world,
    RAPIER,
    subscribeInteractions: worldServices.subscribeInteractions,
    subscribeAudioEvents: worldServices.subscribeAudioEvents,
    initDecisionHooks: worldServices.initDecisionHooks,
    initOverlayClosers: worldServices.initOverlayClosers,
    initMediaSystem: worldServices.initMediaSystem,
    initLedgerUI: worldServices.initLedgerUI,
    initMobileControls: worldServices.initMobileControls,
    setupCameraKeyboardShortcuts: worldServices.setupCameraKeyboardShortcuts,
    createFixedBox: worldServices.createFixedBox
  });

  worldServices.createPlayerMarker(scene, shadows);

  bootFlow.setState(BOOT_STATES.loading_assets);
  assetServices.setMessage('Initializing asset pipeline...');
  await assetServices.initAssetLoader(scene);
  assetServices.setMessage('Low-poly assets ready.');

  const { buildNation, nationRuntimeRef } = nationServices.createNationLifecycle({
    state,
    scene,
    shadows,
    createNationWorld: nationServices.createNationWorld,
    updateHUD: nationServices.updateHUD,
    setMessage: assetServices.setMessage,
    saveGame: nationServices.saveGame
  });

  placementServices.setupPlacementController({
    scene,
    state,
    shadows,
    bindPlacementInput: placementServices.bindPlacementInput,
    spawnInstitution: placementServices.spawnInstitution,
    setMessage: assetServices.setMessage,
    playConstruction: placementServices.playConstruction,
    saveGame: nationServices.saveGame,
    capitalize: placementServices.capitalize
  });

  const timeSystem = progressionServices.createTimeSystem(scene, sun, hemi, moonLight, skyController);
  const npcSystem = progressionServices.createNPCSystem(state);
  const checkpoints = progressionServices.startAutoCheckpoints(state);

  return {
    world,
    buildNation,
    nationRuntimeRef,
    timeSystem,
    npcSystem,
    checkpoints
  };
}
