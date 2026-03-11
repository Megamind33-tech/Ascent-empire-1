/**
 * mobileControls.js — Ascent Realms Touch Controls
 *
 * Handles:
 *   1. Pinch-to-zoom on the canvas → smoothly adjusts camera.radius
 *   2. Two-finger rotation → adjusts camera.alpha
 *   3. Single-finger pan drag is handled by Babylon natively via attachControl
 *
 * Strategy: intercept raw `touchmove` / `touchstart` / `touchend` on the canvas,
 * measure the gesture delta each frame, then apply to the ArcRotateCamera.
 * We do NOT call preventDefault() on single-touch so Babylon's built-in orbit
 * still works for look-around.
 */

const ZOOM_SENSITIVITY = 0.008;   // radius change per pixel of pinch delta
const ROTATE_SENSITIVITY = 0.005; // radians per pixel of two-finger twist delta

export function initMobileControls(canvas, camera) {
  let lastDist = 0;
  let lastAngle = 0;
  let activeTouches = [];

  function getTouches(e) {
    return Array.from(e.touches).filter(t => t.target === canvas || canvas.contains(t.target));
  }

  function dist(a, b) {
    const dx = a.clientX - b.clientX;
    const dy = a.clientY - b.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function angle(a, b) {
    return Math.atan2(b.clientY - a.clientY, b.clientX - a.clientX);
  }

  canvas.addEventListener('touchstart', (e) => {
    activeTouches = getTouches(e);
    if (activeTouches.length === 2) {
      lastDist  = dist(activeTouches[0], activeTouches[1]);
      lastAngle = angle(activeTouches[0], activeTouches[1]);
      // Prevent Babylon from consuming two-finger as orbit
      e.preventDefault();
    }
  }, { passive: false });

  canvas.addEventListener('touchmove', (e) => {
    const touches = getTouches(e);
    if (touches.length === 2) {
      e.preventDefault();

      const newDist  = dist(touches[0], touches[1]);
      const newAngle = angle(touches[0], touches[1]);

      // ── Pinch zoom ──
      const deltaDist = lastDist - newDist;
      const newRadius = camera.radius + deltaDist * ZOOM_SENSITIVITY * camera.radius;
      camera.radius = Math.max(
        camera.lowerRadiusLimit,
        Math.min(camera.upperRadiusLimit, newRadius)
      );

      // ── Two-finger rotation ──
      const deltaAngle = newAngle - lastAngle;
      // Clamp to avoid large jumps from angle wrap-around
      if (Math.abs(deltaAngle) < 0.3) {
        camera.alpha += deltaAngle * ROTATE_SENSITIVITY * 18;
      }

      lastDist  = newDist;
      lastAngle = newAngle;
    }
  }, { passive: false });

  canvas.addEventListener('touchend', (e) => {
    activeTouches = getTouches(e);
    if (activeTouches.length < 2) {
      lastDist  = 0;
      lastAngle = 0;
    }
  }, { passive: true });

  // ── Smooth momentum on pinch end ──
  // (Babylon's own inertia handles rotation, so we only need to ensure
  //  radius clamps are respected after gesture ends.)
}
