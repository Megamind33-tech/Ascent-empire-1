/**
 * politicalSystem.js — Civic simulation feeding the event bus.
 * Runs every frame (dt-based). Emits events that NPCs react to independently.
 */

import { emit } from './eventBus.js';
import { setMessage } from '../ui/hud.js';

export function runPoliticalTick(state, dt) {
  const { buildings, factions } = state;

  // ── Base stat deltas ────────────────────────────────────────────────────────
  const policing       = buildings.police      * 0.22;
  const antiCorruption = buildings.acc         * 0.35;
  const antiDrug       = buildings.dec         * 0.26;
  const schoolEffect   = buildings.schools     * 0.12;
  const storeEffect    = buildings.stores      * 0.015;
  const stadiumBoost   = buildings.stadiums    * 0.02;

  state.security  += (policing + antiDrug * 0.4 - 0.05) * dt;
  state.education += schoolEffect * dt;
  state.corruption += (
    factions.cartelPressure * 0.012 +
    factions.mafiaPressure  * 0.014 -
    antiCorruption          * 0.07
  ) * dt;

  // Apply active sabotage debuffs to contributing buildings
  if (state.sabotage) {
    if (state.sabotage.school)  state.education -= 0.06 * dt;
    if (state.sabotage.police)  state.security   -= 0.08 * dt;
    if (state.sabotage.barracks) state.security   -= 0.05 * dt;
  }

  state.legitimacy += (
    schoolEffect   * 0.08 +
    antiCorruption * 0.10 +
    storeEffect          +
    stadiumBoost         -
    state.corruption * 0.004 +
    state.activeModifiers.legitimacyDelta
  ) * dt;

  // Apply other continuous political modifiers
  state.security += state.activeModifiers.securityDelta * dt;
  state.approval += state.activeModifiers.approvalDelta * dt;

  // ── Rebel Insurgency Logic ──
  // Strength grows when Legitimacy and Approval are low
  const dissatisfaction = (100 - state.approval) + (100 - state.legitimacy);
  const rebelGrowth = dissatisfaction > 120 ? (dissatisfaction - 120) * 0.005 : -0.05;
  state.rebelStrength = Math.max(0, Math.min(100, state.rebelStrength + rebelGrowth * dt));

  // Active Sabotage: Rebels ignite random buildings if strong enough
  if (state.rebelStrength > 40 && Math.random() < (state.rebelStrength / 10000) * dt * 60) {
    const targets = state.worldRefs?.worldMeshes?.filter(m => m?.metadata?.type && !m.metadata.onFire);
    if (targets && targets.length > 0) {
      const victim = targets[Math.floor(Math.random() * targets.length)];
      import('../systems/physicsInteractionSystem.js').then(({ igniteMesh }) => igniteMesh(victim));
      setMessage("⚠️ SABOTAGE: Rebel insurgents have set fire to a local building!");
    }
  }

  // ── Ministerial Focus permanent bonuses ──
  if (state.ministerialFocus === 'Security') {
    state.security += 0.05 * dt; // Passive security growth
  } else if (state.ministerialFocus === 'Social') {
    state.approval += 0.02 * dt; // Passive approval growth
  }

  // ── Event Emissions (threshold-based, not random spam) ─────────────────────

  // Corruption scandal (probabilistic, severity-weighted)
  if (state.corruption > 30 && Math.random() < 0.0012 * dt * 60) {
    state.approval  -= 4;
    state.influence -= 2;
    emit('SCANDAL', { sourceRival: null, severity: state.corruption / 100 });
    setMessage('📰 A corruption scandal has surfaced. Your administration is under scrutiny.');
  }

  // Security failure
  if (state.security < 10 && Math.random() < 0.0012 * dt * 60) {
    state.approval -= 3;
    emit('PROTEST', { district: 'industrial-belt', size: 'small' });
    setMessage('⚡ Violence escalates in a neglected district.');
  }

  // Passport threshold triggers (delegate to economySystem, just emit)
  // These are monitored by economySystem.js already — no duplicate logic here.

  // Hidden objective reveal (if player has enough intelligence infrastructure)
  const intel = buildings.acc + buildings.dec;
  for (const rival of state.rivals) {
    if (!rival.hiddenObjective.revealed && intel >= 3) {
      rival.hiddenObjective.revealed = true;
      setMessage(`🔍 Intelligence reports: ${rival.name}'s real goal is to ${rival.hiddenObjective.type.replace(/_/g,' ')} (${rival.hiddenObjective.target}).`);
    }
  }

  // ── Clamp all stats ─────────────────────────────────────────────────────────
  state.legitimacy  = clamp(state.legitimacy,  0, 100);
  state.corruption  = clamp(state.corruption,  0, 100);
  state.security    = clamp(state.security,    0, 100);
  state.education   = clamp(state.education,   0, 100);
  state.approval    = clamp(state.approval,    0, 100);
}

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }