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

const ZOOM_SENSITIVITY = 0.008;   // radius change per pixel of pinch delta
const ROTATE_SENSITIVITY = 0.005; // radians per pixel of two-finger twist delta
const PAN_SENSITIVITY = 0.45;     // panning speed multiplier

export function initMobileControls(canvas, camera) {
  let lastDist = 0;
  let lastAngle = 0;
  let lastMidpoint = { x: 0, y: 0 };
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

  function getMidpoint(a, b) {
    return { x: (a.clientX + b.clientX) / 2, y: (a.clientY + b.clientY) / 2 };
  }

  canvas.addEventListener('touchstart', (e) => {
    activeTouches = getTouches(e);
    if (activeTouches.length === 2) {
      lastDist  = dist(activeTouches[0], activeTouches[1]);
      lastAngle = angle(activeTouches[0], activeTouches[1]);
      lastMidpoint = getMidpoint(activeTouches[0], activeTouches[1]);
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
      const newMidpoint = getMidpoint(touches[0], touches[1]);

      // ── Pinch zoom ──
      const deltaDist = lastDist - newDist;
      const newRadius = camera.radius + deltaDist * ZOOM_SENSITIVITY * camera.radius;
      camera.radius = Math.max(
        camera.lowerRadiusLimit,
        Math.min(camera.upperRadiusLimit, newRadius)
      );

      // ── Two-finger rotation ──
      const deltaAngle = newAngle - lastAngle;
      if (Math.abs(deltaAngle) < 0.3) {
        camera.alpha += deltaAngle * ROTATE_SENSITIVITY * 18;
      }

      // ── Two-finger panning ──
      const dx = newMidpoint.x - lastMidpoint.x;
      const dy = newMidpoint.y - lastMidpoint.y;
      
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

      lastDist  = newDist;
      lastAngle = newAngle;
      lastMidpoint = newMidpoint;
    }
  }, { passive: false });

  canvas.addEventListener('touchend', (e) => {
    activeTouches = getTouches(e);
    if (activeTouches.length < 2) {
      lastDist  = 0;
      lastAngle = 0;
    }
  }, { passive: true });
}

