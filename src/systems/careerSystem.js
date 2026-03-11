/**
 * careerSystem.js — Political Ambition & Legislation
 * ==================================================
 * Handles:
 *  1. Qualication checks for rising through ranks.
 *  2. Legislative process (Enacting Laws from CONFIG).
 *  3. Continuous effect application of laws.
 */

import { emit } from './eventBus.js';
import { CONFIG } from '../config.js';
import { setMessage } from '../ui/hud.js';
import { openDecision } from '../ui/decisionModal.js';
import { playStatUp, playApprovalDrop } from './audioSystem.js';

export function updateCareer(state, dt) {
  _checkCareerMilestones(state);
  _applyLawModifiers(state, dt);
  _checkLawExpirations(state, dt);
}

/** 
 * Scans for next career step. If player meets "Minimum Qualifications",
 * trigger a decision to 'Run for Office'.
 */
function _checkCareerMilestones(state) {
  const currentOffice = CONFIG.politics.offices[state.officeIndex];
  const nextStageIdx = state.officeIndex + 1;
  const standard = CONFIG.careerStandards[state.officeIndex]; // Councilor is index 0 in careerStandards

  if (!standard || state.officeIndex >= CONFIG.politics.offices.length - 1) return;

  // Qualification Checks: legitimacy, influence, and cash for campaign
  const qualified = state.legitimacy >= standard.reqLegitimacy && 
                   state.influence >= standard.reqInfluence &&
                   state.cash >= standard.campaignCost;

  if (qualified && state.nextOfficeGoal !== standard.title) {
    state.nextOfficeGoal = standard.title;
    
    // Trigger "Run for Office" Decision
    openDecision(state, {
      title: `ELECTION: ${standard.title.toUpperCase()}`,
      description: `${standard.unlockMessage} Campaigning will cost $${standard.campaignCost.toLocaleString()} but will elevate your status.`,
      options: [
        {
          label: `Launch Campaign`,
          consequenceText: `Costs $${standard.campaignCost.toLocaleString()}. High chance of victory based on legitimacy.`,
          action: (gs) => {
            if (gs.cash >= standard.campaignCost) {
              gs.cash -= standard.campaignCost;
              // Randomized victory chance based on legitimacy
              const winProb = 0.4 + (gs.legitimacy / 180);
              if (Math.random() < winProb) {
                gs.officeIndex++;
                setMessage(`🎉 VICTORY! You are the new ${standard.title}. Influencing power grows.`);
                gs.influence += 25;
                playStatUp();
                emit('ELECTION_WON', { office: standard.title });
              } else {
                setMessage(`📉 ELECTION LOSS. Your ${standard.title} campaign failed. Try building more legitimacy.`);
                gs.approval -= 15;
                playApprovalDrop();
              }
              gs.nextOfficeGoal = null; // Clear to allow re-check or next step
            }
          }
        },
        {
          label: "Delay Campaign",
          consequenceText: "Stay in your current position and build more resources first.",
          action: (gs) => {
            gs.nextOfficeGoal = "DELAYED"; 
            setTimeout(() => gs.nextOfficeGoal = null, 45000); // Re-trigger after 45s
          }
        }
      ]
    });
  }
}

/** 
 * Acts on legislation. Player can enact laws which have immediate and ongoing effects.
 */
