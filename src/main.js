import '@babylonjs/loaders';
import { Color3, MeshBuilder, StandardMaterial, Vector3 } from '@babylonjs/core';
import { createGameState } from './state/gameState.js';
import { initHUD, setMessage, updateHUD } from './ui/hud.js';
import { createScene } from './world/createScene.js';
import { createNationWorld } from './world/createNationWorld.js';
import { spawnInstitution } from './world/createInstitutions.js';
import { createRapierWorld, createFixedBox, stepRapier } from './systems/rapierWorld.js';
import { createTimeSystem } from './systems/timeSystem.js';
import { createNPCSystem } from './systems/npcSystem.js';
import { runPoliticalTick } from './systems/politicalSystem.js';
import { runEconomyTick, performAction } from './systems/economySystem.js';
import { bindPlacementInput, updateCameraNavigation } from './systems/input.js';
import { initSetupOverlay } from './systems/setupSystem.js';
import { saveGame, loadGame, startAutoCheckpoints } from './systems/saveSystem.js';
import { subscribeInteractions, updatePhysicsInteractions, igniteMesh } from './systems/physicsInteractionSystem.js';
import { initMobileControls } from './systems/mobileControls.js';
import { initAudio, subscribeAudioEvents, playConstruction } from './systems/audioSystem.js';
import { initDecisionHooks } from './ui/decisionModal.js';
import { updateCareer } from './systems/careerSystem.js';
import { initAssetLoader } from './systems/assetLoader.js';
import { initOverlayClosers } from './ui/gazetteCareerUI.js';
import { initMediaSystem, updateMedia } from './systems/mediaSystem.js';
import { initLedgerUI } from './ui/EconomicLedger.js';
import { runEventTick } from './systems/eventSystem.js';



