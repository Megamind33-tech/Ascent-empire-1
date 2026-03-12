/**
 * initializationScreen.js — Game Initialization & Loading Screen
 * Shows after intro, before nation selection
 */

export function createInitializationScreen() {
  const initScreen = document.createElement('div');
  initScreen.id = 'init-screen';
  initScreen.innerHTML = `
    <style>
      #init-screen {
        position: fixed;
        inset: 0;
        background: linear-gradient(135deg, #05070a 0%, #0a0e14 100%);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        z-index: 9998;
      }

      .init-container {
        text-align: center;
      }

      .init-logo {
        font-family: 'Cinzel', serif;
        font-size: 2.5rem;
        font-weight: 900;
        color: #eab308;
        text-transform: uppercase;
        letter-spacing: 8px;
        margin-bottom: 60px;
        text-shadow: 0 0 20px rgba(234, 179, 8, 0.3);
      }

      .init-status {
        font-size: 0.9rem;
        color: #aaa;
        text-transform: uppercase;
        letter-spacing: 2px;
        margin-bottom: 30px;
      }

      .init-progress {
        width: 300px;
        height: 3px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 2px;
        overflow: hidden;
        margin-bottom: 20px;
      }

      .init-progress-bar {
        height: 100%;
        background: linear-gradient(90deg, #eab308, #fde68a);
        width: 0%;
        animation: progress-pulse 2s ease-in-out infinite;
      }

      @keyframes progress-pulse {
        0%, 100% { width: 0%; }
        50% { width: 100%; }
      }

      .init-message {
        font-size: 0.75rem;
        color: #666;
        margin-top: 20px;
        min-height: 20px;
      }

      .init-dots {
        display: inline-block;
        width: 20px;
        text-align: left;
      }

      .dot {
        display: inline-block;
        width: 4px;
        height: 4px;
        background: #eab308;
        border-radius: 50%;
        margin: 0 4px;
        animation: dot-bounce 1.4s infinite;
      }

      .dot:nth-child(1) { animation-delay: 0s; }
      .dot:nth-child(2) { animation-delay: 0.2s; }
      .dot:nth-child(3) { animation-delay: 0.4s; }

      @keyframes dot-bounce {
        0%, 60%, 100% { transform: translateY(0); opacity: 0.3; }
        30% { transform: translateY(-10px); opacity: 1; }
      }
    </style>

    <div class="init-container">
      <div class="init-logo">ASCENT</div>

      <div class="init-status">Initializing Systems</div>

      <div class="init-progress">
        <div class="init-progress-bar"></div>
      </div>

      <div class="init-message">
        Loading<span class="init-dots">
          <span class="dot"></span>
          <span class="dot"></span>
          <span class="dot"></span>
        </span>
      </div>
    </div>
  `;

  document.body.appendChild(initScreen);

  return new Promise((resolve) => {
    let resolved = false;

    const cleanup = () => {
      if (resolved) return;
      resolved = true;
      if (initScreen.parentElement) initScreen.remove();
      resolve();
    };

    // Minimal wait (500ms) to show initialization started, then dismiss
    // This allows the 3D scene to render ASAP
    const timer = setTimeout(cleanup, 500);

    // Failsafe: guarantee cleanup even if promise handling is slow
    const failsafeTimer = setTimeout(cleanup, 2000);

    // Store timers so they can be cleared if needed
    initScreen._timers = { timer, failsafeTimer };
  });
}
