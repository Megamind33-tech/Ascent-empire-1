const BOOT_STATES = {
  checking_support: 'checking_support',
  loading_engine: 'loading_engine',
  loading_assets: 'loading_assets',
  ready: 'ready',
  compatibility_mode: 'compatibility_mode',
  boot_error: 'boot_error'
};

const STATE_LABELS = {
  [BOOT_STATES.checking_support]: 'Checking graphics compatibility…',
  [BOOT_STATES.loading_engine]: 'Starting graphics engine…',
  [BOOT_STATES.loading_assets]: 'Loading city assets…',
  [BOOT_STATES.ready]: 'City systems online.',
  [BOOT_STATES.compatibility_mode]: 'Compatibility mode enabled.',
  [BOOT_STATES.boot_error]: 'Boot issue detected.'
};

export function createBootFlow({ onRetry3D, onCompatibilityMode }) {
  ensureBootStyles();

  const overlay = document.createElement('div');
  overlay.id = 'bootOverlay';
  overlay.className = 'boot-overlay';
  overlay.innerHTML = `
    <div class="boot-panel">
      <div class="boot-badge">ASCENT EMPIRE</div>
      <h1>System Initialization</h1>
      <p id="bootStatusText">Preparing startup sequence…</p>
      <div id="bootDetails" class="boot-details"></div>
      <div id="bootActions" class="boot-actions"></div>
    </div>
  `;

  document.body.appendChild(overlay);

  const statusText = overlay.querySelector('#bootStatusText');
  const details = overlay.querySelector('#bootDetails');
  const actions = overlay.querySelector('#bootActions');
  let currentState = 'initializing';

  // Failsafe: if boot flow stalls, provide recovery actions instead of an indefinite grey/black screen.
  const stallTimer = setTimeout(() => {
    if (overlay.isConnected && currentState !== BOOT_STATES.ready) {
      setState(BOOT_STATES.boot_error, {
        detail: 'Startup took too long and appears stalled. You can retry 3D mode or switch to compatibility mode.'
      });
    }
  }, 20000);

  function setState(state, opts = {}) {
    currentState = state;
    overlay.dataset.state = state;
    statusText.textContent = opts.message || STATE_LABELS[state] || 'Initializing…';
    details.textContent = opts.detail || '';

    if (state === BOOT_STATES.ready && !opts.keepVisible) {
      clearTimeout(stallTimer);
      overlay.classList.add('boot-overlay--hidden');
      setTimeout(() => overlay.remove(), 280);
      return;
    }

    if (state === BOOT_STATES.compatibility_mode || state === BOOT_STATES.boot_error) {
      actions.innerHTML = '';
      actions.append(
        createActionButton('Compatibility Mode', 'primary', onCompatibilityMode),
        createActionButton('Retry 3D Mode', 'secondary', onRetry3D)
      );
      return;
    }

    actions.innerHTML = '';
  }

  function destroy() {
    clearTimeout(stallTimer);
    overlay.remove();
  }

  return { setState, destroy, states: BOOT_STATES };
}

function createActionButton(label, variant, onClick) {
  const button = document.createElement('button');
  button.className = `boot-btn boot-btn--${variant}`;
  button.textContent = label;
  button.type = 'button';
  button.addEventListener('click', () => onClick?.());
  return button;
}

function ensureBootStyles() {
  if (document.getElementById('bootFlowStyles')) {
    return;
  }

  const style = document.createElement('style');
  style.id = 'bootFlowStyles';
  style.textContent = `
    .boot-overlay {
      position: fixed;
      inset: 0;
      z-index: 12000;
      display: grid;
      place-items: center;
      background: radial-gradient(circle at 30% 20%, #123049 0%, #06080d 55%, #020305 100%);
      color: #f8fafc;
      transition: opacity .25s ease;
      padding: 24px;
    }
    .boot-overlay--hidden { opacity: 0; pointer-events: none; }
    .boot-panel {
      width: min(560px, 100%);
      border: 1px solid rgba(255,255,255,.14);
      border-radius: 18px;
      background: rgba(8, 13, 22, .88);
      box-shadow: 0 24px 80px rgba(0,0,0,.45);
      padding: 28px;
      backdrop-filter: blur(14px);
    }
    .boot-badge {
      display: inline-block;
      font-size: 11px;
      letter-spacing: .22em;
      text-transform: uppercase;
      color: #5de2ff;
      margin-bottom: 14px;
    }
    .boot-panel h1 { font-size: 30px; margin: 0 0 10px; }
    .boot-panel p { margin: 0; color: #dbeafe; font-size: 15px; }
    .boot-details {
      margin-top: 12px;
      min-height: 42px;
      padding: 10px 12px;
      border-radius: 10px;
      font-size: 13px;
      color: #94a3b8;
      background: rgba(255,255,255,.03);
      border: 1px solid rgba(255,255,255,.08);
      white-space: pre-wrap;
    }
    .boot-actions {
      margin-top: 16px;
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
    }
    .boot-btn {
      border: 0;
      border-radius: 10px;
      padding: 10px 14px;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
    }
    .boot-btn--primary { background: #22d3ee; color: #082f49; }
    .boot-btn--secondary { background: #1e293b; color: #f8fafc; border: 1px solid rgba(255,255,255,.2); }
  `;

  document.head.appendChild(style);
}

export { BOOT_STATES };