async function bootstrap(){
  const canvas=document.getElementById('renderCanvas');
  const state=createGameState();
  const { engine, scene, camera, hemi, sun, moonLight, shadows, skyController } = createScene(canvas);
  state.worldRefs.scene=scene; state.worldRefs.engine=engine; state.worldRefs.camera=camera;
  // 📱 Wire up pinch-to-zoom and two-finger rotation
  initMobileControls(canvas, camera);

  const { RAPIER, world } = await createRapierWorld();
  state.worldRefs.rapier = RAPIER; state.worldRefs.rapierWorld = world;
  createFixedBox(world, RAPIER, {x:0,y:-2,z:0}, {x:900,y:2,z:900});
  // Subscribe interaction observers (fire spread, NPC death events, sabotage ignition)
  subscribeInteractions(state);
  subscribeAudioEvents(state);
  initDecisionHooks(state);
  initOverlayClosers();
  initMediaSystem(state);
  initLedgerUI();
  createPlayerMarker(scene, shadows);


  // 🏗️ Pre-load all 3D assets before enabling the game
  setMessage('Initializing asset pipeline...');
  await initAssetLoader(scene);
  setMessage('Low-poly assets ready.');
  let nationRuntime = null;
  function buildNation(){
    try {
      if (!state.nations || state.currentNationIndex >= state.nations.length) {
        console.error('[BuildNation] Invalid nation index:', state.currentNationIndex);
        setMessage('Error: Invalid nation selection');
        return;
      }

      nationRuntime = createNationWorld(scene, shadows, state);
      updateHUD(state);
      const nationName = state.nations[state.currentNationIndex]?.name || 'Unknown';
      setMessage(`${nationName} loaded.`);
      saveGame(state);
    } catch (err) {
      console.error('[BuildNation] Error building nation world:', err);
      setMessage(`Error loading nation: ${err.message}`);
    }
  }
  bindPlacementInput(scene, state, ({type, point})=>{ const mesh = spawnInstitution(scene, shadows, type, point, state); if(mesh){ setMessage(`${capitalize(type)} placed.`); playConstruction(); saveGame(state); } });
  const timeSystem=createTimeSystem(scene,sun,hemi,moonLight,skyController);
  const npcSystem=createNPCSystem(state);
  const checkpoints = startAutoCheckpoints(state);
  initHUD(state, async (action)=>{
    try {
      if(action.type === 'travel'){
        handleTravel(action.index);
      } else {
        const result=performAction(state, action);
        if(result==='save'){
          const saved = await saveGame(state);
          if (!saved) {
            console.warn('[HUD Action] Save failed');
          }
        }
        else if(result==='load'){
          const ok = await loadGame(state);
          if(ok){
            buildNation();
          } else {
            console.warn('[HUD Action] Load failed');
          }
        }
      }
      updateHUD(state);
    } catch (err) {
      console.error('[HUD Action Handler] Error:', err.message);
      setMessage(`Error: ${err.message}`);
    }
  }, (a)=>handleCameraAction(camera,a));

  function handleTravel(index){
    try {
      // Validate index
      if (index < 0 || index >= state.nations.length) {
        console.error('[Travel] Invalid nation index:', index);
        setMessage('Error: Invalid travel destination');
        return;
      }

      const target = state.nations[index];
      if(!target) {
        console.error('[Travel] Target nation is null');
        setMessage('Error: Travel destination not found');
        return;
      }

      if(index === state.currentNationIndex) {
        setMessage(`Already in ${target.name}`);
        return;
      }

      // Check passport requirements
      const threshold = target.coastal ? 36 : 18; // Example logic: coastal needs higher passport
      const currentLegitimacy = state.legitimacy;

      if(currentLegitimacy < threshold && index !== 0){
        setMessage(`Travel Denied: ${target.name} requires level ${threshold} legitimacy (Passport).`);
        return;
      }

      state.currentNationIndex = index;
      state.pendingWorldReload = true;
      setMessage(`Traveling to ${target.name}...`);
      saveGame(state);
    } catch (err) {
      console.error('[Travel] Error during travel:', err.message);
      setMessage('Error: Travel failed');
    }
  }
  initSetupOverlay(state, ()=>{ initAudio(); buildNation(); });
  setMessage('Build your base. Legitimacy comes before mobility, and mobility comes before power.');
    window.addEventListener('resumeGame', () => state.gamePaused = false);
    
    // Developer tool for forcing events from console
    import('./ui/hud.js').then(({ triggerDebugEvent }) => {
        window.debugEvent = () => triggerDebugEvent(state);
    });

    let last=performance.now();
  engine.runRenderLoop(()=>{
    const now=performance.now();
    const dt=Math.min(.05,(now-last)*.001);
    last=now;
    if (!state.gamePaused) {
      stepRapier(world, dt);
      runEconomyTick(state, dt);
      runPoliticalTick(state, dt);
      
      // Dynamic Events Evaluation
      runEventTick(state, dt);

      npcSystem.update(dt);
      checkpoints.update(dt);
      updatePhysicsInteractions(state, dt);
      updateCareer(state, dt);
      updateMedia(state, dt);
      if(state.pendingWorldReload){ buildNation(); state.pendingWorldReload=false; }
      if(nationRuntime) nationRuntime.update(dt, now*.001);
      timeSystem.update();
      updateHUD(state);
      updateCameraNavigation(camera, dt);
    }
    scene.render();
  });
}
function createPlayerMarker(scene, shadows){ const marker=MeshBuilder.CreateCylinder('playerHQ',{diameterTop:7,diameterBottom:9,height:10,tessellation:12},scene); marker.position=new Vector3(0,5,24); const mat=new StandardMaterial('playerHQMat',scene); mat.diffuseColor=new Color3(.6,.58,.54); marker.material=mat; marker.receiveShadows=true; shadows.addShadowCaster(marker); }
function handleCameraAction(camera, action){ if(action==='left') camera.alpha -= .14; else if(action==='right') camera.alpha += .14; else if(action==='zoomIn') camera.radius = Math.max(camera.lowerRadiusLimit, camera.radius - 18); else if(action==='zoomOut') camera.radius = Math.min(camera.upperRadiusLimit, camera.radius + 18); }
function capitalize(v){ return v.charAt(0).toUpperCase() + v.slice(1); }
bootstrap().catch((err)=>{
  console.error('[Bootstrap] Fatal error:', err);
  const messageBox = document.getElementById('messageBox');
  if(messageBox) {
    messageBox.textContent = `Boot failed: ${err.message || 'Unknown error'}`;
    messageBox.style.color = '#ff3e3e';
    messageBox.style.fontSize = '1rem';
    messageBox.style.padding = '20px';
  }
  document.body.style.background = '#111';
  // Also show in overlay
  const setupOverlay = document.getElementById('setupOverlay');
  if(setupOverlay) {
    setupOverlay.style.display = 'flex';
    setupOverlay.innerHTML = `
      <div class="modal-content" style="max-width: 600px; height: auto; margin: auto;">
        <div class="modal-header" style="border-color: #ff3e3e;"><h2 style="color: #ff3e3e;">BOOT ERROR</h2></div>
        <div class="modal-body" style="grid-template-columns: 1fr; padding: 30px;">
          <p style="color: #ff3e3e; font-weight: bold; margin-bottom: 20px;">Fatal error during initialization:</p>
          <pre style="color: #fff; background: rgba(0,0,0,0.5); padding: 15px; border-radius: 4px; overflow-x: auto;">${err.message || 'Unknown error'}\n\n${err.stack || ''}</pre>
          <p style="color: #999; margin-top: 20px; font-size: 0.8rem;">Please check the browser console (F12) for more details.</p>
        </div>
      </div>
    `;
  }
});