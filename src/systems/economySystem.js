import { CONFIG } from '../config.js';
import { setMessage } from '../ui/hud.js';
import { extinguishMesh } from './physicsInteractionSystem.js';
import { openDecision } from '../ui/decisionModal.js';
import { enactLaw } from './careerSystem.js';
import { openGazette, openCareerPortal } from '../ui/gazetteCareerUI.js';
import { openPressRoom } from './mediaSystem.js';
export function runEconomyTick(state, dt){
  const taxBase = (state.buildings.housing*2.2 + state.buildings.stores*4 + state.buildings.mines*3.5 + state.buildings.refineries*6);
  const upkeep = (state.buildings.police*.75 + (state.buildings.acc+state.buildings.dec)*.9 + state.buildings.bases*1.8 + state.buildings.barracks*.9);
  
  // Apply base economy (law modifiers are applied separately in careerSystem._applyLawModifiers)
  state.cash += taxBase * dt;
  state.cash -= upkeep * dt;
  
  state.research += (state.buildings.schools*.12 + state.buildings.stadiums*.05) * dt;
  state.population += state.buildings.housing*.15*dt;
  state.steel += state.buildings.mines*.08*dt;
  state.fuel += state.buildings.refineries*.12*dt;
  state.food -= Math.max(.03, state.population*.00004) * dt;
  
  if(state.food<20) state.approval -= .08*dt;
  if(state.food<=0){ state.food=0; state.approval -= .2*dt; }
  
  state.approval += (state.buildings.schools*.01 + state.buildings.stadiums*.02)*dt;
  state.approval = clamp(state.approval,0,100);
  
  upgradePassport(state);
  // Career/Office handled by careerSystem now
}
export function performAction(state, action){ const c = CONFIG.economy; const placements = { buildHousing:['housing', c.housingCost], buildSchool:['school', c.schoolCost], buildStore:['store', c.storeCost], buildPolice:['police', c.policeCost], buildACC:['acc', c.accCost], buildDEC:['dec', c.decCost], buildMine:['mine', c.mineCost], buildRefinery:['refinery', c.refineryCost], buildBarracks:['barracks', c.barracksCost], buildBase:['base', c.baseCost], buildStadium:['stadium', c.stadiumCost] }; if(action==='save') return 'save'; if(action==='load') return 'load'; if(action==='extinguish'){ const burning = state.worldRefs.worldMeshes.find(m => m?.metadata?.onFire); if(!burning) return fail('No active fires detected.'); if(!spend(state, 800)) return fail('Not enough cash to deploy firefighters. (Cost: $800)'); extinguishMesh(burning); return ok('🚒 Firefighters dispatched. Fire suppressed.'); } if(placements[action]){ const [mode,cost]=placements[action]; if(!spend(state,cost)) return fail('Not enough cash.'); state.selectionMode = mode; return ok('Tap a valid build pad to place it.'); } if(action==='research'){ if(!spend(state,c.researchCost)) return fail('Not enough cash to fund research.'); state.research += 8; state.influence += 1.5; state.legitimacy += 1; return ok('Research funded.'); } if(action==='campaign'){ if(!spend(state,c.campaignCost)) return fail('Not enough cash to campaign.'); state.influence += 6; state.approval += 2; return ok('Campaign launched.'); } if(action==='travel'){ return travelToNextNation(state); }
  
  if(action==='legislation' || action==='parliament') {
    const availableLaws = CONFIG.laws.filter(l => !state.enactedLaws.includes(l.id));
    if (availableLaws.length === 0) return fail('No further laws can be passed at this stage.');
    
    openDecision(state, {
      title: 'NATIONAL PARLIAMENT',
      description: 'Your legislative agenda for the next quarter. Enacting laws costs capital and shapes the soul of the nation.',
      options: availableLaws.map(law => ({
        label: law.title,
        consequenceText: `${law.desc} (Cost: $${law.cost.toLocaleString()})`,
        action: (gs) => enactLaw(gs, law.id)
      })).concat([{ label: "Close Agenda", consequenceText: "Maybe later.", action: () => {} }])
    });
    return true;
  }

  if (action === 'gazette') {
    openGazette(state);
    return true;
  }

  if (action === 'career') {
    openCareerPortal(state);
    return true;
  }

  if (action === 'press') {
    openPressRoom(state);
    return true;
  }

  return null; 
}
function travelToNextNation(state){ if(state.passportLevel==='none') return fail('You cannot travel yet. Build legitimacy and influence first.'); const accessible = state.nations.map((n,i)=>({...n,index:i})).filter((n)=>n.index!==state.currentNationIndex).filter((n)=> state.passportLevel==='diplomatic' ? n.openToDiplomatic : n.openToPassport); if(!accessible.length) return fail('No foreign destination is currently open.'); const current = accessible.findIndex((n)=>n.index===state.pendingTravelIndex); const target = accessible[(current+1)%accessible.length]; state.pendingTravelIndex = target.index; state.currentNationIndex = target.index; state.pendingWorldReload = true; state.nations[target.index].visits += 1; state.influence += state.passportLevel==='diplomatic' ? 3 : 1.5; state.diplomaticAccess += state.passportLevel==='diplomatic' ? 3 : 1; return ok(`Travel prepared for ${target.name}.`); }
function upgradePassport(state){ if(state.passportLevel==='none' && state.legitimacy>=CONFIG.politics.passportThreshold && state.influence>=10){ state.passportLevel='standard'; setMessage('You are now recognized enough to obtain a passport.'); } if(state.passportLevel!=='diplomatic' && state.legitimacy>=CONFIG.politics.diplomaticPassportThreshold && state.officeIndex>=3){ state.passportLevel='diplomatic'; setMessage('Diplomatic passport unlocked.'); }}
function upgradeOffice(state){ /* Integrated into careerSystem.js for higher integrity */ }
function spend(state, amount){ if(state.cash<amount) return false; state.cash -= amount; return true; }
function ok(text){ setMessage(text); return true; }
function fail(text){ setMessage(text); return false; }
function clamp(v,min,max){ return Math.max(min, Math.min(max, v)); }