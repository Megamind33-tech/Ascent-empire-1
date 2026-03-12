import { emit } from './eventBus.js';
import { Vector3 } from '@babylonjs/core';

const keys = { w: false, a: false, s: false, d: false };

export function bindPlacementInput(scene, state, onPlace) {
  window.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();
    if (keys.hasOwnProperty(key)) keys[key] = true;
  });
  window.addEventListener('keyup', (e) => {
    const key = e.key.toLowerCase();
    if (keys.hasOwnProperty(key)) keys[key] = false;
  });

  scene.onPointerObservable.add((pointerInfo) => {
    if (pointerInfo.type !== 1) return; // POINTERDOWN

    // Handle building placement if in build mode
    if (state.selectionMode) {
      const pick = scene.pick(scene.pointerX, scene.pointerY, (mesh) => mesh?.metadata?.buildable === true);
      if (!pick?.hit || !pick.pickedPoint) return;
      onPlace({ type: state.selectionMode, point: pick.pickedPoint.clone() });
      state.selectionMode = null;
      return;
    }

    // Direct Interaction: Shoot NPC if clicked outside build mode
    const pickInteraction = scene.pick(scene.pointerX, scene.pointerY);
    if (pickInteraction?.hit && pickInteraction.pickedMesh?.name.startsWith('agent')) {
      emit('NPC_SHOT', { agentId: pickInteraction.pickedMesh.name });
    }
  });
}

export function updateCameraNavigation(camera, dt) {
  const speed = 150 * dt;
  const angle = camera.alpha;
  
  // Forward/Backward based on camera rotation
  const dirF = new Vector3(Math.cos(angle), 0, Math.sin(angle));
  // Right/Left based on camera rotation
  const dirR = new Vector3(Math.cos(angle + Math.PI/2), 0, Math.sin(angle + Math.PI/2));

  if (keys.w) camera.target.addInPlace(dirF.scale(speed));
  if (keys.s) camera.target.addInPlace(dirF.scale(-speed));
  if (keys.a) camera.target.addInPlace(dirR.scale(speed));
  if (keys.d) camera.target.addInPlace(dirR.scale(-speed));

  // Clamp camera target to stay within world bounds (roughly)
  const limit = 800;
  camera.target.x = Math.max(-limit, Math.min(limit, camera.target.x));
  camera.target.z = Math.max(-limit, Math.min(limit, camera.target.z));
  camera.target.y = 18; // Keep height fixed for godview
}