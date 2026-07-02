// Political Life-Sim model for the Ascent Realms 2D canvas prototype.
//
// This module is intentionally free of any DOM/browser globals so it can be
// unit-tested under Node and reused by the canvas renderer. It models the
// core vision loop: a player begins as an ordinary citizen ("Nobody") and,
// through daily choices, relationships, faction standing, investments and
// elections, either climbs to the Presidency or loses.

export const RANKS = Object.freeze([
  { title: 'Citizen', short: 'Citizen' },
  { title: 'Community Organizer', short: 'Organizer' },
  { title: 'City Councilor', short: 'Councilor' },
  { title: 'Mayor', short: 'Mayor' },
  { title: 'Member of Parliament', short: 'MP' },
  { title: 'Governor', short: 'Governor' },
  { title: 'President', short: 'President' }
]);

// Requirement to *run* for the office at the given index (index 0 is the
// starting office and has no election). Costs are personal campaign funds.
export const OFFICE_REQUIREMENTS = Object.freeze([
  null,
  { reputation: 15, influence: 8, funds: 200, opponent: 18 },
  { reputation: 28, influence: 20, funds: 700, opponent: 32 },
  { reputation: 42, influence: 34, funds: 2200, opponent: 46 },
  { reputation: 56, influence: 50, funds: 6000, opponent: 60 },
  { reputation: 70, influence: 68, funds: 16000, opponent: 74 },
  { reputation: 85, influence: 88, funds: 42000, opponent: 88 }
]);

export const FACTIONS = Object.freeze([
  { id: 'progressive', name: 'Progressive Party', kind: 'party', color: '#3fa7ff' },
  { id: 'traditionalist', name: 'Traditionalist Party', kind: 'party', color: '#e0a13f' },
  { id: 'populist', name: 'Populist Movement', kind: 'party', color: '#d1553f' },
  { id: 'faith', name: 'Faith Assembly', kind: 'religion', color: '#c9b45f' },
  { id: 'syndicate', name: 'The Syndicate', kind: 'gang', color: '#9a5fd1' }
]);

// Named NPC cast: allies, enemies and power brokers the player courts.
function defaultRelationships() {
  return [
    { id: 'mentor', name: 'Ada Nomvula', role: 'Mentor & Ally', factionId: 'progressive', affinity: 35 },
    { id: 'rival', name: 'Marcus Dacosta', role: 'Political Rival', factionId: 'traditionalist', affinity: -30 },
    { id: 'boss', name: 'Chief Whip Osei', role: 'Party Power Broker', factionId: 'populist', affinity: 0 },
    { id: 'cleric', name: 'Elder Ruth Amara', role: 'Faith Leader', factionId: 'faith', affinity: 10 },
    { id: 'don', name: 'Vincent Kola', role: 'Syndicate Boss', factionId: 'syndicate', affinity: -5 },
    { id: 'press', name: 'Lena Fisher', role: 'Investigative Journalist', factionId: null, affinity: 5 }
  ];
}

export const NATION_NAMES = Object.freeze(['Zambria', 'Kitala', 'Nembia', 'Karumo', 'Tazeko']);

export const INVESTMENTS = Object.freeze([
  { id: 'shop', name: 'Corner Shop', cost: 300, income: 22, influence: 1, faction: null },
  { id: 'paper', name: 'Local Newspaper', cost: 1500, income: 60, influence: 4, faction: 'progressive' },
  { id: 'firm', name: 'Construction Firm', cost: 5200, income: 210, influence: 6, faction: 'traditionalist' },
  { id: 'radio', name: 'Radio Station', cost: 12000, income: 420, influence: 10, faction: 'populist' },
  { id: 'estate', name: 'Real-Estate Portfolio', cost: 30000, income: 1100, influence: 16, faction: null }
]);

