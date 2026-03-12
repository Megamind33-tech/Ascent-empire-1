/**
 * decisionModal.js — Interactive Political Choices
 * ===============================================
 * Handles full-screen modals for critical game decisions 
 * that pause the simulation and force the player to lead.
 */

import { emit } from '../systems/eventBus.js';
import { playUIClick, playStatUp, playApprovalDrop } from '../systems/audioSystem.js';

let _activeDecision = null;

/**
 * Open a decision modal.
 * @param {Object} state - The game state object.
 * @param {Object} decision - { title, description, options: [ { label, action, consequenceText } ] }
 */
export function openDecision(state, decision) {
  if (_activeDecision) return; // Only one at a time
  _activeDecision = decision;

  // Create overlay
  const overlay = document.createElement('div');
  overlay.id = 'decision-overlay';
  overlay.className = 'glass-blur-heavy';
  
  const content = document.createElement('div');
  content.className = 'decision-card';
  
  const title = document.createElement('h2');
  title.textContent = decision.title.toUpperCase();
  
  const desc = document.createElement('p');
  desc.textContent = decision.description;
  
  const optionsContainer = document.createElement('div');
  optionsContainer.className = 'options-list';
  
  decision.options.forEach((opt, idx) => {
    const btn = document.createElement('button');
    btn.className = 'option-btn';
    btn.innerHTML = `<span class="opt-label">${opt.label}</span><br/><small class="opt-hint">${opt.consequenceText}</small>`;
    
    btn.onclick = () => {
      playUIClick();
      opt.action(state);
      _closeDecision(overlay);
    };
    optionsContainer.appendChild(btn);
  });
  
  content.appendChild(title);
  content.appendChild(desc);
  content.appendChild(optionsContainer);
  overlay.appendChild(content);
  document.body.appendChild(overlay);
  
  // Pause the game loop through state flag
  state.gamePaused = true;
}

function _closeDecision(overlay) {
  _activeDecision = null;
  overlay.remove();
  // We don't unpause here directly because we want a 0.5s breathing room
  setTimeout(() => {
    window.dispatchEvent(new CustomEvent('resumeGame'));
  }, 500);
}

/** 
 * Automatically handle Faction Offers by turning them into interactive decisions 
 */
export function initDecisionHooks(state) {
  // Listen for faction offers via event bus
  import('../systems/eventBus.js').then(({ on }) => {
    on('FACTION_OFFER', ({ faction, deal, cost }) => {
      openDecision(state, {
        title: `${faction.toUpperCase()} REQUEST`,
        description: deal,
        options: [
          {
            label: "Accept the Deal",
            consequenceText: `Costs $${cost.toLocaleString()}. Legitimacy decreases, but stability increases.`,
            action: (gs) => {
              if (gs.cash >= cost) {
                gs.cash -= cost;
                gs.legitimacy = Math.max(0, gs.legitimacy - 12);
                gs.factions[`${faction}Pressure`] -= 15;
                if (gs.factions[faction]) gs.factions[faction].dealActive = true;
                playStatUp();
              }
            }
          },
          {
            label: "Reject Them",
            consequenceText: `Zero cost. But ${faction} hostility will surge immediately.`,
            action: (gs) => {
              gs.factions[`${faction}Pressure`] += 22;
              if (gs.factions[faction]) gs.factions[faction].state = 'HOSTILE';
              playApprovalDrop();
            }
          }
        ]
      });
    });
    
    on('SCANDAL', ({ sourceRival, severity }) => {
        if (severity > 0.7) {
            openDecision(state, {
                title: "MEDIA CRISIS",
                description: sourceRival 
                    ? `${sourceRival} has leaked detailed evidence of systemic corruption. Citizens are furious.` 
                    : "A whistleblower has leaked internal documents exposing high-level bribery. The crowd demands accountability.",
                options: [
                    {
                        label: "Fire the Responsible Staff",
                        consequenceText: "Costs $5,000. Regain 8 Approval, but Influence drops by 10.",
                        action: (gs) => {
                            gs.cash = Math.max(0, gs.cash - 5000);
                            gs.approval += 8;
                            gs.influence = Math.max(0, gs.influence - 10);
                            playStatUp();
                        }
                    },
                    {
                        label: "Silence the Whistleblower",
                        consequenceText: "Costs $12,000. No Approval loss, but Corruption +15.",
                        action: (gs) => {
                             gs.cash = Math.max(0, gs.cash - 12000);
                             gs.corruption += 15;
                             playApprovalDrop();
                        }
                    },
                    {
                        label: "Public Apology",
                        consequenceText: "Zero cost. Approval -12, but Legitimacy +10.",
                        action: (gs) => {
                            gs.approval = Math.max(0, gs.approval - 12);
                            gs.legitimacy += 10;
                            playStatUp();
                        }
                    }
                ]
            });
        }
    });
  });
}
