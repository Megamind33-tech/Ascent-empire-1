/**
 * Initializes core runtime systems required before gameplay loop starts.
 * This keeps bootstrap composition focused and reduces inline setup coupling.
 */
export async function initializeRuntimeSystems({
  state,
  canvas,
  camera,
  world,
  RAPIER,
  subscribeInteractions,
  subscribeAudioEvents,
  initDecisionHooks,
  initOverlayClosers,
  initMediaSystem,
  initLedgerUI,
  initMobileControls,
  setupCameraKeyboardShortcuts,
  createFixedBox
}) {
  state.worldRefs.rapier = RAPIER;
  state.worldRefs.rapierWorld = world;

  if (world && RAPIER) {
    createFixedBox(world, RAPIER, { x: 0, y: -2, z: 0 }, { x: 900, y: 2, z: 900 });
  } else {
    console.warn('[Bootstrap] Physics world unavailable; running visual-only world collisions.');
  }

  subscribeInteractions(state);
  subscribeAudioEvents(state);
  initDecisionHooks(state);
  initOverlayClosers();
  initMediaSystem(state);
  initLedgerUI();

  try {
    initMobileControls(canvas, camera);
  } catch (err) {
    console.warn('[Bootstrap] Mobile controls initialization failed:', err);
  }

  setupCameraKeyboardShortcuts(camera);
}