// Daily actions. Each consumes one action point (except Rest, which ends the
// day). `apply` mutates the sim in place and returns a short outcome string.
export const DAILY_ACTIONS = Object.freeze([
  {
    id: 'work',
    label: 'Work a Day Job',
    hint: 'Earn steady money and a little respect.',
    apply(sim, rng) {
      const pay = 60 + Math.round(rng() * 40) + sim.player.rankIndex * 25;
      sim.player.funds += pay;
      adjust(sim.player, 'reputation', 1);
      return `You worked hard and earned $${pay}.`;
    }
  },
  {
    id: 'campaign',
    label: 'Campaign & Canvass',
    hint: 'Spend money to grow reputation and influence. Boosted by allies.',
    cost: 40,
    apply(sim, rng) {
      if (sim.player.funds < 40) return "You can't afford campaign materials right now.";
      sim.player.funds -= 40;
      const allyBoost = Math.max(0, relationship(sim, 'mentor').affinity) * 0.04;
      const rep = 3 + Math.round(rng() * 3) + allyBoost;
      const inf = 2 + Math.round(rng() * 2) + allyBoost * 0.5;
      adjust(sim.player, 'reputation', rep);
      adjust(sim.player, 'influence', inf);
      return `Canvassing paid off: +${rep.toFixed(0)} reputation, +${inf.toFixed(0)} influence.`;
    }
  },
  {
    id: 'rally',
    label: 'Hold a Public Rally',
    hint: 'A big speech. Pleases your party, may anger opponents.',
    cost: 120,
    apply(sim, rng) {
      if (sim.player.funds < 120) return 'A rally needs at least $120 in logistics.';
      sim.player.funds -= 120;
      adjust(sim.player, 'reputation', 5 + rng() * 4);
      adjust(sim.player, 'influence', 4 + rng() * 3);
      const party = sim.party || 'populist';
      shiftFaction(sim, party, 6);
      shiftFaction(sim, party === 'traditionalist' ? 'progressive' : 'traditionalist', -3);
      adjustRelationship(sim, 'rival', -4);
      return 'Thousands attend your rally. Your movement surges.';
    }
  },
  {
    id: 'network',
    label: 'Network with a Power Broker',
    hint: 'Build a relationship with a chosen faction leader.',
    needsTarget: 'relationship',
    apply(sim, rng, targetId) {
      const rel = relationship(sim, targetId) || relationship(sim, 'boss');
      adjustRelationship(sim, rel.id, 8 + Math.round(rng() * 6));
      adjust(sim.player, 'influence', 2);
      if (rel.factionId) shiftFaction(sim, rel.factionId, 5);
      return `You strengthened ties with ${rel.name}.`;
    }
  },
  {
    id: 'service',
    label: 'Community Service',
    hint: 'Volunteer. Raises reputation, integrity and Faith standing.',
    apply(sim, rng) {
      adjust(sim.player, 'reputation', 3 + rng() * 2);
      adjust(sim.player, 'integrity', 4);
      shiftFaction(sim, 'faith', 7);
      adjustRelationship(sim, 'cleric', 6);
      return 'Your community service earns goodwill and moral credit.';
    }
  },
  {
    id: 'deal',
    label: 'Cut a Deal with the Syndicate',
    hint: 'Fast cash and influence, but corrupts you and risks scandal.',
    apply(sim, rng) {
      const cash = 800 + Math.round(rng() * 1200) + sim.player.rankIndex * 400;
      sim.player.funds += cash;
      adjust(sim.player, 'influence', 6);
      adjust(sim.player, 'integrity', -14);
      shiftFaction(sim, 'syndicate', 12);
      shiftFaction(sim, 'faith', -8);
      adjustRelationship(sim, 'don', 10);
      adjustRelationship(sim, 'press', -6);
      sim.heat = (sim.heat || 0) + 1;
      return `The Syndicate slips you $${cash}. Dangerous friends, dangerous debts.`;
    }
  },
  {
    id: 'diplomacy',
    label: 'Meet a Neighbor Nation',
    hint: 'Improve relations abroad and gain statesman influence.',
    needsTarget: 'nation',
    apply(sim, rng, targetId) {
      const nation = sim.nations.find((n) => n.name === targetId) || sim.nations[0];
      nation.relation = clamp(nation.relation + 8 + Math.round(rng() * 5), -100, 100);
      adjust(sim.player, 'influence', 3);
      adjust(sim.player, 'reputation', 1);
      return `Diplomatic talks with ${nation.name} go well (relation ${Math.round(nation.relation)}).`;
    }
  },
  {
    id: 'rest',
    label: 'Rest (End the Day)',
    hint: 'Recover and move to the next day.',
    endsDay: true,
    apply() {
      return 'You rest and prepare for tomorrow.';
    }
  }
]);

