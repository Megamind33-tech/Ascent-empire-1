/**
 * npcSystem.js — 4-Layer NPC Intelligence System
 *
 * Layer 1: Personality Matrix   (permanent traits per rival)
 * Layer 2: World Event Awareness (reads eventBus history)
 * Layer 3: Emotional FSM        (state transitions with inertia)
 * Layer 4: Behaviour Output     (concrete game consequences)
 */

import { emit, on, getRecentEvents } from './eventBus.js';
import { setMessage } from '../ui/hud.js';

// ─── Constants ────────────────────────────────────────────────────────────────

const EMOTION = {
  IDLE:          'IDLE',
  ALERT:         'ALERT',
  ANXIOUS:       'ANXIOUS',
  CALCULATING:   'CALCULATING',
  OPPORTUNISTIC: 'OPPORTUNISTIC',
  AGGRESSIVE:    'AGGRESSIVE',
  WITHDRAWN:     'WITHDRAWN',
  TRIUMPHANT:    'TRIUMPHANT',
  SETBACK:       'SETBACK',
  BITTER:        'BITTER',
  VENGEFUL:      'VENGEFUL',
  REGROUPING:    'REGROUPING',
};

// Minimum time (seconds) before an emotion can transition — varies by patience trait
const BASE_INERTIA = 8;

// Archetype-specific behaviour flavour text
const SMEAR_LINES = {
  populist:         [ 'is whipping up crowds against you.', 'broadcasts your failures on every corner.', 'accuses you of selling out the people.' ],
  establishment:    [ 'quietly files regulatory complaints.', 'leverages allies to stall your projects.', 'signals institutional distrust in your leadership.' ],
  'shadow-financed':[ 'funds anonymous attacks on your image.', 'finances disinformation through proxy accounts.', 'plants rumours via cartel-linked media.' ],
};

const CALCULATING_LINES = {
  populist:         [ 'has gone suspiciously quiet.', 'is building a street coalition out of sight.' ],
  establishment:    [ 'is in closed-door meetings with party elders.', 'is restructuring financial networks.' ],
  'shadow-financed':[ 'has disappeared from public life entirely.', 'is moving funds to an unknown destination.' ],
};

const TRIUMPHANT_LINES = {
  populist:         [ 'holds a massive public rally. The crowd roars.' ],
  establishment:    [ 'receives an endorsement from the party council.' ],
  'shadow-financed':[ 'surfaces with unexpected backers and a new agenda.' ],
};

// ─── Trait Drift (weekly) ────────────────────────────────────────────────────

/** Slowly mutate traits so long-term players can't fully predict behaviour */
function driftTraits(rival, dt) {
  const keys = Object.keys(rival.traits);
  if (Math.random() > 0.9998) { // very rare per frame
    const key = keys[Math.floor(Math.random() * keys.length)];
    rival.traits[key] = clamp(rival.traits[key] + (Math.random() * 0.06 - 0.03), 0.05, 0.98);
  }
}

// ─── Memory ──────────────────────────────────────────────────────────────────

function recordMemory(rival, event, impact) {
  rival.memory.push({ event, impact, time: Date.now() });
  if (rival.memory.length > 6) rival.memory.shift();
}

/** How alarmed is this rival based on recent events near their interests? */
function computeThreatLevel(rival, state) {
  let threat = 0;
  const recent = getRecentEvents(20000);
  for (const e of recent) {
    if (e.type === 'SCANDAL')         threat += 0.4 * (e.payload.severity || 0.5);
    if (e.type === 'ELECTION_CYCLE')  threat += 0.5 * rival.traits.aggression;
    if (e.type === 'ECONOMIC_BOOM')   threat += 0.3 * rival.traits.greed;
    if (e.type === 'PROTEST')         threat += 0.3 * rival.traits.paranoia;
    if (e.type === 'BORDER_TENSION')  threat += 0.2 * rival.traits.paranoia;
  }
  // Extra paranoia multiplier
  threat *= (1 + rival.traits.paranoia * 0.5);
  // Loyal rivals interpret player success less as a threat
  if (rival.relationships.player > 30) threat *= 0.6;
  return clamp(threat, 0, 1);
}

