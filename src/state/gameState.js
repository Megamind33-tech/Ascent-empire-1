import { CONFIG } from '../config.js';
export function createGameState() {
  return {
    playerName: 'Player', startDistrict: 'capital-core', cash: 20000, approval: 50, influence: 0, officeIndex: 0, population: 1000, food: 100, steel: 50, fuel: 60, research: 0, sportsPrestige: 0,
    legitimacy: 12, corruption: 8, security: 20, education: 12, diplomaticAccess: 0,
    passportLevel: 'none', currentNationIndex: 0, unlockedTravel: [0], selectionMode: null, pendingTravelIndex: null, pendingWorldReload: false,
    electionTimer: 300, gameStatus: 'playing', gamePaused: false,
    // 🧬 Political Persistence
    enactedLaws: [], // Array of { id, timestamp, expiresAt }
    activeModifiers: { cashDelta: 0, approvalDelta: 0, legitimacyDelta: 0, corruptionDelta: 0, securityDelta: 0 },
    nextOfficeGoal: null, // Tracks current target office for progression

    // 📣 Media & Sentiment
    mediaSentiment: 50, // 0 (Hostile) to 100 (State-Controlled Supportive)
    activeHeadlines: [], // { text, type, timestamp }
    mediaHouses: [
      { id: 'VOICE_PEOPLE', name: 'The Voice of the People', bias: -0.8, reach: 0.45, owned: false, cost: 25000, description: 'Aggressive populist radio. Usually critical of the elite.' },
      { id: 'CAPITAL_GAZETTE', name: 'Capital Gazette', bias: 0.2, reach: 0.6, owned: false, cost: 45000, description: 'The establishment paper. Prefers stability and growth.' },
      { id: 'SHADOW_NEWS', name: 'Shadow News Network', bias: -0.4, reach: 0.35, owned: false, cost: 30000, description: 'Web-based outlet focused on conspiracies and scandals.' }
    ],
    
    buildings: { housing:8, schools:1, stores:2, police:1, acc:0, dec:0, mines:0, refineries:0, barracks:0, bases:0, stadiums:0 },
    nations: CONFIG.nations.map((entry, i) => ({ name:entry.name, coastal:entry.coastal, seed:entry.seed, relation:i===0?30:Math.round(Math.random()*30)-5, allied:false, hostile:false, openToPassport:entry.coastal||i<4, openToDiplomatic:true, visits:i===0?1:0 })),
    rivals: [
      {
        name:'M. Dacosta', archetype:'populist', power:14, approval:42,
        // Emotional FSM
        emotionalState:'IDLE', emotionalTimer:0, emotionalInertia:8,
        // Personality traits (0–1, fixed at game start, minor drift over time)
        traits:{ aggression:0.82, patience:0.20, greed:0.55, paranoia:0.50, loyalty:0.35, adaptability:0.70 },
        // Relationships: –100 (enemy) to +100 (ally)
        relationships:{ player:0, party:10, cartel:-5, mafia:-10 },
        // Memory: ring buffer of last 6 significant events
        memory:[],
        // Hidden objective — only revealed when player has enough ACC/DEC buildings
        hiddenObjective:{ type:'control_district', target:'harbor-district', revealed:false },
        // Cooldowns to prevent spamming actions
        actionCooldown:0,
        // Secret power boost accrued invisibly when in CALCULATING state
        shadowPower:0,
      },
      {
        name:'R. Kunda', archetype:'establishment', power:18, approval:48,
        emotionalState:'IDLE', emotionalTimer:0, emotionalInertia:14,
        traits:{ aggression:0.40, patience:0.75, greed:0.80, paranoia:0.35, loyalty:0.60, adaptability:0.45 },
        relationships:{ player:5, party:35, cartel:10, mafia:-20 },
        memory:[],
        hiddenObjective:{ type:'monopolize_resource', target:'mine', revealed:false },
        actionCooldown:0,
        shadowPower:0,
      },
      {
        name:'E. Maro', archetype:'shadow-financed', power:22, approval:39,
        emotionalState:'IDLE', emotionalTimer:0, emotionalInertia:6,
        traits:{ aggression:0.65, patience:0.45, greed:0.90, paranoia:0.80, loyalty:0.15, adaptability:0.85 },
        relationships:{ player:-10, party:-5, cartel:40, mafia:30 },
        memory:[],
        hiddenObjective:{ type:'install_corruption', target:'acc', revealed:false },
        actionCooldown:0,
        shadowPower:0,
      },
    ],
    // Factions are now independent FSM actors, not just pressure numbers
    factions:{
      partySupport:15, cartelPressure:12, mafiaPressure:8,
      cartel:{ state:'WATCHING', timer:0, dealActive:false, dealType:null, power:12 },
      mafia:{ state:'WATCHING', timer:0, dealActive:false, dealType:null, power:8 },
    },
    // Global event flags readable by all systems
    activeEvents: [],
    elapsedGameTime: 0, // seconds of real play time, drives election cycles
    worldRefs: { scene:null, engine:null, camera:null, rapier:null, rapierWorld:null, traffic:[], agents:[], worldMeshes:[], cleanupFns:[], constructionAnchors:[] }
  };
}