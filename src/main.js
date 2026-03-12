import { runGameBootstrap } from './runtime/runGameBootstrap.js';

console.log('[BOOT] Loading main entry point');

// Debug status tracking - press Ctrl+Shift+Alt to toggle debug mode
const debugStatus = document.getElementById('debugStatus');
let debugEnabled = localStorage.getItem('ascent-debug') === 'true';

document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.shiftKey && e.altKey && e.key === '0') {
    debugEnabled = !debugEnabled;
    localStorage.setItem('ascent-debug', debugEnabled);
    if (debugStatus) debugStatus.style.display = debugEnabled ? 'block' : 'none';
    console.log('[BOOT] Debug mode:', debugEnabled);
  }
});

function debugLog(msg) {
  console.log(msg);
  if (debugStatus && debugEnabled) {
    const line = document.createElement('div');
    line.textContent = msg.substring(0, 50);
    debugStatus.appendChild(line);
    debugStatus.scrollTop = debugStatus.scrollHeight;
  }
}

debugLog('[BOOT] Loading main entry point');

// Global error handler to catch any errors that aren't handled
window.addEventListener('error', (event) => {
  const msg = `Uncaught Error: ${event.error?.message || 'Unknown error'}`;
  console.error('[BOOT]', msg);
  debugLog('[ERROR] ' + msg);
  showFatalErrorPanel(msg, event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  const msg = `Promise Rejection: ${event.reason?.message || event.reason || 'Unknown error'}`;
  console.error('[BOOT]', msg);
  debugLog('[REJECT] ' + msg);
  showFatalErrorPanel(msg, event.reason);
});

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
    showFatalErrorPanel(`Bootstrap Failed: ${err?.message || 'Unknown error'}`, err);
  });
}

/**
 * Display a fatal error panel that's always visible
 */
function showFatalErrorPanel(message, error) {
  // Remove any existing error panel first
  const existing = document.getElementById('fatalErrorPanel');
  if (existing) existing.remove();

  const panel = document.createElement('div');
  panel.id = 'fatalErrorPanel';
  panel.style.cssText = `
    position: fixed;
    inset: 0;
    z-index: 99999;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.95);
    padding: 20px;
    font-family: monospace;
  `;

  const stack = error?.stack || '';
  panel.innerHTML = `
    <div style="
      background: #1a1a1a;
      border: 2px solid #ff3333;
      border-radius: 8px;
      padding: 30px;
      max-width: 600px;
      max-height: 80vh;
      overflow-y: auto;
      color: #fff;
    ">
      <h2 style="color: #ff6666; margin-top: 0; margin-bottom: 20px;">⚠️ FATAL ERROR</h2>
      <p style="color: #ffaaaa; margin-bottom: 15px; font-size: 14px;">${message}</p>
      <details style="background: rgba(255,0,0,0.1); padding: 15px; border-radius: 4px; margin-top: 15px;">
        <summary style="cursor: pointer; color: #ff9999; font-weight: bold;">Error Details</summary>
        <pre style="color: #ff7777; overflow: auto; max-height: 300px; margin: 10px 0 0 0; font-size: 11px;">${stack}</pre>
      </details>
      <p style="color: #999; margin-top: 20px; font-size: 12px;">Check browser console (F12) for additional information</p>
    </div>
  `;

  document.body.appendChild(panel);
}
