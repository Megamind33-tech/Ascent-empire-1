/**
 * gazetteCareerUI.js — Gazette & Career Portal Overlay Controllers
 * =================================================================
 * Opens/populates the two HTML overlays injected by the user:
 *   - #gazetteOverlay  → National Gazette (enacted laws, modifiers, timeline)
 *   - #careerPortal    → Political Career dashboard (office progress, next target)
 *
 * Both overlays are already present in index.html; this module purely fills
 * them with live data from state and wires close buttons.
 *
 * Usage:
 *   import { openGazette, openCareerPortal, initOverlayClosers } from './gazetteCareerUI.js';
 */

import { CONFIG } from '../config.js';
import { playUIClick } from '../systems/audioSystem.js';

// ── Generic overlay toggler ─────────────────────────────────── //
function showOverlay(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.style.display = 'flex';
  el.classList.remove('overlay-exit');
  el.classList.add('overlay-enter');
}

function hideOverlay(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove('overlay-enter');
  el.classList.add('overlay-exit');
  setTimeout(() => { if (el) el.style.display = 'none'; }, 300);
}

/** Wire all close buttons (.close-overlay[data-overlay="<id>"]) */
export function initOverlayClosers() {
  document.querySelectorAll('.close-overlay').forEach(btn => {
    btn.addEventListener('click', () => {
      playUIClick();
      const target = btn.dataset.overlay;
      if (target) hideOverlay(target);
    });
  });

  // Also close on backdrop click
  ['gazetteOverlay', 'careerPortal'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('click', (e) => {
      if (e.target === el) { playUIClick(); hideOverlay(id); }
    });
  });
}

// ── National Gazette ─────────────────────────────────────────── //
/**
 * Populate and open the gazette overlay.
 * Shows: enacted laws, active law modifiers, current offices snapshot.
 */
export function openGazette(state) {
  const container = document.getElementById('gazetteLaws');
  if (!container) return;

  const enacted = state.enactedLaws || [];
  const allLaws = CONFIG.laws || [];

  if (enacted.length === 0) {
    container.innerHTML = `
      <p class="gazette-empty">No legislation has been enacted yet.<br>
      Use <em>Legislation</em> to pass national bills.</p>`;
  } else {
    const now = Date.now();
    container.innerHTML = enacted.map(entry => {
      const law = allLaws.find(l => l.id === entry.id);
      if (!law) return '';
      
      let timeLabel = '';
      if (entry.expiresAt) {
        const remaining = Math.max(0, Math.floor((entry.expiresAt - now) / 1000));
        timeLabel = `<div class="gazette-law-timer">⏳ Expires in: ${remaining}s</div>`;
      }

      const fx = Object.entries(law.effects)
        .map(([k, v]) => `<span class="law-effect ${v > 0 ? 'pos' : 'neg'}">${k}: ${v > 0 ? '+' : ''}${v}</span>`)
        .join(' ');

      return `
        <div class="gazette-entry">
          <div class="gazette-law-title">${law.title}</div>
          <div class="gazette-law-desc">${law.desc}</div>
          ${timeLabel}
          <div class="gazette-effects">${fx}</div>
        </div>`;
    }).join('');
  }

  // Modifier summary bar
  const mods = state.activeModifiers;
  const modSummary = `
    <div class="gazette-modifiers">
      <h3>Active Economic Modifiers</h3>
      <div class="modifier-pills">
        <span class="mpill ${mods.cashDelta >= 0 ? 'pos' : 'neg'}">Cash/s: ${mods.cashDelta >= 0 ? '+' : ''}${mods.cashDelta.toFixed(1)}</span>
        <span class="mpill ${mods.approvalDelta >= 0 ? 'pos' : 'neg'}">Approval/s: ${mods.approvalDelta >= 0 ? '+' : ''}${mods.approvalDelta.toFixed(2)}</span>
        <span class="mpill ${mods.legitimacyDelta >= 0 ? 'pos' : 'neg'}">Legit/s: ${mods.legitimacyDelta >= 0 ? '+' : ''}${mods.legitimacyDelta.toFixed(2)}</span>
        <span class="mpill ${mods.securityDelta >= 0 ? 'pos' : 'neg'}">Security/s: ${mods.securityDelta >= 0 ? '+' : ''}${mods.securityDelta.toFixed(2)}</span>
      </div>
    </div>`;

  container.insertAdjacentHTML('beforeend', modSummary);
  showOverlay('gazetteOverlay');
}

// ── Career Portal ─────────────────────────────────────────────── //
/**
 * Populate and open the career portal overlay.
 * Shows: office timeline with progress bars, qualifications for next office.
 */
export function openCareerPortal(state) {
  const container = document.getElementById('careerDetails');
  if (!container) return;

  const offices = CONFIG.politics.offices;
  const standards = CONFIG.careerStandards;
  const currentIdx = state.officeIndex;

  // Office progress timeline
  const timeline = offices.map((office, i) => {
    const isReached  = i <= currentIdx;
    const isCurrent  = i === currentIdx;
    const isNext     = i === currentIdx + 1;
    const std        = standards[i - 1]; // standards[0] = path to index 1
    const statusCls  = isReached ? 'reached' : (isNext ? 'next' : 'locked');
    const badge      = isCurrent ? '★ Current' : (isReached ? '✓' : (isNext ? 'Next' : '🔒'));

    let reqHtml = '';
    if (isNext && std) {
      const legitOk = state.legitimacy >= std.reqLegitimacy;
      const inflOk  = state.influence  >= std.reqInfluence;
      const cashOk  = state.cash       >= std.campaignCost;
      reqHtml = `
        <div class="career-reqs">
          <span class="${legitOk ? 'req-ok' : 'req-fail'}">Legitimacy: ${Math.floor(state.legitimacy)}/${std.reqLegitimacy}</span>
          <span class="${inflOk  ? 'req-ok' : 'req-fail'}">Influence: ${Math.floor(state.influence)}/${std.reqInfluence}</span>
          <span class="${cashOk  ? 'req-ok' : 'req-fail'}">Campaign: $${Math.floor(state.cash).toLocaleString()}/$${std.campaignCost.toLocaleString()}</span>
        </div>`;
    }

    return `
      <div class="career-step ${statusCls}">
        <div class="step-marker ${statusCls}"><span>${badge}</span></div>
        <div class="step-info">
          <div class="step-title">${office}</div>
          ${isNext && std ? `<div class="step-msg">${std.unlockMessage}</div>` : ''}
          ${reqHtml}
        </div>
      </div>`;
  }).join('');

  // Nation travel summary
  const visitedCount = state.nations.filter(n => n.visits > 0).length;
  const travelHtml = `
    <div class="career-travel-bar">
      🌍 Nations visited: <strong>${visitedCount}/${state.nations.length}</strong> 
      &nbsp;|&nbsp; Passport: <strong>${state.passportLevel}</strong>
      &nbsp;|&nbsp; Diplomatic Access: <strong>${Math.floor(state.diplomaticAccess)}</strong>
    </div>`;

  container.innerHTML = `
    <div class="career-timeline">${timeline}</div>
    ${travelHtml}`;

  showOverlay('careerPortal');
}
