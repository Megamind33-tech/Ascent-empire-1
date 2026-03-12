import '@babylonjs/loaders';
import { Color3, Engine, MeshBuilder, StandardMaterial, Vector3 } from '@babylonjs/core';
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
import { subscribeInteractions, updatePhysicsInteractions } from './systems/physicsInteractionSystem.js';
import { initMobileControls } from './systems/mobileControls.js';
import { initAudio, subscribeAudioEvents, playConstruction } from './systems/audioSystem.js';
import { initDecisionHooks } from './ui/decisionModal.js';
import { updateCareer } from './systems/careerSystem.js';
import { initAssetLoader } from './systems/assetLoader.js';
import { initOverlayClosers } from './ui/gazetteCareerUI.js';
import { initMediaSystem, updateMedia } from './systems/mediaSystem.js';
import { initLedgerUI } from './ui/EconomicLedger.js';
import { runEventTick } from './systems/eventSystem.js';
import { createBootFlow, BOOT_STATES } from './boot/bootFlow.js';
import { mountCompatibilityMode } from './compatibility/compatibilityMode.js';

async function bootstrap(){
  const canvas=document.getElementById('renderCanvas');
  if (!canvas) {
    throw new Error('Render canvas element not found in DOM');
  }

  const bootFlow = createBootFlow({
    onRetry3D: () => window.location.reload(),
    onCompatibilityMode: () => {
      bootFlow.setState(BOOT_STATES.compatibility_mode, {
        detail: 'Running strategy command view for unsupported devices.'
      });
      mountCompatibilityMode({
        reason: 'Your device cannot initialize full Babylon.js 3D rendering, but core strategy systems remain available.'
      });
    }
  });

  try {
    bootFlow.setState(BOOT_STATES.checking_support);
    const support = await detectGraphicsSupport();

    if (!support.webglSupported && !support.webgpuSupported) {
      bootFlow.setState(BOOT_STATES.compatibility_mode, {
        detail: 'WebGL and WebGPU are unavailable in this browser/runtime.'
      });
      return;
    }

    bootFlow.setState(BOOT_STATES.loading_engine, {
      detail: support.webgpuSupported
        ? 'Attempting WebGPU startup with WebGL fallback.'
        : 'WebGPU unavailable. Starting WebGL mode.'
    });

    const { engine } = await createBestAvailableEngine(canvas, support);

    const state=createGameState();
    const { scene, camera, hemi, sun, moonLight, shadows, skyController } = createScene(canvas, engine);

    if (!scene || !camera || !engine) {
      throw new Error('Failed to initialize scene, camera, or engine');
    }

    state.worldRefs.scene=scene; state.worldRefs.engine=engine; state.worldRefs.camera=camera;

    try {
      initMobileControls(canvas, camera);
    } catch (err) {
      console.warn('[Bootstrap] Mobile controls initialization failed:', err);
    }

    setupCameraKeyboardShortcuts(camera);

    const { RAPIER, world } = await createRapierWorld();
    state.worldRefs.rapier = RAPIER; state.worldRefs.rapierWorld = world;
    createFixedBox(world, RAPIER, {x:0,y:-2,z:0}, {x:900,y:2,z:900});
    subscribeInteractions(state);
    subscribeAudioEvents(state);
    initDecisionHooks(state);
    initOverlayClosers();
    initMediaSystem(state);
    initLedgerUI();
    createPlayerMarker(scene, shadows);

    bootFlow.setState(BOOT_STATES.loading_assets);
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

    bindPlacementInput(scene, state, ({type, point})=>{
      const mesh = spawnInstitution(scene, shadows, type, point, state);
      if(mesh){
        setMessage(`${capitalize(type)} placed.`);
        playConstruction();
        saveGame(state);
      }
    });

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

        const threshold = target.coastal ? 36 : 18;
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

    import('./ui/hud.js').then(({ triggerDebugEvent }) => {
      window.debugEvent = () => triggerDebugEvent(state);
    });

    bootFlow.setState(BOOT_STATES.ready);

    let last=performance.now();
    engine.runRenderLoop(()=>{
      const now=performance.now();
      const dt=Math.min(.05,(now-last)*.001);
      last=now;
      if (!state.gamePaused) {
        stepRapier(world, dt);
        runEconomyTick(state, dt);
        runPoliticalTick(state, dt);
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
  } catch (err) {
    console.error('[Bootstrap] Boot error:', err);
    bootFlow.setState(BOOT_STATES.boot_error, {
      detail: `Unable to start full 3D mode. ${err.message || 'Unknown initialization issue.'}`
    });
  }
}

async function detectGraphicsSupport() {
  return {
    webglSupported: isBabylonEngineSupported(),
    webgpuSupported: Boolean(navigator?.gpu)
  };
}

async function createBestAvailableEngine(canvas, support) {
  if (support.webgpuSupported) {
    try {
      const { WebGPUEngine } = await import('@babylonjs/core/Engines/webgpuEngine');
      const webgpuEngine = new WebGPUEngine(canvas, {
        antialias: true,
        adaptToDeviceRatio: true
      });
      await webgpuEngine.initAsync();
      return { engine: webgpuEngine, mode: 'webgpu' };
    } catch (error) {
      console.warn('[Bootstrap] WebGPU initialization failed, falling back to WebGL.', error);
    }
  }

  if (!support.webglSupported) {
    throw new Error('No supported 3D renderer found (WebGL/WebGPU).');
  }

  const webglEngine = new Engine(canvas,true,{preserveDrawingBuffer:false, stencil:true, antialias:true, adaptToDeviceRatio:true});
  return { engine: webglEngine, mode: 'webgl' };
}

function isBabylonEngineSupported() {
  if (typeof Engine.isSupported === 'function') {
    return Boolean(Engine.isSupported());
  }

  if (typeof Engine.IsSupported === 'function') {
    return Boolean(Engine.IsSupported());
  }

  if (typeof Engine.IsSupported !== 'undefined') {
    return Boolean(Engine.IsSupported);
  }

  return false;
}

function createPlayerMarker(scene, shadows){
  const marker=MeshBuilder.CreateCylinder('playerHQ',{diameterTop:7,diameterBottom:9,height:10,tessellation:12},scene);
  marker.position=new Vector3(0,5,24);
  const mat=new StandardMaterial('playerHQMat',scene);
  mat.diffuseColor=new Color3(.6,.58,.54);
  marker.material=mat;
  marker.receiveShadows=true;
  shadows.addShadowCaster(marker);
}

function handleCameraAction(camera, action){
  if(action==='left') camera.alpha -= .14;
  else if(action==='right') camera.alpha += .14;
  else if(action==='zoomIn') camera.radius = Math.max(camera.lowerRadiusLimit, camera.radius - 18);
  else if(action==='zoomOut') camera.radius = Math.min(camera.upperRadiusLimit, camera.radius + 18);
  else if(action==='fitAll') camera.radius = 520;
}

function setupCameraKeyboardShortcuts(camera) {
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Home') {
      e.preventDefault();
      handleCameraAction(camera, 'fitAll');
    }
  });
}

function capitalize(v){ return v.charAt(0).toUpperCase() + v.slice(1); }

bootstrap();