export function enactLaw(state, lawId) {
  const law = CONFIG.laws.find(l => l.id === lawId);
  const isEnacted = state.enactedLaws.some(entry => entry.id === lawId);
  if (!law || isEnacted) return;

  if (state.cash < law.cost) {
    setMessage(`🚫 INSIDE CAPITAL: Not enough funds ($${law.cost.toLocaleString()}) to enact this act.`);
    return;
  }

  // --- RIVAL INTERFERENCE CHECK ---
  // High aggression/paranoia rivals might attempt to block the act
  const aggressiveRival = state.rivals.find(r => r.traits.aggression > 0.7 && r.relationships.player < 0);
  if (aggressiveRival && Math.random() < 0.4) {
    openDecision(state, {
      title: 'PARLIAMENTARY BLOCK',
      description: `${aggressiveRival.name} is leading a coalition to block the "${law.title}". They claim it is unconstitutional.`,
      options: [
        {
          label: `Lobby Members (Cost: 20 Influence)`,
          consequenceText: "Use your political capital to push the bill through anyway.",
          action: (gs) => {
            if (gs.influence >= 20) {
              gs.influence -= 20;
              _finalizeLaw(gs, law);
            } else {
              setMessage("❌ NOT ENOUGH INFLUENCE: The block holds. The bill is dead for now.");
            }
          }
        },
        {
          label: `Financial Pressure (Cost: $${Math.floor(law.cost * 0.5).toLocaleString()})`,
          consequenceText: "Bribe committee members to switch sides.",
          action: (gs) => {
            const bribe = Math.floor(law.cost * 0.5);
            if (gs.cash >= bribe) {
              gs.cash -= bribe;
              _finalizeLaw(gs, law);
            } else {
              setMessage("❌ NOT ENOUGH CASH: The bribe failed. Bill blocked.");
            }
          }
        },
        {
          label: "Withdraw Act",
          consequenceText: "Retreat to avoid a public scandal. No cost.",
          action: (gs) => {
            setMessage(`📉 LEGISLATIVE RETREAT: "${law.title}" withdrawn from the floor.`);
            gs.influence += 2; // Slight gain for "playing safe"
          }
        }
      ]
    });
    return;
  }

  _finalizeLaw(state, law);
}

function _finalizeLaw(state, law) {
  if (state.cash < law.cost) return; // Re-check after lobby
  state.cash -= law.cost;
  
  const entry = {
    id: law.id,
    timestamp: Date.now(),
    expiresAt: law.duration ? Date.now() + law.duration * 1000 : null
  };
  state.enactedLaws.push(entry);

  _applyImmediateEffects(state, law);

  setMessage(`📜 LAW ENACTED: ${law.title}. The nation transforms.`);
  playStatUp();
  emit('LAW_PASSED', { lawId: law.id });
}

function _applyImmediateEffects(state, law) {
  if (law.effects.security)   state.security   += law.effects.security;
  if (law.effects.approval)   state.approval   += law.effects.approval;
  if (law.effects.legitimacy) state.legitimacy += law.effects.legitimacy;
  if (law.effects.corruption) state.corruption += law.effects.corruption;
  if (law.effects.steel)      state.steel      += law.effects.steel;

  // Add to active modifiers
  if (law.effects.cashDelta)       state.activeModifiers.cashDelta       += law.effects.cashDelta;
  if (law.effects.approvalDelta)   state.activeModifiers.approvalDelta   += law.effects.approvalDelta;
  if (law.effects.legitimacyDelta) state.activeModifiers.legitimacyDelta += law.effects.legitimacyDelta;
  if (law.effects.securityDelta)   state.activeModifiers.securityDelta   += law.effects.securityDelta;
}

function _checkLawExpirations(state, dt) {
  const now = Date.now();
  for (let i = state.enactedLaws.length - 1; i >= 0; i--) {
    const entry = state.enactedLaws[i];
    if (entry.expiresAt && now >= entry.expiresAt) {
      const law = CONFIG.laws.find(l => l.id === entry.id);
      if (law) {
        // Reverse ongoing modifiers
        if (law.effects.cashDelta)       state.activeModifiers.cashDelta       -= law.effects.cashDelta;
        if (law.effects.approvalDelta)   state.activeModifiers.approvalDelta   -= law.effects.approvalDelta;
        if (law.effects.legitimacyDelta) state.activeModifiers.legitimacyDelta -= law.effects.legitimacyDelta;
        if (law.effects.securityDelta)   state.activeModifiers.securityDelta   -= law.effects.securityDelta;
        
        setMessage(`⏳ LAW EXPIRED: ${law.title}. Policy reversal in progress.`);
      }
      state.enactedLaws.splice(i, 1);
    }
  }
}


function _applyLawModifiers(state, dt) {
  // Continuous effects from enacted laws
  state.cash       += state.activeModifiers.cashDelta       * dt;
  state.approval   += state.activeModifiers.approvalDelta   * dt;
  state.legitimacy += state.activeModifiers.legitimacyDelta * dt;
  state.security   += state.activeModifiers.securityDelta   * dt;
}
