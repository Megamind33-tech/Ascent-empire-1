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
import { setMessage, triggerVictoryOverlay } from '../ui/hud.js';
import { openDecision } from '../ui/decisionModal.js';
import { playStatUp, playApprovalDrop } from './audioSystem.js';

export function updateCareer(state, dt) {
  _checkCareerMilestones(state);
  _checkMinisterialProgress(state);
  _handlePresidentialTerm(state, dt);
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
                triggerVictoryOverlay(gs);
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
 * Triggers once the player reaches MP (index 3) to choose a Cabinet Focus.
 */
function _checkMinisterialProgress(state) {
  if (state.officeIndex >= 3 && !state.hasTakenMinisterialOath) {
    state.hasTakenMinisterialOath = true;
    
    openDecision(state, {
      title: "MINISTERIAL APPOINTMENT",
      description: "As a Member of Parliament, you have been invited to lead a specialized Ministry. This will define your political legacy and grant permanent bonuses.",
      options: [
        {
          label: "Minister of Economy",
          consequenceText: "Permanent +10% Cash Flow. Unlocks advanced industrial subsidies.",
          action: (gs) => {
            gs.ministerialFocus = "Economy";
            gs.activeModifiers.cashDelta += 15; // Immediate flat boost
            setMessage("💰 APPOINTED: Minister of Economy. Wealth is the foundation of power.");
          }
        },
        {
          label: "Minister of Security",
          consequenceText: "Permanent +15 Security Base. Military units cost 20% less.",
          action: (gs) => {
            gs.ministerialFocus = "Security";
            gs.security += 15;
            setMessage("🛡️ APPOINTED: Minister of Security. Strength ensures order.");
          }
        },
        {
          label: "Minister of Social Affairs",
          consequenceText: "Permanent +0.05 Approval growth. Legitimacy easier to gain.",
          action: (gs) => {
            gs.ministerialFocus = "Social";
            gs.activeModifiers.approvalDelta += 0.05;
            setMessage("🤝 APPOINTED: Minister of Social Affairs. The people are the source of authority.");
          }
        }
      ]
    });
  }
}

/**
 * Manages re-election cycles and constitutional integrity for the Presidency.
 */
function _handlePresidentialTerm(state, dt) {
  if (state.officeIndex < 5) return; // Only for Presidents

  state.lastPresidentialElectionTime += dt;
  
  // Every 300 seconds (5 mins), a "Term Evaluation" occurs
  const termLength = 300;
  if (state.lastPresidentialElectionTime >= termLength) {
    state.lastPresidentialElectionTime = 0; // Reset timer

    if (state.constitutionalIntegrity >= 50) {
      // DEMOCRATIC PATH: Normal Re-election
      openDecision(state, {
        title: "PRESIDENTIAL RE-ELECTION",
        description: "Your first term has concluded. The nation heads to the polls. Your legacy will be judged by the voters.",
        options: [
          {
            label: "Run for Second Term",
            consequenceText: "Costs $50,000. Victory depends on Approval and Legitimacy.",
            action: (gs) => {
              if (gs.cash >= 50000) {
                gs.cash -= 50000;
                const winProb = (gs.approval / 150) + (gs.legitimacy / 200);
                if (Math.random() < winProb) {
                  setMessage("🎉 RE-ELECTED! The people have spoken. You remain President.");
                  triggerVictoryOverlay(gs);
                  gs.legitimacy += 10;
                } else {
                  setMessage("📉 DEFEATED: You have lost the election. Reverting to Councilor.");
                  gs.officeIndex = 1;
                  gs.approval = 40;
                }
              } else {
                setMessage("❌ CAMPAIGN BANKRUPT: You couldn't fund the race. You must step down.");
                gs.officeIndex = 1;
              }
            }
          },
          {
            label: "Abolish Term Limits",
            consequenceText: "Costs 100 Influence. -40 Legitimacy. Prevents further elections.",
            action: (gs) => {
              if (gs.influence >= 100) {
                gs.influence -= 100;
                gs.constitutionalIntegrity -= 60;
                gs.regimeType = "Empire";
                gs.corruption += 30;
                setMessage("👑 SOVEREIGN DECREE: Term limits are abolished. You are President-for-Life.");
              } else {
                setMessage("❌ FAILED: Not enough influence to subvert the constitution.");
              }
            }
          }
        ]
      });
    } else {
      // DICTATORSHIP PATH: No elections, but high revolt risk
      if (Math.random() < 0.3) {
        emit('OPPOSITION_RIOT', { severity: 'high' });
        openDecision(state, {
          title: "GENERAL STRIKE",
          description: "Massive protests against your 'eternal' rule have paralyzed the capital. The opposition demands a return to democracy.",
          options: [
            {
              label: "Violent Crackdown",
              consequenceText: "+20 Corruption, -30 Approval. Requires 60 Security.",
              action: (gs) => {
                if (gs.security >= 60) {
                  gs.corruption += 20;
                  gs.approval -= 30;
                  setMessage("⚔️ SUPPRESSION: The streets are cleared by force. Order (and fear) restored.");
                } else {
                  gs.officeIndex = 0;
                  setMessage("💀 OVERTHROWN: Your security forces defected. You are in exile.");
                }
              }
            },
            {
              label: "Promise Reforms",
              consequenceText: "+40 Legitimacy, restores elections. -50 Influence.",
              action: (gs) => {
                gs.legitimacy += 40;
                gs.constitutionalIntegrity = 80;
                gs.regimeType = "Republic";
                gs.influence -= 50;
                setMessage("🕊️ CONCESSION: Democracy is restored. A new election date is set.");
              }
            }
          ]
        });
      }
    }
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
