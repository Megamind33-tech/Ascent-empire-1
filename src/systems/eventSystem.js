/**
 * eventSystem.js — Dynamic Event Engine
 * =====================================
 * Responsible for continuously evaluating the game state
 * and randomly triggering contextual crises or opportunities.
 */

import { emit } from './eventBus.js';
import { openDecision } from '../ui/decisionModal.js';
import { playStatUp, playApprovalDrop } from './audioSystem.js';

const EVENT_TICK_RATE = 15; // Evaluate events every 15 seconds
let _timeSinceLastEval = 0;

/**
 * Event Database Definition
 * Each event has conditions and a dynamic trigger.
 */
const EVENT_POOL = [
    {
        id: "MARKET_CRASH",
        type: "ECONOMIC",
        cooldown: 180, // Prevent spam
        lastTriggered: 0,
        condition: (state) => state.cash > 50000 && state.buildings.stores > 5,
        weight: (state) => 0.1 + (state.corruption * 0.01),
        execute: (state) => {
            openDecision(state, {
                title: "MARKET CRASH",
                description: "Global stock failures have hit our trade sector hard. Panic selling is rampant in the stores.",
                options: [
                    {
                        label: "Bail out local businesses",
                        consequenceText: "Costs $25,000. Approval +5.",
                        action: (gs) => {
                            gs.cash = Math.max(0, gs.cash - 25000);
                            gs.approval = Math.min(100, gs.approval + 5);
                            playStatUp();
                            emit('ECONOMIC_EVENT', { id: "BAILOUT", amount: -25000 });
                        }
                    },
                    {
                        label: "Let the weak fail",
                        consequenceText: "Zero cost. Approval -15, Store Output halved temporarily.",
                        action: (gs) => {
                            gs.approval = Math.max(0, gs.approval - 15);
                            gs.activeModifiers.cashDelta -= (gs.buildings.stores * 2); // Halve store income approx
                            playApprovalDrop();
                            emit('ECONOMIC_EVENT', { id: "CRASH_AUSTERITY" });
                            
                            // Revert modifier after 60 seconds
                            gs.enactedLaws.push({
                                id: 'RECESSION_RECOVERY',
                                timestamp: Date.now(),
                                expiresAt: Date.now() + 60000,
                                onExpire: (s) => { s.activeModifiers.cashDelta += (s.buildings.stores * 2); }
                            });
                        }
                    }
                ]
            });
        }
    },
    {
        id: "WORKER_STRIKE",
        type: "SOCIAL",
        cooldown: 120,
        lastTriggered: 0,
        condition: (state) => state.buildings.mines > 0 || state.buildings.refineries > 0,
        weight: (state) => state.approval < 40 ? 0.3 : 0.05,
        execute: (state) => {
            openDecision(state, {
                title: "INDUSTRIAL STRIKE",
                description: "Workers in the heavy industries have halted production, demanding better wages and safer conditions.",
                options: [
                    {
                        label: "Concede to Demands",
                        consequenceText: "Costs $10,000. Approval +10. Steel/Fuel output unaffected.",
                        action: (gs) => {
                            gs.cash = Math.max(0, gs.cash - 10000);
                            gs.approval = Math.min(100, gs.approval + 10);
                            playStatUp();
                            emit('SOCIAL_EVENT', { id: "STRIKE_RESOLVED" });
                        }
                    },
                    {
                        label: "Deploy Police",
                        consequenceText: "Requires 1 Police Station. Approval -20, Security +10.",
                        action: (gs) => {
                            if (gs.buildings.police < 1) {
                                // If player tries to do this without police
                                gs.approval = Math.max(0, gs.approval - 25);
                                gs.corruption += 5;
                                playApprovalDrop();
                            } else {
                                gs.approval = Math.max(0, gs.approval - 20);
                                gs.security += 10;
                                playApprovalDrop();
                            }
                            emit('SOCIAL_EVENT', { id: "STRIKE_CRUSHED" });
                        }
                    }
                ]
            });
        }
    },
    {
        id: "INFRASTRUCTURE_FAILURE",
        type: "INFRASTRUCTURE",
        cooldown: 200,
        lastTriggered: 0,
        condition: (state) => state.population > 5000 && state.buildings.housing > 15,
        weight: (state) => 0.15,
        execute: (state) => {
            openDecision(state, {
                title: "POWER GRID FAILURE",
                description: "A catastrophic cascade failure has plunged the residential sectors into darkness.",
                options: [
                    {
                        label: "Emergency Repairs",
                        consequenceText: "Costs 100 Steel and $5,000. Restores power immediately.",
                        action: (gs) => {
                            if (gs.steel >= 100) {
                                gs.steel -= 100;
                                gs.cash = Math.max(0, gs.cash - 5000);
                                playStatUp();
                            } else {
                                // Fail penalty
                                gs.approval -= 10;
                                gs.population = Math.max(0, gs.population - 50); // People leave
                                playApprovalDrop();
                            }
                        }
                    },
                    {
                        label: "Ration Power",
                        consequenceText: "Approval -15. Saves resources but slows growth.",
                        action: (gs) => {
                            gs.approval = Math.max(0, gs.approval - 15);
                            playApprovalDrop();
                        }
                    }
                ]
            });
        }
    },
    {
        id: "CORPORATE_BRIBE",
        type: "ECONOMIC",
        cooldown: 300,
        lastTriggered: 0,
        condition: (state) => state.officeIndex >= 1, // Councilors and up
        weight: (state) => 0.1 + (state.corruption * 0.02),
        execute: (state) => {
            openDecision(state, {
                title: "LOBBYIST OFFER",
                description: "A coalition of wealthy industrialists is offering a massive 'campaign donation' in exchange for looking the other way on tax evasions.",
                options: [
                    {
                        label: "Accept the Donation",
                        consequenceText: "Receive $50,000. Corruption +20, Legitimacy -15.",
                        action: (gs) => {
                            gs.cash += 50000;
                            gs.corruption += 20;
                            gs.legitimacy = Math.max(0, gs.legitimacy - 15);
                            playStatUp();
                            emit('ECONOMIC_EVENT', { id: "BRIBE_ACCEPTED", amount: 50000 });
                        }
                    },
                    {
                        label: "Reject and Expose them",
                        consequenceText: "Approval +15, Legitimacy +10. Zero cash.",
                        action: (gs) => {
                            gs.approval = Math.min(100, gs.approval + 15);
                            gs.legitimacy += 10;
                            playStatUp();
                            emit('SOCIAL_EVENT', { id: "LOBBYIST_EXPOSED" });
                        }
                    }
                ]
            });
        }
    },
    {
        id: "ASSASSINATION_PLOT",
        type: "SOCIAL",
        cooldown: 400,
        lastTriggered: 0,
        condition: (state) => state.officeIndex >= 2 && state.corruption > 30, // Mayor+ and corrupt
        weight: (state) => Math.max(0, (state.corruption - 30) * 0.01),
        execute: (state) => {
            openDecision(state, {
                title: "ASSASSINATION PLOT UNCOVERED",
                description: "Intelligence forces have intercepted a plot against your life by rival factions.",
                options: [
                    {
                        label: "Hire Private Security",
                        consequenceText: "Costs $30,000. Plot thwarted safely.",
                        action: (gs) => {
                            if (gs.cash > 30000) {
                                gs.cash -= 30000;
                                playStatUp();
                            } else {
                                // Hit succeeds
                                gs.influence = Math.max(0, gs.influence - 20);
                                gs.legitimacy = Math.max(0, gs.legitimacy - 20);
                                playApprovalDrop();
                            }
                        }
                    },
                    {
                        label: "Crackdown with Police",
                        consequenceText: "Approval -20, Security +15. conspirators executed.",
                        action: (gs) => {
                            gs.approval = Math.max(0, gs.approval - 20);
                            gs.security += 15;
                            playApprovalDrop();
                            emit('SOCIAL_EVENT', { id: "PLOT_CRACKDOWN" });
                        }
                    }
                ]
            });
        }
    },
    {
        id: "MEDIA_SMEAR",
        type: "SOCIAL",
        cooldown: 250,
        lastTriggered: 0,
        condition: (state) => state.officeIndex >= 2 && state.approval > 60, // Targeting popular mayors+
        weight: (state) => 0.15,
        execute: (state) => {
            openDecision(state, {
                title: "MEDIA BLITZ",
                description: "A rival network has launched a coordinated smear campaign accusing you of embezzlement.",
                options: [
                    {
                        label: "Bribe the Editors",
                        consequenceText: "Costs $15,000. Corruption +5, but the story is killed.",
                        action: (gs) => {
                            if(gs.cash >= 15000) {
                                gs.cash = Math.max(0, gs.cash - 15000);
                                gs.corruption += 5;
                                playStatUp();
                                emit('SOCIAL_EVENT', { id: "STORY_KILLED" });
                            } else {
                                gs.approval = Math.max(0, gs.approval - 20);
                                playApprovalDrop();
                            }
                        }
                    },
                    {
                        label: "Deny Everything",
                        consequenceText: "Zero cost. Approval -20, Influence -10.",
                        action: (gs) => {
                            gs.approval = Math.max(0, gs.approval - 20);
                            gs.influence = Math.max(0, gs.influence - 10);
                            playApprovalDrop();
                            emit('SCANDAL', { sourceRival: "Media", severity: 0.8 });
                        }
                    }
                ]
            });
        }
    },
    {
        id: "POLITICAL_COUP",
        type: "CRISIS",
        cooldown: 600,
        lastTriggered: 0,
        condition: (state) => state.officeIndex >= 3 && state.legitimacy < 20, // MP or higher with zero public trust
        weight: (state) => 0.2 + (state.corruption * 0.05),
        execute: (state) => {
            openDecision(state, {
                title: "MILITARY COUP D'ETAT",
                description: "The Joint Chiefs have declared your administration illegitimate. Tanks are surrounding the capital. They demand your immediate resignation.",
                options: [
                    {
                        label: "Step Down Peacefully",
                        consequenceText: "Lose your office (Revert to Councilor). Massive influence drop.",
                        action: (gs) => {
                            gs.officeIndex = 1;
                            gs.influence = Math.max(0, gs.influence - 50);
                            gs.legitimacy = 30; // Fresh start for the new regime
                            setMessage("📉 COUP SUCCESS: You have been deposed. Rebuilding from the Council...");
                            emit('SOCIAL_EVENT', { id: "COUP_PEACEFUL" });
                        }
                    },
                    {
                        label: "Resist with Loyalists",
                        consequenceText: "Requires high Security (80+). 50% chance of Civil War vs Victory.",
                        action: (gs) => {
                            if (gs.security >= 80) {
                                if (Math.random() > 0.5) {
                                    gs.legitimacy += 20;
                                    gs.security -= 30;
                                    setMessage("🛡️ VICTORIOUS: The coup was crushed! You remain in power, but the military is weakened.");
                                } else {
                                    gs.population = Math.max(0, gs.population * 0.7);
                                    gs.cash = Math.max(0, gs.cash - 50000);
                                    gs.approval -= 40;
                                    setMessage("🔥 CIVIL WAR: The resistance failed. The nation burns as factions fight for control.");
                                }
                            } else {
                                gs.officeIndex = 0; // Absolute reset
                                gs.cash = 0;
                                setMessage("💀 TOTAL DEFEAT: The military seized everything. You are back to being a Nobody.");
                            }
                            emit('SOCIAL_EVENT', { id: "COUP_RESISTANCE" });
                        }
                    }
                ]
            });
        }
    },
    {
        id: "CONSTITUTIONAL_REFORM",
        type: "POLITICAL",
        cooldown: 800,
        lastTriggered: 0,
        condition: (state) => state.officeIndex === 5 && state.influence > 80,
        weight: (state) => 0.1,
        execute: (state) => {
            openDecision(state, {
                title: "CONSTITUTIONAL REFORM",
                description: "Your legal advisors suggest a 'modernization' of the basic law. You can strengthen the executive branch or solidify democratic pillars.",
                options: [
                    {
                        label: "Unitary Sovereign Act",
                        consequenceText: "Abolish regional checks. +50 Influence, -20 Legitimacy, Regime: Empire.",
                        action: (gs) => {
                            gs.influence += 50;
                            gs.legitimacy -= 20;
                            gs.regimeType = "Empire";
                            gs.constitutionalIntegrity = Math.max(0, gs.constitutionalIntegrity - 40);
                            setMessage("📜 DECREE: The Unitary Sovereign Act is passed. The era of the Republic ends.");
                        }
                    },
                    {
                        label: "Bill of Rights",
                        consequenceText: "+30 Legitimacy, +20 Approval. Stability +30.",
                        action: (gs) => {
                            gs.legitimacy += 30;
                            gs.approval += 20;
                            gs.constitutionalIntegrity = Math.min(100, gs.constitutionalIntegrity + 20);
                            setMessage("⚖️ REFORM: The Bill of Rights is codified. Democracy is secured.");
                        }
                    }
                ]
            });
        }
    },
    {
        id: "DIPLOMATIC_ANNEXATION",
        type: "WORLD",
        cooldown: 1200,
        lastTriggered: 0,
        condition: (state) => state.officeIndex === 5 && state.worldDominance < 100 && state.cash > 100000,
        weight: (state) => 0.15,
        execute: (state) => {
            const victim = state.nations.find(n => n.name !== state.nations[state.currentNationIndex].name && !n.isAnnexed);
            if (!victim) return;
            openDecision(state, {
                title: "SOVEREIGN EXPANSION",
                description: `Pressure is mounting on neighboring ${victim.name}. Their leadership is weak. Do we bring them into our administrative sphere?`,
                options: [
                    {
                        label: `Annex ${victim.name} (Cost: $100k)`,
                        consequenceText: "Expansion increases World Dominance by 20. High risk of sanctions.",
                        action: (gs) => {
                            if (gs.cash >= 100000) {
                                gs.cash -= 100000;
                                gs.worldDominance += 20;
                                victim.isAnnexed = true;
                                gs.legitimacy -= 15;
                                setMessage(`🌍 ANNEXED: ${victim.name} has been integrated. Our borders expand.`);
                            }
                        }
                    },
                    {
                        label: "Economic Partnership",
                        consequenceText: "+$500/tick permanent revenue. No territorial gain.",
                        action: (gs) => {
                            gs.activeModifiers.cashDelta += 500;
                            setMessage(`🤝 TREATY: A golden trade deal signed with ${victim.name}.`);
                        }
                    }
                ]
            });
        }
    },
    {
        id: "OPPOSITION_RIOT",
        type: "CRISIS",
        cooldown: 400,
        lastTriggered: 0,
        condition: (state) => state.officeIndex === 5 && (state.approval < 30 || state.constitutionalIntegrity < 30),
        weight: (state) => 0.3,
        execute: (state) => {
            openDecision(state, {
                title: "OPPOSITION UPRISING",
                description: "The disenfranchised have taken to the streets. They've occupied the central bank and the media hub.",
                options: [
                    {
                        label: "Iron Fist",
                        consequenceText: "Use Security (70+) to crush them. +20 Corruption.",
                        action: (gs) => {
                            if (gs.security >= 70) {
                                gs.security -= 10;
                                gs.corruption += 20;
                                setMessage("🛡️ CRUSHED: The riot was suppressed. Silence returns to the capital.");
                            } else {
                                gs.cash *= 0.5;
                                gs.approval -= 20;
                                setMessage("🔥 LOOTED: Security forces were overwhelmed. The treasury was raided.");
                            }
                        }
                    },
                    {
                        label: "Dialog & Concession",
                        consequenceText: "Pay $30,000 to rioters. +15 Legitimacy.",
                        action: (gs) => {
                            if (gs.cash >= 30000) {
                                gs.cash -= 30000;
                                gs.legitimacy += 15;
                                gs.approval += 10;
                                setMessage("🕊️ TRUCE: Peace bought with gold. For now.");
                            }
                        }
                    }
                ]
            });
        }
    },
    {
        id: "MILITARY_COUP_INITIATE",
        type: "POLITICAL",
        cooldown: 800,
        lastTriggered: 0,
        condition: (state) => state.officeIndex < 3 && state.buildings.barracks > 0 && state.influence > 20,
        weight: (state) => 0.1,
        execute: (state) => {
            openDecision(state, {
                title: "CONSPIRACY: MILITARY COUP",
                description: "You have established ties with the local barracks. The colonels are restless. Do we march on the Capital to seize the Presidency now?",
                options: [
                    {
                        label: "Seize Power (Coup)",
                        consequenceText: "70% Success. If fail, game over (Execution). Requires $20,000.",
                        action: (gs) => {
                            if (gs.cash >= 20000) {
                                gs.cash -= 20000;
                                if (Math.random() < 0.7) {
                                    gs.officeIndex = 5;
                                    gs.regimeType = "Empire";
                                    gs.legitimacy = 5;
                                    gs.corruption += 40;
                                    setMessage("⚔️ POWER SEIZED: The coup succeeded! You are now the Supreme Leader.");
                                    import('../ui/hud.js').then(({ triggerVictoryOverlay }) => triggerVictoryOverlay(gs));
                                } else {
                                    gs.gameStatus = 'defeated';
                                    setMessage("💀 EXECUTED: The coup failed. You have been charged with high treason.");
                                }
                            }
                        }
                    },
                    {
                        label: "Stay the Course",
                        consequenceText: "Decline the offer. +10 Legitimacy for loyalty.",
                        action: (gs) => {
                            gs.legitimacy += 10;
                            setMessage("🕊️ LOYALTY: You declined the conspiracy. The Republic endures.");
                        }
                    }
                ]
            });
        }
    },
    {
        id: "PROXY_WAR",
        type: "WORLD",
        cooldown: 600,
        lastTriggered: 0,
        condition: (state) => state.officeIndex === 5 && state.cash > 40000,
        weight: (state) => 0.2,
        execute: (state) => {
            const neighbor = state.nations.find(n => n.name !== state.nations[state.currentNationIndex].name && !n.isAnnexed);
            if (!neighbor) return;
            openDecision(state, {
                title: "SPONSOR PROXY WAR",
                description: `Intel reports unrest in ${neighbor.name}. We can fund their rebels to weaken their government and expand our hegemony.`,
                options: [
                    {
                        label: `Fund Rebels ($40k)`,
                        consequenceText: "+15 World Dominance, -10 Legitimacy. Neighboring relation drops.",
                        action: (gs) => {
                            if (gs.cash >= 40000) {
                                gs.cash -= 40000;
                                gs.worldDominance += 15;
                                gs.legitimacy -= 10;
                                neighbor.relation -= 30;
                                setMessage(`🔥 PROXY WAR: We are now funding the insurgency in ${neighbor.name}.`);
                            }
                        }
                    },
                    {
                        label: "Ignore Unrest",
                        consequenceText: "Stability is more important than expansion.",
                        action: (gs) => {
                            setMessage("🕊️ NEUTRALITY: We will not interfere in the affairs of neighbors.");
                        }
                    }
                ]
            });
        }
    },
    {
        id: "BORDER_CONFLICT",
        type: "WORLD",
        cooldown: 900,
        lastTriggered: 0,
        condition: (state) => state.officeIndex === 5 && (state.buildings.barracks > 0 || state.buildings.bases > 0) && state.cash > 80000,
        weight: (state) => 0.15,
        execute: (state) => {
            const neighbor = state.nations.find(n => n.name !== state.nations[state.currentNationIndex].name && !n.isAnnexed);
            if (!neighbor) return;
            openDecision(state, {
                title: "BORDER CONFLICT",
                description: `A dispute in the frontier has escalated. We can launch a 'Limited Military Operation' to annex territory from ${neighbor.name}.`,
                options: [
                    {
                        label: "Launch Operation ($80k)",
                        consequenceText: "+25 World Dominance. Requires success roll based on Security.",
                        action: (gs) => {
                            if (gs.cash >= 80000) {
                                gs.cash -= 80000;
                                const winProb = 0.5 + (gs.security / 200);
                                if (Math.random() < winProb) {
                                    gs.worldDominance += 25;
                                    neighbor.isAnnexed = true;
                                    gs.legitimacy -= 20;
                                    setMessage(`🦅 VICTORY: ${neighbor.name} has fallen to our forces!`);
                                } else {
                                    gs.security -= 20;
                                    gs.approval -= 15;
                                    setMessage("📉 DEFEAT: The operation failed. Our military is disgraced.");
                                }
                            }
                        }
                    },
                    {
                        label: "Withdraw Forces",
                        consequenceText: "De-escalate to avoid war.",
                        action: (gs) => {
                            gs.legitimacy += 5;
                            setMessage("🏳️ PEACE: Troops have been pulled back from the border.");
                        }
                    }
                ]
            });
        }
    }
];

/**
 * Runs continuously in the main loop to check if an event should spawn.
 */
export function runEventTick(state, dt) {
    if (state.gamePaused) return;

    _timeSinceLastEval += dt;
    if (_timeSinceLastEval >= EVENT_TICK_RATE) {
        _timeSinceLastEval = 0;
        _evaluateEvents(state);
    }
}

function _evaluateEvents(state) {
    const now = Date.now();
    let possibleEvents = [];

    // Filter events that meet conditions and are off cooldown
    for (const event of EVENT_POOL) {
        if (now - event.lastTriggered < event.cooldown * 1000) continue;
        if (event.condition(state)) {
            possibleEvents.push(event);
        }
    }

    if (possibleEvents.length === 0) return;

    // Calculate total weight
    let totalWeight = 0;
    const weightedEvents = possibleEvents.map(event => {
        const w = event.weight(state);
        totalWeight += w;
        return { event, weight: w };
    });

    // Random roll
    let roll = Math.random() * totalWeight;
    let selectedEvent = null;

    for (const item of weightedEvents) {
        if (roll <= item.weight) {
            selectedEvent = item.event;
            break;
        }
        roll -= item.weight;
    }

    if (selectedEvent) {
        selectedEvent.lastTriggered = now;
        selectedEvent.execute(state);
        console.log(`[EventSystem] Triggered ${selectedEvent.id}`);
    }
}

// Developer testing hook
export function forceTriggerEvent(state, eventId) {
    const event = EVENT_POOL.find(e => e.id === eventId);
    if (event) {
        event.execute(state);
        console.log(`[EventSystem] Force-Triggered ${eventId}`);
    } else {
        console.warn(`[EventSystem] Could not find event: ${eventId}`);
    }
}
