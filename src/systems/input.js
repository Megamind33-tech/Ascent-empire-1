import { emit } from './eventBus.js';

export function bindPlacementInput(scene, state, onPlace) {
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