const RANDOM_EVENTS = [
  {
    id: 'endorsement',
    when: (sim) => sim.player.reputation > 25,
    build: (sim) => ({
      title: 'Endorsement Offer',
      body: `${relationship(sim, 'boss').name} offers a party endorsement — for a favor.`,
      options: [
        { id: 'accept', label: 'Accept the favor', apply: (s) => { adjust(s.player, 'influence', 8); adjust(s.player, 'integrity', -6); adjustRelationship(s, 'boss', 12); return 'Endorsement secured, integrity strained.'; } },
        { id: 'decline', label: 'Stay clean', apply: (s) => { adjust(s.player, 'integrity', 4); adjustRelationship(s, 'boss', -6); return 'You keep your hands clean.'; } }
      ]
    })
  },
  {
    id: 'scandal',
    when: (sim) => sim.player.integrity < 45 || (sim.heat || 0) > 1,
    build: (sim) => ({
      title: 'Brewing Scandal',
      body: `${relationship(sim, 'press').name} is investigating your finances.`,
      options: [
        { id: 'spin', label: 'Spin the story ($500)', apply: (s) => { s.player.funds -= 500; adjust(s.player, 'reputation', -2); s.heat = 0; return 'You spent to bury the story.'; } },
        { id: 'ignore', label: 'Ignore it', apply: (s) => { adjust(s.player, 'reputation', -10); shiftFaction(s, 'faith', -6); return 'The scandal dents your reputation.'; } }
      ]
    })
  },
  {
    id: 'protest',
    when: () => true,
    build: () => ({
      title: 'Street Protest',
      body: 'Citizens march over the cost of living. Your response matters.',
      options: [
        { id: 'support', label: 'March with them', apply: (s) => { adjust(s.player, 'reputation', 6); shiftFaction(s, 'populist', 8); shiftFaction(s, 'traditionalist', -5); return 'The crowd cheers your name.'; } },
        { id: 'crackdown', label: 'Call for order', apply: (s) => { adjust(s.player, 'reputation', -4); shiftFaction(s, 'traditionalist', 8); shiftFaction(s, 'populist', -8); return 'Order restored, but at a cost.'; } }
      ]
    })
  }
];

function adjust(target, key, delta) {
  target[key] = clamp((target[key] || 0) + delta, 0, 100);
}

function shiftFaction(sim, id, delta) {
  if (!(id in sim.factions)) return;
  sim.factions[id] = clamp(sim.factions[id] + delta, -100, 100);
}

function relationship(sim, id) {
  return sim.relationships.find((r) => r.id === id) || null;
}

