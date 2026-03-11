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
import { bindPlacementInput } from './systems/input.js';
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
  createPlayerMarker(scene, shadows);


  // 🏗️ Pre-load all 3D assets before enabling the game
  setMessage('Initializing asset pipeline...');
  await initAssetLoader(scene);
  setMessage('Low-poly assets ready.');
  let nationRuntime = null;
  function buildNation(){ nationRuntime = createNationWorld(scene, shadows, state); updateHUD(state); setMessage(`${state.nations[state.currentNationIndex].name} loaded.`); saveGame(state); }
  bindPlacementInput(scene, state, ({type, point})=>{ const mesh = spawnInstitution(scene, shadows, type, point, state); if(mesh){ setMessage(`${capitalize(type)} placed.`); playConstruction(); saveGame(state); } });
  const timeSystem=createTimeSystem(scene,sun,hemi,moonLight,skyController);
  const npcSystem=createNPCSystem(state);
  const checkpoints = startAutoCheckpoints(state);
  initHUD(state, async (action)=>{ const result=performAction(state, action); if(result==='save'){ await saveGame(state); } else if(result==='load'){ const ok = await loadGame(state); if(ok){ buildNation(); } } updateHUD(state); }, (a)=>handleCameraAction(camera,a));
  initSetupOverlay(state, ()=>{ initAudio(); buildNation(); });
  setMessage('Build your base. Legitimacy comes before mobility, and mobility comes before power.');
  window.addEventListener('resumeGame', () => state.gamePaused = false);
  let last=performance.now();
  engine.runRenderLoop(()=>{
    const now=performance.now();
    const dt=Math.min(.05,(now-last)*.001);
    last=now;
    if (!state.gamePaused) {
      stepRapier(world, dt);
      runEconomyTick(state, dt);
      runPoliticalTick(state, dt);
      npcSystem.update(dt);
      checkpoints.update(dt);
      updatePhysicsInteractions(state, dt);
      updateCareer(state, dt);
      updateMedia(state, dt);
      if(state.pendingWorldReload){ buildNation(); state.pendingWorldReload=false; }
      if(nationRuntime) nationRuntime.update(dt, now*.001);
      timeSystem.update();
      updateHUD(state);
    }
    scene.render();
  });
}
function createPlayerMarker(scene, shadows){ const marker=MeshBuilder.CreateCylinder('playerHQ',{diameterTop:7,diameterBottom:9,height:10,tessellation:12},scene); marker.position=new Vector3(0,5,24); const mat=new StandardMaterial('playerHQMat',scene); mat.diffuseColor=new Color3(.6,.58,.54); marker.material=mat; marker.receiveShadows=true; shadows.addShadowCaster(marker); }
function handleCameraAction(camera, action){ if(action==='left') camera.alpha -= .14; else if(action==='right') camera.alpha += .14; else if(action==='zoomIn') camera.radius = Math.max(camera.lowerRadiusLimit, camera.radius - 18); else if(action==='zoomOut') camera.radius = Math.min(camera.upperRadiusLimit, camera.radius + 18); }
function capitalize(v){ return v.charAt(0).toUpperCase() + v.slice(1); }
bootstrap().catch((err)=>{ console.error(err); const box=document.getElementById('messageBox'); if(box) box.textContent=`Boot failed: ${err.message}`; document.body.style.background='#111'; });