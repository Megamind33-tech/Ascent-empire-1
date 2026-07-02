import { Vector3 } from '@babylonjs/core';

// A dependable "home" framing that cleanly overlooks the city core.
const HOME_VIEW = { alpha: -Math.PI / 2.2, beta: 1.02, radius: 240 };

/**
 * Camera action API used by HUD and keyboard shortcuts.
 */
export function handleCameraAction(camera, action) {
  if (action === 'left') camera.alpha -= 0.14;
  else if (action === 'right') camera.alpha += 0.14;
  else if (action === 'zoomIn') camera.radius = Math.max(camera.lowerRadiusLimit, camera.radius - 10);
  else if (action === 'zoomOut') camera.radius = Math.min(camera.upperRadiusLimit, camera.radius + 10);
  else if (action === 'fitAll') {
    // Full reset (target + angles + zoom) so the player can always recover a
    // clean overhead view of the city, even after panning/rotating away.
    // NOTE: ArcRotateCamera.setTarget() recomputes alpha/beta/radius from the
    // current position, so it MUST run before we set the desired angles/zoom.
    if (typeof camera.setTarget === 'function') {
      camera.setTarget(new Vector3(0, 5, 0));
    } else {
      camera.target = new Vector3(0, 5, 0);
    }
    camera.alpha = HOME_VIEW.alpha;
    camera.beta = HOME_VIEW.beta;
    camera.radius = HOME_VIEW.radius;
  }
}

/**
 * Register keyboard shortcuts for camera controls.
 */
export function setupCameraKeyboardShortcuts(camera) {
  window.addEventListener('keydown', (event) => {
    if (event.code === 'Home') {
      event.preventDefault();
      handleCameraAction(camera, 'fitAll');
    }
  });
}