function adjustRelationship(sim, id, delta) {
  const rel = relationship(sim, id);
  if (rel) rel.affinity = clamp(rel.affinity + delta, -100, 100);
}

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function createPoliticalLifeSim(options = {}) {
  const rng = options.rng || Math.random;

  const sim = {
    version: 1,
    player: {
      name: options.name || 'A. Citizen',
      day: 1,
      rankIndex: 0,
      age: 24,
      funds: 500,
      energy: 3,
      maxEnergy: 3,
      reputation: 8,
      influence: 3,
      integrity: 70
    },
    party: null,
    factions: { progressive: 10, traditionalist: 0, populist: 5, faith: 5, syndicate: -10 },
    relationships: defaultRelationships(),
    nations: NATION_NAMES.map((name, i) => ({ name, relation: 20 - i * 6, coastal: i % 2 === 1 })),
    investments: INVESTMENTS.map((inv) => ({ id: inv.id, owned: false })),
    heat: 0,
    log: ['You are an ordinary citizen with political ambitions. Day 1 begins.'],
    status: 'playing',
    pendingChoice: null,
    lastElection: null
  };

  function pushLog(message) {
    sim.log.unshift(message);
    sim.log = sim.log.slice(0, 8);
  }

  function joinParty(factionId) {
    const faction = FACTIONS.find((f) => f.id === factionId && f.kind === 'party');
    if (!faction) return false;
    sim.party = factionId;
    shiftFaction(sim, factionId, 15);
    pushLog(`You joined the ${faction.name}.`);
    return true;
  }

  function doAction(actionId, targetId) {
    if (sim.status !== 'playing' || sim.pendingChoice) return null;
    const action = DAILY_ACTIONS.find((a) => a.id === actionId);
    if (!action) return null;

    if (!action.endsDay && sim.player.energy <= 0) {
      pushLog('You are out of energy. Rest to begin a new day.');
      return null;
    }

    const outcome = action.apply(sim, rng, targetId);
    if (outcome) pushLog(outcome);

    if (action.endsDay) {
      advanceDay();
    } else {
      sim.player.energy -= 1;
      if (sim.player.energy <= 0) {
        pushLog('The day winds down. Rest to continue.');
      }
    }
    return outcome;
  }

  function advanceDay() {
    // Passive income from owned investments.
    let income = 0;
    for (const owned of sim.investments) {
      if (!owned.owned) continue;
      const def = INVESTMENTS.find((i) => i.id === owned.id);
      income += def.income;
    }
    if (income > 0) {
      sim.player.funds += income;
      pushLog(`Investments earned $${income} overnight.`);
    }

    sim.player.day += 1;
    sim.player.energy = sim.player.maxEnergy;

    // Faction opinion drifts slowly toward neutral.
    for (const id of Object.keys(sim.factions)) {
      sim.factions[id] = clamp(sim.factions[id] * 0.98, -100, 100);
    }

    // Occasional random event that pauses for a choice.
    if (rng() < 0.55) {
      const candidates = RANDOM_EVENTS.filter((e) => e.when(sim));
      if (candidates.length) {
        const chosen = candidates[Math.floor(rng() * candidates.length)];
        sim.pendingChoice = chosen.build(sim);
      }
    }

    checkStatus();
  }

  function resolveChoice(optionId) {
    if (!sim.pendingChoice) return;
    const option = sim.pendingChoice.options.find((o) => o.id === optionId);
    if (option) {
      const msg = option.apply(sim);
      if (msg) pushLog(msg);
    }
    sim.pendingChoice = null;
    checkStatus();
  }

  function buyInvestment(id) {
    const def = INVESTMENTS.find((i) => i.id === id);
    const owned = sim.investments.find((i) => i.id === id);
    if (!def || !owned || owned.owned) return false;
    if (sim.player.funds < def.cost) {
      pushLog(`You need $${def.cost} to buy ${def.name}.`);
      return false;
    }
    sim.player.funds -= def.cost;
    owned.owned = true;
    adjust(sim.player, 'influence', def.influence);
    if (def.faction) shiftFaction(sim, def.faction, 6);
    pushLog(`You acquired ${def.name}. It will pay $${def.income}/day.`);
    return true;
  }

  function nextOffice() {
    return sim.player.rankIndex + 1 < RANKS.length ? sim.player.rankIndex + 1 : null;
  }

  function officeRequirement() {
    const idx = nextOffice();
    return idx == null ? null : OFFICE_REQUIREMENTS[idx];
  }

  function canRunForOffice() {
    const req = officeRequirement();
    if (!req || sim.status !== 'playing' || sim.pendingChoice) return false;
    return (
      sim.player.reputation >= req.reputation &&
      sim.player.influence >= req.influence &&
      sim.player.funds >= req.funds
    );
  }

  function endorsementScore() {
    // Supportive factions (standing > 25) lend campaign weight; the player's
    // own party counts double.
    let score = 0;
    for (const f of FACTIONS) {
      const standing = sim.factions[f.id];
      if (standing > 25) score += (standing - 25) * (sim.party === f.id ? 0.5 : 0.25);
    }
    return score;
  }

  function runForOffice() {
    const idx = nextOffice();
    const req = officeRequirement();
    if (idx == null || !req || !canRunForOffice()) return null;

    sim.player.funds -= req.funds;

    const allyBonus = Math.max(0, relationship(sim, 'mentor').affinity) * 0.3;
    const rivalPenalty = Math.max(0, -relationship(sim, 'rival').affinity) * 0.25;
    const integrityMod = (sim.player.integrity - 50) * 0.15;

    const playerScore =
      sim.player.reputation +
      sim.player.influence +
      endorsementScore() +
      allyBonus -
      rivalPenalty +
      integrityMod +
      rng() * 20;

    const opponentScore = req.opponent + rng() * 20;
    const won = playerScore >= opponentScore;

    const result = {
      office: RANKS[idx].title,
      playerScore: Math.round(playerScore),
      opponentScore: Math.round(opponentScore),
      won
    };
    sim.lastElection = result;

    if (won) {
      sim.player.rankIndex = idx;
      adjust(sim.player, 'reputation', 6);
      adjust(sim.player, 'influence', 6);
      pushLog(`ELECTION WON! You are now ${RANKS[idx].title}.`);
      // Rivals get more formidable as you climb.
      adjustRelationship(sim, 'rival', -6);
    } else {
      adjust(sim.player, 'reputation', -15);
      pushLog(`Election lost. ${RANKS[idx].title} slips away — for now.`);
    }

    checkStatus();
    return result;
  }

  function checkStatus() {
    if (sim.player.rankIndex >= RANKS.length - 1) {
      sim.status = 'won';
      pushLog('You have become PRESIDENT. Your ascent is complete.');
    } else if (sim.player.funds < -2000 && sim.player.reputation < 8) {
      sim.status = 'lost';
      pushLog('Bankrupt and discredited, your political life ends here.');
    }
  }

  function serialize() {
    return JSON.stringify({
      player: sim.player,
      party: sim.party,
      factions: sim.factions,
      relationships: sim.relationships,
      nations: sim.nations,
      investments: sim.investments,
      heat: sim.heat,
      log: sim.log,
      status: sim.status,
      lastElection: sim.lastElection
    });
  }

  function hydrate(raw) {
    try {
      const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (!data || !data.player) return false;
      Object.assign(sim.player, data.player);
      sim.party = data.party ?? null;
      if (data.factions) Object.assign(sim.factions, data.factions);
      if (Array.isArray(data.relationships)) sim.relationships = data.relationships;
      if (Array.isArray(data.nations)) sim.nations = data.nations;
      if (Array.isArray(data.investments)) sim.investments = data.investments;
      sim.heat = data.heat || 0;
      if (Array.isArray(data.log)) sim.log = data.log;
      sim.status = data.status || 'playing';
      sim.lastElection = data.lastElection || null;
      return true;
    } catch {
      return false;
    }
  }

  return {
    state: sim,
    joinParty,
    doAction,
    advanceDay,
    resolveChoice,
    buyInvestment,
    canRunForOffice,
    officeRequirement,
    nextOffice,
    endorsementScore,
    runForOffice,
    serialize,
    hydrate
  };
}