/** How opportunistic is this rival right now based on player weakness */
function computeOpportunity(rival, state) {
  let opp = 0;
  if (state.approval < 35)                 opp += 0.5;
  if (state.corruption > 30)               opp += 0.35 * rival.traits.aggression;
  if (state.food < 30)                     opp += 0.4;
  if (state.legitimacy < 20)               opp += 0.3;
  if (rival.approval > state.approval + 8) opp += 0.4;
  opp *= (1 + rival.traits.aggression * 0.4);
  if (rival.relationships.player > 20) opp *= 0.5; // Allies hold back
  return clamp(opp, 0, 1);
}

// ─── Emotional FSM ────────────────────────────────────────────────────────────

function transitionEmotion(rival, newState, state) {
  // Enforce inertia: can't transition faster than patience allows
  if (rival.emotionalTimer < rival.emotionalInertia * rival.traits.patience) return;
  if (rival.emotionalState === newState) return;
  rival.emotionalState = newState;
  rival.emotionalTimer = 0;
}

function updateEmotionalFSM(rival, state, dt) {
  rival.emotionalTimer += dt;
  const threat = computeThreatLevel(rival, state);
  const opp    = computeOpportunity(rival, state);

  switch (rival.emotionalState) {
    case EMOTION.IDLE:
      if (threat > 0.5)  transitionEmotion(rival, EMOTION.ALERT, state);
      else if (opp > 0.45) transitionEmotion(rival, EMOTION.OPPORTUNISTIC, state);
      break;

    case EMOTION.ALERT:
      if (rival.emotionalTimer > BASE_INERTIA) {
        if (threat > 0.7)       transitionEmotion(rival, EMOTION.ANXIOUS, state);
        else if (threat < 0.2)  transitionEmotion(rival, EMOTION.IDLE, state);
      }
      break;

    case EMOTION.ANXIOUS:
      if (rival.emotionalTimer > BASE_INERTIA * 1.5) {
        if (rival.traits.aggression > 0.6)      transitionEmotion(rival, EMOTION.AGGRESSIVE, state);
        else if (rival.traits.adaptability > 0.6) transitionEmotion(rival, EMOTION.CALCULATING, state);
        else                                      transitionEmotion(rival, EMOTION.WITHDRAWN, state);
      }
      break;

    case EMOTION.OPPORTUNISTIC:
      if (rival.emotionalTimer > BASE_INERTIA) {
        transitionEmotion(rival, EMOTION.CALCULATING, state);
      }
      break;

    case EMOTION.CALCULATING:
      // Silent power accumulation — transitions to AGGRESSIVE after sufficient build-up
      rival.shadowPower += 0.18 * dt;
      if (rival.shadowPower > 8 || rival.emotionalTimer > 40) {
        rival.power += rival.shadowPower;
        rival.shadowPower = 0;
        transitionEmotion(rival, rival.traits.aggression > 0.5 ? EMOTION.AGGRESSIVE : EMOTION.OPPORTUNISTIC, state);
      }
      break;

    case EMOTION.AGGRESSIVE:
      if (rival.emotionalTimer > BASE_INERTIA * 2) {
        // Check if the aggression paid off
        if (rival.approval > state.approval + 5) transitionEmotion(rival, EMOTION.TRIUMPHANT, state);
        else                                      transitionEmotion(rival, EMOTION.REGROUPING, state);
      }
      break;

    case EMOTION.TRIUMPHANT:
      if (rival.emotionalTimer > 20) transitionEmotion(rival, EMOTION.IDLE, state);
      break;

    case EMOTION.SETBACK:
      recordMemory(rival, 'player_countered', -15);
      rival.relationships.player -= 12;
      if (rival.traits.paranoia > 0.6) transitionEmotion(rival, EMOTION.VENGEFUL, state);
      else if (rival.traits.patience > 0.5) transitionEmotion(rival, EMOTION.REGROUPING, state);
      else transitionEmotion(rival, EMOTION.BITTER, state);
      break;

    case EMOTION.BITTER:
      // Passive approval leak without messages — players notice slowly
      state.approval -= 0.015 * dt * rival.traits.aggression;
      if (rival.emotionalTimer > 30) transitionEmotion(rival, EMOTION.IDLE, state);
      break;

    case EMOTION.VENGEFUL:
      // Targets player's best building with a subtle sabotage event
      if (rival.emotionalTimer > 15) {
        const targets = ['school','police','stores','barracks'];
        const t = targets[Math.floor(Math.random() * targets.length)];
        emit('BUILDING_SABOTAGE', { rivalName: rival.name, buildingType: t });
        transitionEmotion(rival, EMOTION.REGROUPING, state);
      }
      break;

    case EMOTION.WITHDRAWN:
      // Invisible disinformation — small, hard to trace approval leak
      state.approval -= 0.008 * dt;
      if (rival.emotionalTimer > 60 * rival.traits.patience) {
        rival.power += 4; // Rested and returned stronger
        transitionEmotion(rival, EMOTION.IDLE, state);
        const line = CALCULATING_LINES[rival.archetype];
        setMessage(`${rival.name} ${pick(line)}`);
      }
      break;

    case EMOTION.REGROUPING:
      if (rival.emotionalTimer > 40) {
        rival.power += 3;
        transitionEmotion(rival, EMOTION.IDLE, state);
      }
      break;
  }
}

