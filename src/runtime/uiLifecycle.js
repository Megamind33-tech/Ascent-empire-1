/**
 * Runtime UI lifecycle hooks (resume + debug event wiring).
 */
export function initializeUiLifecycle({ state, setupDebugTrigger }) {
  window.addEventListener('resumeGame', () => {
    state.gamePaused = false;
  });

  setupDebugTrigger();
}
