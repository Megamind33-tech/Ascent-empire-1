import { CONFIG } from '../config.js';
import { initAudio, resumeAudio, playUIClick, playStatUp, playApprovalDrop, playConstruction } from '../systems/audioSystem.js';
import { openEconomicLedger } from './EconomicLedger.js';

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

function _updateActiveBtn(state) {
  document.querySelectorAll('.action-btn').forEach(btn => {
    const action = btn.dataset.action;
    // Map button actions to selectionMode keys
    const modeKey = action?.startsWith('build') ? action.replace('build','').toLowerCase() : null;
    const isActive = state.selectionMode && modeKey && state.selectionMode === modeKey;
    btn.classList.toggle('active-build', !!isActive);
  });
}

// Export a test hook for debug purposes
export function triggerDebugEvent(state) {
    import('../systems/eventSystem.js').then(({ forceTriggerEvent }) => {
        forceTriggerEvent(state, "WORKER_STRIKE");
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
    btn.addEventListener('click', (e) => {
      // Career progression lock check
      if (btn.hasAttribute('data-min-office')) {
        const minOffice = parseInt(btn.getAttribute('data-min-office'), 10);
        if (state.officeIndex < minOffice) {
          import('../systems/audioSystem.js').then(({ playApprovalDrop }) => playApprovalDrop());
          setMessage(`🔒 ACCESS DENIED: Requires ${CONFIG.politics.offices[minOffice]} or higher.`);
          
          // Revert active visual state if html onclick="setNav(this)" fired
          document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
          return;
        }
      }

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

  // Financial Ledger Trigger
  const cashEl = el('cashValue');
  if (cashEl) {
    cashEl.style.cursor = 'pointer';
    cashEl.title = 'Click for Economic Ledger';
    cashEl.parentElement.addEventListener('click', () => {
      playUIClick();
      openEconomicLedger(state);
    });
  }

  const tickerContent = el('ticker-content');
  if (tickerContent) {
      import('../systems/eventBus.js').then(({ on }) => {
          on('SOCIAL_EVENT', (e) => addNewsHeadline(`SOCIAL UNREST: Incident "${e.id}" recorded in central districts...`));
          on('ECONOMIC_EVENT', (e) => addNewsHeadline(`ECONOMY: Market shock reported. Impact code "${e.id}"...`));
          on('FACTION_OFFER', (e) => addNewsHeadline(`RUMOR: Subversive elements "The ${e.faction}" making aggressive plays...`));
          on('SCANDAL', (e) => addNewsHeadline(`SCANDAL: Government leaks suggest corruption severity at ${Math.round(e.severity * 100)}%...`));
          on('NEW_LAW', (e) => addNewsHeadline(`LEGISLATION: The Sovereign has enacted a new mandate...`));
      });
  }

  updateHUD(state);
}

function addNewsHeadline(text) {
    const tickerContent = document.getElementById('ticker-content');
    if (!tickerContent) return;

    const span = document.createElement('span');
    span.className = 'ticker-item';
    span.textContent = text;
    tickerContent.appendChild(span);

    // Keep memory bounded
    if (tickerContent.children.length > 10) {
        tickerContent.removeChild(tickerContent.firstChild);
    }
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

  const dominanceEl = el('dominanceValue');
  if (dominanceEl) dominanceEl.textContent = `${Math.round(state.worldDominance)}%`;

  // ⚔️ Conflict Stats
  const rebelEl = el('rebelValue');
  if (rebelEl) {
    rebelEl.textContent = `${Math.round(state.rebelStrength)}%`;
    el('rebel-box').style.display = state.rebelStrength > 10 ? 'flex' : 'none';
  }

  const loyaltyEl = el('loyaltyValue');
  if (loyaltyEl) {
    loyaltyEl.textContent = `${Math.round(state.militaryLoyalty)}%`;
    el('loyalty-box').style.display = (state.officeIndex >= 3 || state.buildings.barracks > 0) ? 'flex' : 'none';
  }

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

  // ── Career Locks ──
  document.querySelectorAll('.nav-btn[data-min-office], .item-card[data-min-office]').forEach(btn => {
    const minOffice = parseInt(btn.getAttribute('data-min-office'), 10);
    btn.classList.toggle('locked', state.officeIndex < minOffice);
  });

  // ── Dynamic Navigation Labels ──
  const councilBtn = document.querySelector('.nav-btn[data-action="legislation"] span');
  if (councilBtn) {
    if (state.officeIndex >= 5) councilBtn.textContent = 'Decrees';
    else if (state.officeIndex >= 3) councilBtn.textContent = 'Cabinet';
    else councilBtn.textContent = 'Council';
  }

  // ── Regime Styling ──
  document.body.classList.toggle('empire-mode', state.regimeType === 'Empire');
}

export function setMessage(text) {
  const box = document.getElementById('toast-box');
  if (!box) return;
  
  const el = document.createElement('div');
  el.className = 'toast';
  // Use a reliable icon and format as per new UI
  el.innerHTML = `<i class="fas fa-terminal" style="color:var(--terminal-cyan); margin-right:15px;"></i> ${text}`;
  
  box.appendChild(el);
  
  setTimeout(() => { 
    el.style.transition = 'opacity 0.4s ease';
    el.style.opacity = '0'; 
    setTimeout(() => el.remove(), 400); 
  }, 3000);
}

export function triggerVictoryOverlay(state) {
  const overlay = document.createElement('div');
  overlay.className = 'victory-flash';
  overlay.innerHTML = `
    <div class="v-content">
      <i class="fas fa-crown"></i>
      <h1>ELECTION VICTORY</h1>
      <p>The standard of ${state.nations[state.currentNationIndex].name} is raised.</p>
    </div>
  `;
  document.body.appendChild(overlay);
  setTimeout(() => {
    overlay.classList.add('fade-out');
    setTimeout(() => overlay.remove(), 1000);
  }, 3000);
}

/** Called from main.js after construction so audio fires in HUD layer */
export { playConstruction };