// ─── Behaviour Output Layer ───────────────────────────────────────────────────

function executeAggressive(rival, state, dt) {
  if (rival.actionCooldown > 0) { rival.actionCooldown -= dt; return; }
  const roll = Math.random();
  if (roll < 0.35) {
    // Smear campaign
    const magnitude = 1.2 + rival.traits.aggression * 1.4;
    state.approval  -= magnitude * dt * 0.4;
    state.influence -= 0.4 * rival.traits.aggression * dt;
    if (Math.random() < 0.04) {
      setMessage(`${rival.name} ${pick(SMEAR_LINES[rival.archetype])}`);
      emit('SCANDAL', { sourceRival: rival.name, severity: rival.traits.aggression });
      recordMemory(rival, 'smear_launched', 5);
    }
  } else if (roll < 0.6) {
    // Boost own approval at player's expense
    rival.approval += 1.6 * dt;
    state.approval -= 0.8 * dt;
  } else {
    // Rally to build power
    rival.power    += 0.9 * dt;
    rival.approval += 0.6 * dt;
  }
  rival.actionCooldown = 4 + Math.random() * 6;
}

function executeOpportunistic(rival, state, dt) {
  if (rival.actionCooldown > 0) { rival.actionCooldown -= dt; return; }
  rival.approval += 1.8 * dt;
  state.factions.partySupport -= 0.3 * dt;
  rival.actionCooldown = 6;
}

function executeTriumphant(rival, state, dt) {
  rival.approval += 0.9 * dt;
  rival.power    += 0.4 * dt;
  if (Math.random() < 0.015) {
    setMessage(`${rival.name} ${pick(TRIUMPHANT_LINES[rival.archetype])}`);
  }
}

// ─── Faction FSM ─────────────────────────────────────────────────────────────

