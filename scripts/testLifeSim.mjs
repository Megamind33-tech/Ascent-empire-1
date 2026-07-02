// Lightweight assertion-based tests for the political life-sim model.
// Run with: node scripts/testLifeSim.mjs
import {
  createPoliticalLifeSim,
  RANKS,
  DAILY_ACTIONS,
  OFFICE_REQUIREMENTS
} from '../src/prototype/politicalLifeSim.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed += 1;
    console.log(`  \u2713 ${message}`);
  } else {
    failed += 1;
    console.error(`  \u2717 ${message}`);
  }
}

// Deterministic RNG so tests are stable.
function seededRng(seed) {
  let s = seed >>> 0;
  return function () {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

console.log('Test: initial state');
{
  const sim = createPoliticalLifeSim({ rng: seededRng(1) });
  assert(sim.state.player.rankIndex === 0, 'player starts as a Citizen (rank 0)');
  assert(RANKS[sim.state.player.rankIndex].title === 'Citizen', 'rank 0 is titled Citizen');
  assert(sim.state.player.energy === 3, 'player starts with 3 action points');
  assert(sim.state.status === 'playing', 'status starts as playing');
  assert(sim.state.nations.length === 5, 'five neighbor nations exist');
}

console.log('Test: daily action consumes energy and changes stats');
{
  const sim = createPoliticalLifeSim({ rng: seededRng(2) });
  const startFunds = sim.state.player.funds;
  sim.doAction('work');
  assert(sim.state.player.energy === 2, 'work consumes one action point');
  assert(sim.state.player.funds > startFunds, 'work increases funds');
}

console.log('Test: rest ends the day and refills energy');
{
  const sim = createPoliticalLifeSim({ rng: seededRng(3) });
  const day = sim.state.player.day;
  sim.doAction('work');
  sim.doAction('rest');
  // A random daily event may pause the game; resolve it if present.
  if (sim.state.pendingChoice) sim.resolveChoice(sim.state.pendingChoice.options[0].id);
  assert(sim.state.player.day === day + 1, 'rest advances to the next day');
  assert(sim.state.player.energy === 3, 'energy refills at the start of a new day');
}

console.log('Test: investments cost funds and pay income overnight');
{
  const sim = createPoliticalLifeSim({ rng: seededRng(4) });
  sim.state.player.funds = 1000;
  const bought = sim.buyInvestment('shop');
  assert(bought === true, 'can buy an affordable investment');
  assert(sim.state.player.funds === 700, 'investment deducts its cost');
  const beforeIncome = sim.state.player.funds;
  sim.advanceDay();
  if (sim.state.pendingChoice) sim.resolveChoice(sim.state.pendingChoice.options[0].id);
  assert(sim.state.player.funds > beforeIncome, 'owned investment pays income overnight');
}

console.log('Test: syndicate deal trades integrity for cash');
{
  const sim = createPoliticalLifeSim({ rng: seededRng(5) });
  const integrity = sim.state.player.integrity;
  const funds = sim.state.player.funds;
  sim.doAction('deal');
  assert(sim.state.player.funds > funds, 'syndicate deal grants cash');
  assert(sim.state.player.integrity < integrity, 'syndicate deal lowers integrity');
  assert(sim.state.factions.syndicate > -10, 'syndicate standing improves');
}

console.log('Test: cannot run for office without meeting requirements');
{
  const sim = createPoliticalLifeSim({ rng: seededRng(6) });
  assert(sim.canRunForOffice() === false, 'a fresh citizen cannot yet run for office');
}

console.log('Test: meeting requirements enables a winnable election and promotion');
{
  const sim = createPoliticalLifeSim({ rng: seededRng(7) });
  const req = OFFICE_REQUIREMENTS[1];
  // Give the player strong stats so the election is winnable.
  sim.state.player.reputation = 90;
  sim.state.player.influence = 90;
  sim.state.player.funds = req.funds + 5000;
  sim.state.factions.progressive = 80;
  assert(sim.canRunForOffice() === true, 'qualified player can run for office');
  const result = sim.runForOffice();
  assert(result !== null, 'running for office returns a result');
  assert(result.won === true, 'a dominant candidate wins the election');
  assert(sim.state.player.rankIndex === 1, 'winning promotes the player to the next rank');
  assert(RANKS[sim.state.player.rankIndex].title === 'Community Organizer', 'first promotion is Community Organizer');
}

console.log('Test: reaching the top rank wins the game');
{
  const sim = createPoliticalLifeSim({ rng: seededRng(8) });
  sim.state.player.rankIndex = RANKS.length - 2; // one below President
  sim.state.player.reputation = 100;
  sim.state.player.influence = 100;
  sim.state.player.funds = 100000;
  sim.state.factions.progressive = 100;
  sim.state.factions.populist = 100;
  sim.state.relationships.find((r) => r.id === 'mentor').affinity = 100;
  let result = null;
  for (let i = 0; i < 40 && sim.state.status === 'playing'; i += 1) {
    if (sim.canRunForOffice()) {
      result = sim.runForOffice();
      if (result && !result.won) {
        sim.state.player.funds = 100000; // keep funds topped up for retries
      }
    } else {
      break;
    }
  }
  assert(sim.state.status === 'won', 'winning the presidency sets status to won');
}

console.log('Test: serialize/hydrate round-trip');
{
  const sim = createPoliticalLifeSim({ rng: seededRng(9) });
  sim.doAction('work');
  sim.buyInvestment('shop');
  const snapshot = sim.serialize();
  const restored = createPoliticalLifeSim({ rng: seededRng(9) });
  const ok = restored.hydrate(snapshot);
  assert(ok === true, 'hydrate accepts a serialized snapshot');
  assert(restored.state.player.funds === sim.state.player.funds, 'funds survive a round-trip');
  assert(
    restored.state.investments.find((i) => i.id === 'shop').owned === true,
    'owned investments survive a round-trip'
  );
}

console.log('Test: every daily action is well-formed');
{
  assert(DAILY_ACTIONS.every((a) => typeof a.apply === 'function'), 'all actions expose an apply()');
  assert(DAILY_ACTIONS.some((a) => a.endsDay), 'at least one action ends the day');
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
