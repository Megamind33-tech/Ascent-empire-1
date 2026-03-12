/**
 * Camera action API used by HUD and keyboard shortcuts.
 */
export function handleCameraAction(camera, action) {
  if (action === 'left') camera.alpha -= 0.14;
  else if (action === 'right') camera.alpha += 0.14;
  else if (action === 'zoomIn') camera.radius = Math.max(camera.lowerRadiusLimit, camera.radius - 18);
  else if (action === 'zoomOut') camera.radius = Math.min(camera.upperRadiusLimit, camera.radius + 18);
  else if (action === 'fitAll') camera.radius = 520;
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