function updateFactions(state, dt) {
  // Cartel FSM
  const cartel = state.factions.cartel;
  cartel.timer += dt;
  if (cartel.state === 'WATCHING') {
    if (state.corruption > 28 && cartel.timer > 60) {
      cartel.state = 'PROBING';
      cartel.timer = 0;
    }
  } else if (cartel.state === 'PROBING') {
    state.factions.cartelPressure += 0.04 * dt;
    if (cartel.timer > 30) {
      cartel.state = 'OFFERING';
      cartel.timer = 0;
      emit('FACTION_OFFER', { faction: 'cartel', deal: 'We fund your campaign — you look away from our operations.', cost: 8000 });
    }
  } else if (cartel.state === 'OFFERING') {
    if (cartel.timer > 45) {
      // Offer expired — punish player for ignoring
      state.approval -= 2;
      cartel.state = 'HOSTILE';
      cartel.timer = 0;
    }
  } else if (cartel.state === 'HOSTILE') {
    state.factions.cartelPressure += 0.1 * dt;
    state.corruption += 0.06 * dt;
    if (cartel.timer > 120) { cartel.state = 'WATCHING'; cartel.timer = 0; }
  }

  // Mafia FSM
  const mafia = state.factions.mafia;
  mafia.timer += dt;
  if (mafia.state === 'WATCHING') {
    if (state.security < 12 && mafia.timer > 45) {
      mafia.state = 'EXPANDING';
      mafia.timer = 0;
      emit('DISTRICT_UNREST', { level: 2 });
    }
  } else if (mafia.state === 'EXPANDING') {
    state.factions.mafiaPressure += 0.08 * dt;
    state.security -= 0.03 * dt;
    if (state.security > 25) { mafia.state = 'WATCHING'; mafia.timer = 0; }
    else if (mafia.timer > 90) {
      emit('FACTION_OFFER', { faction: 'mafia', deal: 'Pay us ₵15,000 and we reduce street violence for 60 days.', cost: 15000 });
      mafia.state = 'OFFERING'; mafia.timer = 0;
    }
  } else if (mafia.state === 'OFFERING') {
    if (mafia.timer > 40) { mafia.state = 'EXPANDING'; mafia.timer = 0; }
  } else if (mafia.state === 'HOSTILE') {
    // Player rejected the deal — mafia escalates pressure and clamps security
    state.factions.mafiaPressure += 0.12 * dt;
    state.security -= 0.05 * dt;
    state.corruption += 0.04 * dt;
    if (mafia.timer > 120) {
      mafia.state = 'WATCHING';
      mafia.timer = 0;
      setMessage('The mafia has pulled back for now, watching from the shadows.');
    }
  }
}

// ─── Election Cycle ──────────────────────────────────────────────────────────

function updateElectionCycle(state, dt) {
  state.electionTimer -= dt;
  if (state.electionTimer <= 120 && !state._electionWarned) {
    state._electionWarned = true;
    emit('ELECTION_CYCLE', { daysRemaining: 30 });
    setMessage('⚠️ Elections are approaching. Every rival is intensifying their campaign.');
  }
  if (state.electionTimer <= 0) {
    // Resolve election: Compare player standing vs strongest rival
    const playerScore = state.approval * 0.5 + state.legitimacy * 0.3 + state.influence * 0.2;
    const topRival    = state.rivals.reduce((best, r) => (r.approval * 0.5 + r.power * 0.5 > best.approval * 0.5 + best.power * 0.5 ? r : best));
    const rivalScore  = topRival.approval * 0.5 + topRival.power * 0.3 + topRival.shadowPower * 0.2;
    
    if (playerScore > rivalScore) {
      // Victory: Keep current seat, gain legitimacy boost
      state.legitimacy += 12;
      state.influence += 8;
      setMessage(`🗳️ ELECTION SECURED: You have been re-elected as ${CONFIG.politics.offices[state.officeIndex]}. The people have spoken.`);
      emit('RIVAL_SETBACK', { rivalName: topRival.name });
      topRival.emotionalState = EMOTION.SETBACK;
      topRival.emotionalTimer = 0;
    } else {
      // Defeat: Regress in rank unless already at 'Nobody'
      if (state.officeIndex > 0) state.officeIndex--;
      state.approval = Math.max(10, state.approval - 15);
      state.influence = Math.max(0, state.influence - 10);
      setMessage(`🗳️ DEFEAT: ${topRival.name} has ousted you from office! You are now a ${CONFIG.politics.offices[state.officeIndex]}.`);
      emit('RIVAL_VICTORY', { rivalName: topRival.name, newOffice: CONFIG.politics.offices[state.officeIndex + 1] });
      topRival.emotionalState = EMOTION.TRIUMPHANT;
      topRival.emotionalTimer = 0;
    }
    // Reset for next cycle (longer each time)
    state.electionTimer = 400 + state.officeIndex * 80;
    state._electionWarned = false;
    for (const r of state.rivals) { r.shadowPower = 0; }
  }
}

