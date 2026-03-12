import '@babylonjs/loaders';
import { createBootFlow, BOOT_STATES } from '../boot/bootFlow.js';
import { createCompatibilityController } from '../boot/compatibilityController.js';
import { mountCompatibilityMode } from '../compatibility/compatibilityMode.js';
import { startGameLoop } from './gameLoop.js';
import { createGameRuntimeContext } from './createGameRuntimeContext.js';
import { setupGameplaySession } from './setupGameplaySession.js';
import { createBootstrapFacades } from './bootstrapDependencies.js';

/**
 * Runtime entrypoint contract.
 * @param {HTMLCanvasElement|null} canvas render target canvas element
 * @returns {Promise<void>} resolves when startup path is initialized
 */
export async function runGameBootstrap(canvas) {
  console.group('[BOOT] Game Bootstrap Started');

  // Guard: canvas element must exist
  if (!canvas) {
    const error = 'Render canvas element (id="renderCanvas") not found in DOM';
    console.error('[BOOT]', error);
    showErrorPanel(error);
    throw new Error(error);
  }

  // Ensure canvas has proper dimensions for Babylon rendering
  ensureCanvasSize(canvas);
  console.log('[BOOT] Canvas element found and sized');
  console.groupEnd();

  let compatibility;
  const bootFlow = createBootFlow({
    onRetry3D: () => window.location.reload(),
    onCompatibilityMode: () => compatibility.activateCompatibilityMode('Your device cannot initialize full Babylon.js 3D rendering, but core strategy systems remain available.')
  });
  compatibility = createCompatibilityController({
    bootFlow,
    BOOT_STATES,
    mountCompatibilityMode
  });

  const { runtimeContextDependencies, gameplaySessionServices, gameLoopDependencies } = createBootstrapFacades();

  try {
    console.group('[BOOT] Runtime Context Creation');
    const runtimeContext = await createGameRuntimeContext({
      canvas,
      bootFlow,
      BOOT_STATES,
      ...runtimeContextDependencies,
      activateCompatibilityMode: compatibility.activateCompatibilityMode
    });
    console.log('[BOOT] Engine and scene created successfully');
    console.groupEnd();

    if (!runtimeContext) {
      console.log('[BOOT] No runtime context (fallback mode)');
      return;
    }

    const {
      engine,
      scene,
      camera,
      state,
      world,
      npcSystem,
      checkpoints,
      timeSystem,
      buildNation,
      nationRuntimeRef
    } = runtimeContext;

    // Validate critical objects exist
    if (!engine || !scene || !camera) {
      throw new Error(`Missing critical objects: engine=${!!engine}, scene=${!!scene}, camera=${!!camera}`);
    }

    console.group('[BOOT] Game Session Setup');
    const sessionResult = await setupGameplaySession({
      runtimeContext,
      canvas,
      bootFlow,
      BOOT_STATES,
      services: gameplaySessionServices
    });
    console.log('[BOOT] World, HUD, and systems initialized');
    console.groupEnd();

    // Extract all required objects
    const {
      engine: sessionEngine,
      scene: sessionScene,
      state: sessionState,
      world: sessionWorld,
      npcSystem: sessionNpc,
      checkpoints: sessionCheckpoints,
      timeSystem: sessionTime,
      buildNation: sessionBuildNation,
      nationRuntimeRef: sessionNationRef
    } = sessionResult;

    console.group('[BOOT] Render Loop Start');
    globalThis.__ASCENT_FIRST_FRAME_RENDERED__ = false;

    startGameLoop({
      engine: sessionEngine,
      scene: sessionScene,
      state: sessionState,
      world: sessionWorld,
      ...gameLoopDependencies,
      npcSystem: sessionNpc,
      checkpoints: sessionCheckpoints,
      buildNation: sessionBuildNation,
      nationRuntimeRef: sessionNationRef,
      timeSystem: sessionTime,
      camera
    });
    console.log('[BOOT] Render loop registered with engine');

    await waitForFirstFrame(8000);
    console.log('[BOOT] First frame rendered');
    console.groupEnd();

    console.log('[BOOT] Setting boot state to READY');
    bootFlow.setState(BOOT_STATES.ready);
    console.log('[BOOT] ✓ Game bootstrap complete - all systems online');

  } catch (err) {
    console.group('[BOOT] STARTUP ERROR');
    console.error('[BOOT] Error during bootstrap:', err);
    console.error('[BOOT] Stack:', err.stack);

    // Show error in both console and UI
    const userMessage = `Startup Error: ${err.message || 'Unknown initialization failure. Check browser console for details.'}`;
    console.error('[BOOT]', userMessage);
    showErrorPanel(userMessage, err);

    console.groupEnd();

    bootFlow.setState(BOOT_STATES.boot_error, {
      detail: userMessage
    });
  }
}

/**
 * Ensure canvas element has proper size for Babylon.js rendering
 */
function ensureCanvasSize(canvas) {
  // Set explicit pixel size if not already set
  if (!canvas.width || canvas.width === 300) {
    canvas.width = window.innerWidth;
  }
  if (!canvas.height || canvas.height === 150) {
    canvas.height = window.innerHeight;
  }

  // Ensure CSS sizing is correct
  canvas.style.position = 'absolute';
  canvas.style.top = '0';
  canvas.style.left = '0';
  canvas.style.width = '100vw';
  canvas.style.height = '100vh';
  canvas.style.zIndex = '0';

  console.log(`[BOOT] Canvas sized to ${canvas.width}x${canvas.height}px`);
}

/**
 * Display error panel to user (visible fallback when silent failures occur)
 */
function showErrorPanel(message, err) {
  const errorPanel = document.getElementById('bootErrorPanel') || document.createElement('div');
  errorPanel.id = 'bootErrorPanel';
  errorPanel.style.cssText = `
    position: fixed;
    inset: 0;
    z-index: 99999;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0,0,0,0.9);
    font-family: monospace;
    color: #ff4444;
    padding: 20px;
  `;

  const content = `
    <div style="max-width: 500px; text-align: center;">
      <h2 style="color: #ff6666; margin-bottom: 20px;">⚠️ STARTUP ERROR</h2>
      <p style="color: #ffaaaa; margin-bottom: 15px;">${message}</p>
      <details style="text-align: left; background: rgba(255,0,0,0.1); padding: 10px; border-radius: 4px; margin-top: 15px;">
        <summary style="cursor: pointer; color: #ff9999;">Error Details</summary>
        <pre style="color: #ff7777; overflow: auto; max-height: 200px; margin-top: 10px;">${err ? (err.message + '\n\n' + (err.stack || '')) : 'No error details available'}</pre>
      </details>
      <p style="color: #aaa; margin-top: 20px; font-size: 0.9em;">Check browser console (F12) for additional information</p>
    </div>
  `;

  errorPanel.innerHTML = content;
  if (!errorPanel.parentElement) {
    document.body.appendChild(errorPanel);
  }
}

async function waitForFirstFrame(timeoutMs = 8000) {
  const start = performance.now();
  while (!globalThis.__ASCENT_FIRST_FRAME_RENDERED__) {
    await new Promise((resolve) => requestAnimationFrame(resolve));
    if (performance.now() - start > timeoutMs) {
      throw new Error('Render loop did not produce a frame before timeout.');
    }
  }
}
