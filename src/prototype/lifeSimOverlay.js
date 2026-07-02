// DOM UI overlay for the political life-sim, layered over the 2D canvas city.
// It renders the career HUD, daily-action bar, faction/relationship/nation
// panels, investment menu, and the event / election / endgame modals.
//
// The overlay is intentionally the interactive layer (real clickable buttons)
// while the canvas underneath renders the living isometric city.

import { RANKS, FACTIONS, INVESTMENTS } from './politicalLifeSim.js';

const STYLE_ID = 'ls-overlay-style';

const CSS = `
#ls-root { position: fixed; inset: 0; z-index: 50; pointer-events: none;
  font-family: Inter, system-ui, sans-serif; color: #eaf2fb; }
#ls-root .ls-panel { pointer-events: auto; background: rgba(9,14,22,0.82);
  border: 1px solid rgba(120,150,190,0.25); border-radius: 12px;
  box-shadow: 0 8px 30px rgba(0,0,0,0.45); backdrop-filter: blur(4px); }
#ls-hud { position: absolute; top: 16px; left: 16px; width: 320px; padding: 14px 16px; }
#ls-hud .ls-name { font-size: 13px; color: #9fb6cf; letter-spacing: .04em; }
#ls-hud .ls-title { font-size: 20px; font-weight: 700; margin: 2px 0 2px; }
#ls-hud .ls-sub { font-size: 12px; color: #b9c8da; margin-bottom: 10px; }
.ls-bar { margin: 6px 0; }
.ls-bar .ls-bar-label { display: flex; justify-content: space-between;
  font-size: 11px; color: #c6d3e2; margin-bottom: 3px; }
.ls-bar .ls-bar-track { height: 8px; border-radius: 6px; background: rgba(255,255,255,0.08); overflow: hidden; }
.ls-bar .ls-bar-fill { height: 100%; border-radius: 6px; transition: width .25s ease; }
#ls-actions { position: absolute; left: 16px; bottom: 16px; width: 340px; padding: 12px 14px; }
#ls-actions h3, #ls-side h3 { margin: 0 0 8px; font-size: 12px; text-transform: uppercase;
  letter-spacing: .08em; color: #8fd8ff; }
.ls-actions-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
.ls-btn { pointer-events: auto; cursor: pointer; border: 1px solid rgba(120,160,210,0.3);
  background: rgba(30,44,64,0.9); color: #eaf2fb; border-radius: 8px; padding: 8px 10px;
  font-size: 12px; text-align: left; transition: background .15s, transform .05s; }
.ls-btn:hover { background: rgba(48,70,100,0.95); }
.ls-btn:active { transform: translateY(1px); }
.ls-btn:disabled { opacity: .4; cursor: not-allowed; }
.ls-btn.ls-primary { background: linear-gradient(180deg,#2f8fe0,#1d6fc0); border-color:#4aa3ff; font-weight:600; text-align:center; }
.ls-btn.ls-danger { background: linear-gradient(180deg,#8a3bd1,#6a29b0); border-color:#a25fd1; }
.ls-hint { font-size: 11px; color: #93a6bd; margin-top: 8px; min-height: 14px; }
#ls-side { position: absolute; top: 16px; right: 16px; width: 300px; padding: 14px 16px; max-height: calc(100vh - 220px); overflow-y: auto; }
.ls-row { display: flex; justify-content: space-between; align-items: center; font-size: 12px; margin: 4px 0; gap: 8px; }
.ls-row .ls-mini-track { flex: 1; height: 6px; border-radius: 4px; background: rgba(255,255,255,0.08); overflow: hidden; }
.ls-row .ls-mini-fill { height: 100%; }
.ls-chip { font-size: 10px; padding: 1px 6px; border-radius: 999px; background: rgba(255,255,255,0.1); color:#cdd9e8; }
#ls-office { margin-top: 12px; padding-top: 10px; border-top: 1px solid rgba(120,150,190,0.2); }
#ls-office .ls-req { font-size: 11px; color: #b9c8da; margin: 6px 0; }
#ls-log { position: absolute; right: 16px; bottom: 16px; width: 300px; padding: 12px 14px; max-height: 180px; overflow: hidden; }
#ls-log .ls-log-line { font-size: 11px; color: #cfe0f0; margin: 3px 0; line-height: 1.35; }
#ls-log .ls-log-line:first-child { color: #ffe08a; }
#ls-modal { position: absolute; inset: 0; display: none; align-items: center; justify-content: center;
  background: rgba(4,8,14,0.72); pointer-events: auto; }
#ls-modal.ls-show { display: flex; }
#ls-modal .ls-card { width: 440px; max-width: 90vw; padding: 24px; text-align: center; }
#ls-modal h2 { margin: 0 0 8px; font-size: 22px; }
#ls-modal p { color: #cbd8e8; font-size: 14px; line-height: 1.5; margin: 0 0 18px; }
#ls-modal .ls-options { display: flex; flex-direction: column; gap: 8px; }
#ls-modal .ls-btn { text-align: center; padding: 12px; font-size: 14px; }
.ls-target-menu { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-top: 8px; }
`;

function ensureStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const el = document.createElement('style');
  el.id = STYLE_ID;
  el.textContent = CSS;
  document.head.appendChild(el);
}

function bar(label, value, color, max = 100) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return `<div class="ls-bar"><div class="ls-bar-label"><span>${label}</span><span>${Math.round(value)}</span></div>
    <div class="ls-bar-track"><div class="ls-bar-fill" style="width:${pct}%;background:${color}"></div></div></div>`;
}

function standingColor(v) {
  if (v > 25) return '#4bd07a';
  if (v < -25) return '#e0604b';
  return '#c7b95f';
}

export function createLifeSimOverlay(sim, hooks = {}) {
  ensureStyle();

  const root = document.createElement('div');
  root.id = 'ls-root';
  root.innerHTML = `
    <div id="ls-hud" class="ls-panel"></div>
    <div id="ls-actions" class="ls-panel"></div>
    <div id="ls-side" class="ls-panel"></div>
    <div id="ls-log" class="ls-panel"></div>
    <div id="ls-modal"><div class="ls-card ls-panel"></div></div>
  `;
  document.body.appendChild(root);

  const els = {
    hud: root.querySelector('#ls-hud'),
    actions: root.querySelector('#ls-actions'),
    side: root.querySelector('#ls-side'),
    log: root.querySelector('#ls-log'),
    modal: root.querySelector('#ls-modal'),
    modalCard: root.querySelector('#ls-modal .ls-card')
  };

  const ui = { targeting: null, hint: '', showInvest: false };

  function notify() {
    if (typeof hooks.onChange === 'function') hooks.onChange(sim);
  }

  function renderHud() {
    const p = sim.state.player;
    els.hud.innerHTML = `
      <div class="ls-name">${p.name}</div>
      <div class="ls-title">${RANKS[p.rankIndex].title}</div>
      <div class="ls-sub">Day ${p.day} · Age ${p.age} · ${sim.state.party ? factionName(sim.state.party) : 'Independent'}</div>
      <div class="ls-row"><span>Personal Funds</span><strong>$${Math.round(p.funds).toLocaleString()}</strong></div>
      ${bar('Action Points', p.energy, '#8fd8ff', p.maxEnergy)}
      ${bar('Reputation', p.reputation, '#4bd07a')}
      ${bar('Influence', p.influence, '#3fa7ff')}
      ${bar('Integrity', p.integrity, p.integrity < 40 ? '#e0604b' : '#c7b95f')}
    `;
  }

  function factionName(id) {
    const f = FACTIONS.find((x) => x.id === id);
    return f ? f.name : id;
  }

  function renderActions() {
    const outOfEnergy = sim.state.player.energy <= 0;
    let inner = '<h3>Daily Choices</h3>';

    if (!sim.state.party) {
      inner += '<div class="ls-hint">Choose a party to begin your career:</div><div class="ls-target-menu">';
      for (const f of FACTIONS.filter((x) => x.kind === 'party')) {
        inner += `<button class="ls-btn" data-act="join" data-id="${f.id}" style="border-color:${f.color}">${f.name}</button>`;
      }
      inner += '</div>';
      els.actions.innerHTML = inner;
      return;
    }

    if (ui.targeting === 'relationship') {
      inner += '<div class="ls-hint">Network with whom?</div><div class="ls-target-menu">';
      for (const r of sim.state.relationships) {
        inner += `<button class="ls-btn" data-act="action" data-id="network" data-target="${r.id}">${r.name}</button>`;
      }
      inner += '</div><div class="ls-target-menu"><button class="ls-btn" data-act="cancel-target">Cancel</button></div>';
      els.actions.innerHTML = inner;
      return;
    }

    if (ui.targeting === 'nation') {
      inner += '<div class="ls-hint">Visit which nation?</div><div class="ls-target-menu">';
      for (const n of sim.state.nations) {
        inner += `<button class="ls-btn" data-act="action" data-id="diplomacy" data-target="${n.name}">${n.name}</button>`;
      }
      inner += '</div><div class="ls-target-menu"><button class="ls-btn" data-act="cancel-target">Cancel</button></div>';
      els.actions.innerHTML = inner;
      return;
    }

    inner += '<div class="ls-actions-grid">';
    for (const a of hooks.actions) {
      const disabled = !a.endsDay && outOfEnergy;
      const target = a.needsTarget ? ` data-target-kind="${a.needsTarget}"` : '';
      inner += `<button class="ls-btn${a.id === 'deal' ? ' ls-danger' : ''}" data-act="action" data-id="${a.id}"${target}${disabled ? ' disabled' : ''}>${a.label}</button>`;
    }
    inner += '</div>';
    inner += `<div class="ls-hint">${ui.hint || (outOfEnergy ? 'Out of action points — Rest to begin the next day.' : 'Each choice spends an action point.')}</div>`;
    els.actions.innerHTML = inner;
  }

  function renderSide() {
    const s = sim.state;
    let inner = '<h3>Factions & Power</h3>';
    for (const f of FACTIONS) {
      const v = s.factions[f.id];
      const pct = (v + 100) / 2;
      inner += `<div class="ls-row"><span style="min-width:96px">${f.name}</span>
        <div class="ls-mini-track"><div class="ls-mini-fill" style="width:${pct}%;background:${standingColor(v)}"></div></div>
        <span class="ls-chip">${Math.round(v)}</span></div>`;
    }

    inner += '<h3 style="margin-top:12px">Allies & Enemies</h3>';
    for (const r of s.relationships) {
      const label = r.affinity > 25 ? 'Ally' : r.affinity < -25 ? 'Enemy' : 'Neutral';
      inner += `<div class="ls-row"><span style="min-width:96px">${r.name}</span>
        <span style="flex:1;color:#93a6bd;font-size:11px">${r.role}</span>
        <span class="ls-chip" style="color:${standingColor(r.affinity)}">${label} ${Math.round(r.affinity)}</span></div>`;
    }

    inner += '<h3 style="margin-top:12px">Neighbor Nations</h3>';
    for (const n of s.nations) {
      const pct = (n.relation + 100) / 2;
      inner += `<div class="ls-row"><span style="min-width:96px">${n.name}</span>
        <div class="ls-mini-track"><div class="ls-mini-fill" style="width:${pct}%;background:${standingColor(n.relation)}"></div></div>
        <span class="ls-chip">${Math.round(n.relation)}</span></div>`;
    }

    // Office / election.
    const nextIdx = sim.nextOffice();
    inner += '<div id="ls-office">';
    if (nextIdx != null) {
      const req = sim.officeRequirement();
      const p = s.player;
      const meets = (cur, need) => (cur >= need ? '#4bd07a' : '#e0604b');
      inner += `<h3>Next Office: ${RANKS[nextIdx].title}</h3>
        <div class="ls-req">
          <span style="color:${meets(p.reputation, req.reputation)}">Rep ${Math.round(p.reputation)}/${req.reputation}</span> ·
          <span style="color:${meets(p.influence, req.influence)}">Inf ${Math.round(p.influence)}/${req.influence}</span> ·
          <span style="color:${meets(p.funds, req.funds)}">$${Math.round(p.funds).toLocaleString()}/${req.funds.toLocaleString()}</span>
        </div>
        <button class="ls-btn ls-primary" data-act="run-office" ${sim.canRunForOffice() ? '' : 'disabled'} style="width:100%">Run for ${RANKS[nextIdx].title}</button>`;
    } else {
      inner += '<h3>Highest Office Achieved</h3>';
    }
    inner += `<button class="ls-btn" data-act="open-invest" style="width:100%;margin-top:8px">${ui.showInvest ? 'Hide' : 'Open'} Investments</button>`;
    if (ui.showInvest) {
      for (const inv of INVESTMENTS) {
        const owned = s.investments.find((i) => i.id === inv.id)?.owned;
        inner += `<div class="ls-row"><span style="flex:1">${inv.name} <span style="color:#93a6bd">($${inv.income}/day)</span></span>
          ${owned ? '<span class="ls-chip" style="color:#4bd07a">Owned</span>' : `<button class="ls-btn" data-act="invest" data-id="${inv.id}" ${s.player.funds >= inv.cost ? '' : 'disabled'}>$${inv.cost.toLocaleString()}</button>`}</div>`;
      }
    }
    inner += '</div>';
    els.side.innerHTML = inner;
  }

  function renderLog() {
    els.log.innerHTML = '<h3 style="margin:0 0 8px;font-size:12px;letter-spacing:.08em;color:#ffd37a">Chronicle</h3>' +
      sim.state.log.map((l) => `<div class="ls-log-line">• ${l}</div>`).join('');
  }

  function renderModal() {
    const s = sim.state;
    if (s.status === 'won' || s.status === 'lost') {
      els.modal.classList.add('ls-show');
      const won = s.status === 'won';
      els.modalCard.innerHTML = `
        <h2 style="color:${won ? '#4bd07a' : '#e0604b'}">${won ? 'You Became President' : 'Political Career Over'}</h2>
        <p>${won ? 'From an ordinary citizen to the highest office in the land — your ascent is complete.' : 'Bankrupt and discredited, your ambitions collapse. Every choice mattered.'}</p>
        <div class="ls-options"><button class="ls-btn ls-primary" data-act="restart">Start a New Life</button></div>`;
      return;
    }
    if (s.pendingChoice) {
      els.modal.classList.add('ls-show');
      els.modalCard.innerHTML = `
        <h2>${s.pendingChoice.title}</h2>
        <p>${s.pendingChoice.body}</p>
        <div class="ls-options">
          ${s.pendingChoice.options.map((o) => `<button class="ls-btn ls-primary" data-act="choice" data-id="${o.id}">${o.label}</button>`).join('')}
        </div>`;
      return;
    }
    els.modal.classList.remove('ls-show');
  }

  function render() {
    renderHud();
    renderActions();
    renderSide();
    renderLog();
    renderModal();
  }

  function flashElection(result) {
    if (!result) return;
    els.modal.classList.add('ls-show');
    els.modalCard.innerHTML = `
      <h2 style="color:${result.won ? '#4bd07a' : '#e0604b'}">${result.won ? 'Election Won!' : 'Election Lost'}</h2>
      <p>Race for <strong>${result.office}</strong><br/>Your score ${result.playerScore} vs opponent ${result.opponentScore}.</p>
      <div class="ls-options"><button class="ls-btn ls-primary" data-act="close-election">Continue</button></div>`;
  }

  root.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-act]');
    if (!btn) return;
    const act = btn.dataset.act;

    if (act === 'join') {
      sim.joinParty(btn.dataset.id);
    } else if (act === 'action') {
      const id = btn.dataset.id;
      const kind = btn.dataset.targetKind;
      if (kind && !btn.dataset.target) {
        ui.targeting = kind;
        render();
        return;
      }
      const out = sim.doAction(id, btn.dataset.target);
      ui.hint = out || '';
      ui.targeting = null;
    } else if (act === 'cancel-target') {
      ui.targeting = null;
    } else if (act === 'run-office') {
      const result = sim.runForOffice();
      render();
      flashElection(result);
      notify();
      return;
    } else if (act === 'close-election') {
      // fall through to re-render (also handles win state)
    } else if (act === 'open-invest') {
      ui.showInvest = !ui.showInvest;
    } else if (act === 'invest') {
      sim.buyInvestment(btn.dataset.id);
    } else if (act === 'choice') {
      sim.resolveChoice(btn.dataset.id);
    } else if (act === 'restart') {
      if (typeof hooks.onRestart === 'function') hooks.onRestart();
      return;
    }

    render();
    notify();
  });

  render();

  return {
    render,
    destroy() {
      root.remove();
    }
  };
}