// ─── Event Subscriptions (listen for external triggers) ──────────────────────

let _subscribed = false;
function ensureSubscriptions(state) {
  if (_subscribed) return;
  _subscribed = true;

  on('BUILDING_SABOTAGE', ({ rivalName, buildingType }) => {
    // Temporarily reduce a building's contribution (via a flag the economy system reads)
    if (!state.sabotage) state.sabotage = {};
    state.sabotage[buildingType] = { active: true, timer: 45, source: rivalName };
    setMessage(`🔥 A ${buildingType} facility was vandalized. ${rivalName}'s hand is suspected.`);
  });

  on('FACTION_OFFER', ({ faction, deal, cost }) => {
    setMessage(`💼 [${faction.toUpperCase()}] "${deal}" — Cost: $${cost.toLocaleString()}. (Save & decide.)`);
  });

  on('DISTRICT_UNREST', ({ level }) => {
    setMessage(`⚡ District unrest is rising (Level ${level}). Citizens are restless.`);
  });
}

// ─── Cascade Event Triggers ───────────────────────────────────────────────────

function checkCascades(state) {
  // FOOD_CRISIS → PROTEST
  if (state.food < 30 && !state.activeEvents.includes('PROTEST')) {
    emit('FOOD_CRISIS', { severity: 1 - state.food / 30 });
    if (state.security < 20) {
      state.activeEvents.push('PROTEST');
      emit('PROTEST', { district: 'civic-heights', size: state.food < 15 ? 'large' : 'small' });
    }
  }
  // PROTEST + unaddressed → DISTRICT_UNREST
  if (state.activeEvents.includes('PROTEST') && state.security < 15) {
    emit('DISTRICT_UNREST', { level: 3 });
  }
  // ECONOMIC_BOOM triggers cartel interest
  if (state.cash > 80000 && !state.activeEvents.includes('BOOM_NOTIFIED')) {
    state.activeEvents.push('BOOM_NOTIFIED');
    emit('ECONOMIC_BOOM', { cashAmount: state.cash });
    setMessage('💰 Word of your growing treasury has reached undesirable ears.');
  }
  // BORDER_TENSION
  for (let i = 0; i < state.nations.length; i++) {
    if (state.nations[i].relation < -20 && !state.activeEvents.includes(`tension_${i}`)) {
      state.activeEvents.push(`tension_${i}`);
      emit('BORDER_TENSION', { nationIndex: i, relation: state.nations[i].relation });
      setMessage(`🚨 Relations with ${state.nations[i].name} are critical. Rivals are watching.`);
    }
  }
  // Purge stale flags (events lasting more than 150s)
  state.activeEvents = state.activeEvents.filter(e => typeof e === 'string');
}

// ─── Main Export ─────────────────────────────────────────────────────────────

export function createNPCSystem(state) {
  ensureSubscriptions(state);

  return {
    update(dt) {
      state.elapsedGameTime += dt;

      // Cascade checks
      checkCascades(state);

      // Election clock
      updateElectionCycle(state, dt);

      // Faction FSMs
      updateFactions(state, dt);

      // Per-rival FSM
      for (const rival of state.rivals) {
        driftTraits(rival, dt);
        updateEmotionalFSM(rival, state, dt);

        // Execute behaviour based on current emotion
        switch (rival.emotionalState) {
          case EMOTION.AGGRESSIVE:    executeAggressive(rival, state, dt);    break;
          case EMOTION.OPPORTUNISTIC: executeOpportunistic(rival, state, dt); break;
          case EMOTION.TRIUMPHANT:    executeTriumphant(rival, state, dt);    break;
          // Other states (CALCULATING, WITHDRAWN, etc.) handle themselves inside the FSM
        }

        // Sabotage timer resolution
        if (state.sabotage) {
          for (const [key, val] of Object.entries(state.sabotage)) {
            val.timer -= dt;
            if (val.timer <= 0) delete state.sabotage[key];
          }
        }

        // Hard cap rival stats
        rival.power   = clamp(rival.power,   0, 120);
        rival.approval = clamp(rival.approval, 0, 100);
      }
    }
  };
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }