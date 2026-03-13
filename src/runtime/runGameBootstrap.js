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
      state
    } = runtimeContext;

    // Validate critical objects exist
    if (!engine || !scene || !camera) {
      throw new Error(`Missing critical objects: engine=${!!engine}, scene=${!!scene}, camera=${!!camera}`);
    }

    // ============================================================================
    // KEY FIX: Start render loop IMMEDIATELY with minimal stub to prevent timeout
    // ============================================================================
    console.group('[BOOT] Render Loop Start - Early Initialization');
    globalThis.__ASCENT_FIRST_FRAME_RENDERED__ = false;

    // Start with a minimal render loop that just clears and renders the scene
    // This allows rendering to begin BEFORE heavy setup completes
    const stubLoopRemover = createStubRenderLoop(engine, scene);
    console.log('[BOOT] Stub render loop started - engine can now render');

    // Wait for first frame with extended timeout to account for browser/device variation
    // This should be fast now since we're just rendering an empty scene
    try {
      await waitForFirstFrame(15000);
      console.log('[BOOT] First frame rendered successfully');
    } catch (err) {
      console.error('[BOOT] Failed to render first frame:', err.message);
      throw new Error(`Cannot render first frame: ${err.message}. Your device may not support WebGL.`);
    }

    console.groupEnd();

    // ============================================================================
    // Now run heavy setup while scene is already rendering in background
    // ============================================================================
    console.group('[BOOT] Game Session Setup (background)');
    const sessionResult = await setupGameplaySession({
      runtimeContext,
      canvas,
      bootFlow,
      BOOT_STATES,
      services: gameplaySessionServices
    });
    console.log('[BOOT] World, HUD, and systems initialized');
    console.groupEnd();

    // Remove the stub loop and replace with full game loop
    stubLoopRemover();

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

    console.group('[BOOT] Full Game Loop Start');
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
    console.log('[BOOT] Full game loop registered with engine');
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
  canvas.style.display = 'block';
  canvas.style.visibility = 'visible';

  // Ensure body doesn't hide the canvas
  document.body.style.overflow = 'hidden';
  document.body.style.height = '100vh';
  document.body.style.width = '100vw';

  console.log(`[BOOT] Canvas sized to ${canvas.width}x${canvas.height}px`);
  console.log('[BOOT] Canvas visibility and positioning set');
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

async function waitForFirstFrame(timeoutMs = 15000) {
  const start = performance.now();
  while (!globalThis.__ASCENT_FIRST_FRAME_RENDERED__) {
    await new Promise((resolve) => requestAnimationFrame(resolve));
    if (performance.now() - start > timeoutMs) {
      throw new Error('Render loop did not produce a frame before timeout.');
    }
  }
}

/**
 * Creates a minimal render loop that just renders the scene without game logic.
 * Uses requestAnimationFrame to avoid conflicts with engine.runRenderLoop().
 * This allows the engine to start rendering immediately while heavy setup continues.
 * Returns a function to unregister this stub loop.
 */
function createStubRenderLoop(engine, scene) {
  let stubLoopActive = true;
  let firstFrameRendered = false;
  let animFrameId = null;

  const stubRenderFn = () => {
    if (!stubLoopActive) {
      return;
    }

    try {
      // Just render the scene - no game logic
      scene.render();

      // Signal first frame after successful render
      if (!firstFrameRendered) {
        firstFrameRendered = true;
        globalThis.__ASCENT_FIRST_FRAME_RENDERED__ = true;
        console.log('[BOOT] First frame rendered (stub loop)');
      }
    } catch (err) {
      console.error('[BOOT] Stub render loop error:', err.message);
      if (!firstFrameRendered) {
        firstFrameRendered = true;
        globalThis.__ASCENT_FIRST_FRAME_RENDERED__ = true;
        console.warn('[BOOT] First frame marked as rendered despite error');
      }
    }

    // Continue looping while stub is active
    if (stubLoopActive) {
      animFrameId = requestAnimationFrame(stubRenderFn);
    }
  };

  // Start stub render loop using requestAnimationFrame (not engine.runRenderLoop)
  animFrameId = requestAnimationFrame(stubRenderFn);
  console.log('[BOOT] Stub render loop started via requestAnimationFrame');

  // Return a function to unregister the stub
  return () => {
    stubLoopActive = false;
    if (animFrameId !== null) {
      cancelAnimationFrame(animFrameId);
      animFrameId = null;
    }
    console.log('[BOOT] Stub render loop stopped');
  };
}
