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

import { Vector3 } from '@babylonjs/core';

const ZOOM_SENSITIVITY = 0.01;    // radius change per pixel of pinch delta
const ROTATE_SENSITIVITY = 0.008; // radians per pixel of two-finger twist delta
const PAN_SENSITIVITY = 0.5;      // panning speed multiplier

export function initMobileControls(canvas, camera) {
  // Validate inputs before initializing
  if (!canvas) {
    console.warn('[Mobile Controls] Canvas not found, touch controls disabled');
    return;
  }
  if (!camera) {
    console.warn('[Mobile Controls] Camera not available, touch controls disabled');
    return;
  }

  // Verify camera has required properties
  if (typeof camera.radius !== 'number' || typeof camera.alpha !== 'number') {
    console.warn('[Mobile Controls] Camera missing required properties, touch controls disabled');
    return;
  }

  let lastDist = 0;
  let lastAngle = 0;
  let lastMidpoint = { x: 0, y: 0 };
  let activeTouches = [];

  function getTouches(e) {
    if (!e || !e.touches) return [];
    return Array.from(e.touches).filter(t => {
      try {
        return t && (t.target === canvas || (canvas && canvas.contains(t.target)));
      } catch (err) {
        return false;
      }
    });
  }

  function dist(a, b) {
    const dx = a.clientX - b.clientX;
    const dy = a.clientY - b.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function angle(a, b) {
    return Math.atan2(b.clientY - a.clientY, b.clientX - a.clientX);
  }

  function getMidpoint(a, b) {
    return { x: (a.clientX + b.clientX) / 2, y: (a.clientY + b.clientY) / 2 };
  }

  canvas.addEventListener('touchstart', (e) => {
    try {
      activeTouches = getTouches(e);
      if (activeTouches.length === 2) {
        lastDist  = dist(activeTouches[0], activeTouches[1]);
        lastAngle = angle(activeTouches[0], activeTouches[1]);
        lastMidpoint = getMidpoint(activeTouches[0], activeTouches[1]);
        // Prevent Babylon from consuming two-finger as orbit
        if (e && e.preventDefault) {
          e.preventDefault();
        }
      }
    } catch (err) {
      console.warn('[Mobile Controls] touchstart error:', err);
    }
  }, { passive: false });

  canvas.addEventListener('touchmove', (e) => {
    try {
      const touches = getTouches(e);
      if (touches.length === 2) {
        if (e && e.preventDefault) {
          e.preventDefault();
        }

        const newDist  = dist(touches[0], touches[1]);
        const newAngle = angle(touches[0], touches[1]);
        const newMidpoint = getMidpoint(touches[0], touches[1]);

        // ── Pinch zoom ──
        if (lastDist > 0 && camera.radius > 0) {
          const deltaDist = lastDist - newDist;
          const newRadius = camera.radius + deltaDist * ZOOM_SENSITIVITY * camera.radius;
          camera.radius = Math.max(
            camera.lowerRadiusLimit || 1,
            Math.min(camera.upperRadiusLimit || 1000, newRadius)
          );
        }

        // ── Two-finger rotation ──
        const deltaAngle = newAngle - lastAngle;
        if (Math.abs(deltaAngle) < 0.3) {
          camera.alpha += deltaAngle * ROTATE_SENSITIVITY * 18;
        }

        // ── Two-finger panning ──
        const dx = newMidpoint.x - lastMidpoint.x;
        const dy = newMidpoint.y - lastMidpoint.y;

        // Only pan if camera and target are valid
        if (camera.target && typeof camera.alpha === 'number') {
          const currentAlpha = camera.alpha;
          const dirF = new Vector3(Math.cos(currentAlpha), 0, Math.sin(currentAlpha));
          const dirR = new Vector3(Math.cos(currentAlpha + Math.PI/2), 0, Math.sin(currentAlpha + Math.PI/2));

          // Map screen delta to world movement
          // dy (Y screen) maps to Zoom/Forward (dirF), dx (X screen) maps to Strafe (dirR)
          camera.target.addInPlace(dirF.scale(dy * PAN_SENSITIVITY));
          camera.target.addInPlace(dirR.scale(-dx * PAN_SENSITIVITY));

          // Clamp target
          const limit = 800;
          camera.target.x = Math.max(-limit, Math.min(limit, camera.target.x));
          camera.target.z = Math.max(-limit, Math.min(limit, camera.target.z));
          camera.target.y = 18;
        }

        lastDist  = newDist;
        lastAngle = newAngle;
        lastMidpoint = newMidpoint;
      }
    } catch (err) {
      console.warn('[Mobile Controls] touchmove error:', err);
    }
  }, { passive: false });

  canvas.addEventListener('touchend', (e) => {
    try {
      activeTouches = getTouches(e);
      if (activeTouches.length < 2) {
        lastDist  = 0;
        lastAngle = 0;
      }
    } catch (err) {
      console.warn('[Mobile Controls] touchend error:', err);
    }
  }, { passive: true });
}

