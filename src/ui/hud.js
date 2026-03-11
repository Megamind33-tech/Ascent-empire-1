import { CONFIG } from '../config.js';
import { initAudio, resumeAudio, playUIClick, playStatUp, playApprovalDrop, playConstruction } from '../systems/audioSystem.js';

function el(id){ return document.getElementById(id); }

// Track previous values to detect changes and trigger chimes
const _prev = { cash: 0, approval: 50, influence: 0, population: 1000 };

/** Flash a stat element to give visual feedback that a value changed */
function flashStat(element, direction) {
  element.classList.remove('stat-flash-up', 'stat-flash-down');
  // Force reflow so the animation restarts
  void element.offsetWidth;
  element.classList.add(direction === 'up' ? 'stat-flash-up' : 'stat-flash-down');
  setTimeout(() => element.classList.remove('stat-flash-up', 'stat-flash-down'), 700);
}

/** Show selection mode indicator on the active build button */
function _updateActiveBtn(state) {
  document.querySelectorAll('.action-btn').forEach(btn => {
    const action = btn.dataset.action;
    // Map button actions to selectionMode keys
    const modeKey = action?.startsWith('build') ? action.replace('build','').toLowerCase() : null;
    const isActive = state.selectionMode && modeKey && state.selectionMode === modeKey;
    btn.classList.toggle('active-build', !!isActive);
  });
}

export function initHUD(state, actionHandler, cameraHandler) {
  // Init audio on first user interaction (required by browser autoplay policy)
  const firstInteraction = () => {
    initAudio();
    resumeAudio();
    document.removeEventListener('touchstart', firstInteraction);
    document.removeEventListener('pointerdown', firstInteraction);
  };
  document.addEventListener('touchstart', firstInteraction, { once: true, passive: true });
  document.addEventListener('pointerdown', firstInteraction, { once: true });

  document.querySelectorAll('.action-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      playUIClick();
      actionHandler(btn.dataset.action);
      _updateActiveBtn(state);
    });
  });

  // Mobile camera controls
  el('rotateLeftBtn').addEventListener('click',  () => { playUIClick(); cameraHandler('left');    });
  el('rotateRightBtn').addEventListener('click', () => { playUIClick(); cameraHandler('right');   });
  el('zoomInBtn').addEventListener('click',      () => { playUIClick(); cameraHandler('zoomIn');  });
  el('zoomOutBtn').addEventListener('click',     () => { playUIClick(); cameraHandler('zoomOut'); });

  // Mute toggle button (injected into mobile-controls)
  const muteBtn = document.getElementById('muteBtn');
  if (muteBtn) {
    muteBtn.addEventListener('click', () => {
      import('../systems/audioSystem.js').then(({ setMuted, isMuted }) => {
        const nowMuted = !isMuted();
        setMuted(nowMuted);
        muteBtn.textContent = nowMuted ? '🔇' : '🔊';
        muteBtn.title = nowMuted ? 'Unmute' : 'Mute';
      });
    });
  }

  updateHUD(state);
}

export function updateHUD(state) {
  const cashEl       = el('cashValue');
  const approvalEl   = el('approvalValue');
  const influenceEl  = el('influenceValue');
  const popEl        = el('populationValue');

  // ── Cash ──
  const newCash = Math.floor(state.cash);
  if (cashEl) {
    if (newCash > _prev.cash) { flashStat(cashEl, 'up'); }
    else if (newCash < _prev.cash) { flashStat(cashEl, 'down'); }
    cashEl.textContent = `$${newCash.toLocaleString()}`;
    _prev.cash = newCash;
  }

  // ── Approval (sounds) ──
  const newApproval = Math.round(state.approval);
  if (approvalEl) {
    if (newApproval > _prev.approval + 1) { flashStat(approvalEl, 'up'); playStatUp(); }
    else if (newApproval < _prev.approval - 1) { flashStat(approvalEl, 'down'); playApprovalDrop(); }
    approvalEl.textContent = `${newApproval}`;
    _prev.approval = newApproval;
  }

  // ── Influence ──
  const newInfl = Math.round(state.influence);
  if (influenceEl) {
    if (newInfl > _prev.influence) flashStat(influenceEl, 'up');
    influenceEl.textContent = `${newInfl}`;
    _prev.influence = newInfl;
  }

  // ── Population ──
  const newPop = Math.round(state.population);
  if (popEl) {
    if (newPop > _prev.population + 50) flashStat(popEl, 'up');
    popEl.textContent = `${newPop}`;
    _prev.population = newPop;
  }

  // ── Non-animated stats ──
  const officeEl = el('officeValue');
  if (officeEl) officeEl.textContent = CONFIG.politics.offices[state.officeIndex];

  const foodEl = el('foodValue');
  if (foodEl) foodEl.textContent = `${Math.round(state.food)}`;

  const steelEl = el('steelValue');
  if (steelEl) steelEl.textContent = `${Math.round(state.steel)}`;

  const fuelEl = el('fuelValue');
  if (fuelEl) fuelEl.textContent = `${Math.round(state.fuel)}`;

  const researchEl = el('researchValue');
  if (researchEl) researchEl.textContent = `${Math.round(state.research)}`;

  const nationEl = el('nationValue');
  if (nationEl) nationEl.textContent = state.nations[state.currentNationIndex].name;

  const passportEl = el('passportValue');
  if (passportEl) passportEl.textContent = state.passportLevel;

  const electionEl = el('electionTimerValue');
  if (electionEl) {
    if (state.gameStatus !== 'playing') {
       electionEl.textContent = state.gameStatus.toUpperCase();
    } else {
       const m = Math.floor(state.electionTimer / 60);
       const s = Math.floor(state.electionTimer % 60);
       electionEl.textContent = `${m}:${s.toString().padStart(2, '0')}`;
    }
  }

  // ── Fire Alert Button ──
  const extinguishBtn = document.querySelector('.action-btn--danger');
  if (extinguishBtn) {
    const hasFire = state.worldRefs?.worldMeshes?.some(m => m?.metadata?.onFire);
    extinguishBtn.classList.toggle('fire-active', !!hasFire);
  }
}

export function setMessage(text) {
  const box = el('messageBox');
  if (!box) return;
  // Slide-in animation: briefly pull out then in
  box.classList.remove('msg-enter');
  void box.offsetWidth; // reflow
  box.textContent = text;
  box.classList.add('msg-enter');
  setTimeout(() => box.classList.remove('msg-enter'), 600);
}

/** Called from main.js after construction so audio fires in HUD layer */
export { playConstruction };