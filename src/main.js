import { runGameBootstrap } from './runtime/runGameBootstrap.js';

console.log('[BOOT] Loading main entry point');

// Ensure DOM is ready before bootstrapping
if (document.readyState === 'loading') {
  console.log('[BOOT] Waiting for DOM to be ready');
  document.addEventListener('DOMContentLoaded', startBoot);
} else {
  console.log('[BOOT] DOM already ready');
  startBoot();
}

function startBoot() {
  const canvas = document.getElementById('renderCanvas');

  if (!canvas) {
    const error = 'CRITICAL: Canvas element with id="renderCanvas" not found in DOM';
    console.error('[BOOT]', error);

    // Show visible error if canvas doesn't exist
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = 'position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;background:#000;color:#f00;font-family:monospace;font-size:18px;text-align:center;padding:20px;';
    errorDiv.textContent = error + '\n\nEnsure index.html contains: <canvas id="renderCanvas"></canvas>';
    document.body.appendChild(errorDiv);

    throw new Error(error);
  }

  console.log('[BOOT] Canvas element found, starting bootstrap');
  runGameBootstrap(canvas).catch(err => {
    console.error('[BOOT] Unhandled bootstrap error:', err);
  });
}
