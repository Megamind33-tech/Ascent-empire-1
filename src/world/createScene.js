import { Engine, Scene, Color3, Color4, ArcRotateCamera, Vector3, HemisphericLight, DirectionalLight, PointLight, ShadowGenerator, GlowLayer } from '@babylonjs/core';
import { initSky, updateSkyIntensity } from './skySystem.js';
import { CONFIG } from '../config.js';
export function createScene(canvas){ const engine = new Engine(canvas,true,{preserveDrawingBuffer:false, stencil:true, antialias:true, adaptToDeviceRatio:true}); const scene=new Scene(engine); scene.clearColor=new Color4(.65,.76,.9,1); engine.setHardwareScalingLevel(1 / clamp(window.devicePixelRatio, CONFIG.mobile.hardwareScalingMin, CONFIG.mobile.hardwareScalingMax)); const camera=new ArcRotateCamera('camera', -Math.PI/2.2, 1, 240, new Vector3(0,18,0), scene); camera.lowerRadiusLimit=90; camera.upperRadiusLimit=420; camera.lowerBetaLimit=.45; camera.upperBetaLimit=1.25; camera.wheelDeltaPercentage=.01; camera.panningSensibility=80; camera.attachControl(canvas, true); scene.fogMode = Scene.FOGMODE_LINEAR; scene.fogColor = new Color3(.72,.79,.88); scene.fogStart = CONFIG.world.fogStart; scene.fogEnd = CONFIG.world.fogEnd; const hemi = new HemisphericLight('hemi', new Vector3(.2,1,.1), scene); hemi.intensity=.9; hemi.groundColor = new Color3(.18,.2,.22); const sun = new DirectionalLight('sun', new Vector3(-.4,-1,-.2), scene); sun.position = new Vector3(180,260,-100); sun.intensity=1.7; const moonLight = new PointLight('moon', new Vector3(-180,120,80), scene); moonLight.intensity=.12;  const shadows = new ShadowGenerator(CONFIG.mobile.shadowMapSize, sun); shadows.useBlurExponentialShadowMap = true; shadows.blurKernel = 16; const glow = new GlowLayer('glow', scene); glow.intensity=.18; 
  const { skyMaterial } = initSky(scene, sun);
  function skyController(daylight){ 
    updateSkyIntensity(skyMaterial, daylight);
    const daySky=new Color3(.72,.82,.93); const nightSky=new Color3(.02,.03,.07); 
    scene.fogColor = Color3.Lerp(nightSky, daySky, daylight); 
  } 
  window.addEventListener('resize', ()=>engine.resize()); return { engine, scene, camera, hemi, sun, moonLight, shadows, skyController }; }
function clamp(v,min,max){ return Math.max(min, Math.min(max, v)); }