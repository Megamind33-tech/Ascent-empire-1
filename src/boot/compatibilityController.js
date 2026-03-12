/**
 * Compatibility-mode activation helper used by boot/runtime orchestration.
 */
export function createCompatibilityController({ bootFlow, BOOT_STATES, mountCompatibilityMode }) {
  function activateCompatibilityMode(reason) {
    bootFlow.setState(BOOT_STATES.compatibility_mode, {
      detail: reason
    });

    mountCompatibilityMode({ reason });
  }

  return {
    activateCompatibilityMode
  };
}
