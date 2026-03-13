import { Color3, MeshBuilder, StandardMaterial, Vector3, Matrix } from '@babylonjs/core';
import { CONFIG } from '../config.js';
import { on, off, getRecentEvents } from '../systems/eventBus.js';
import { instantiateModel, getModelScale } from '../systems/assetLoader.js';
import { createCityPlanner } from './cityPlanner.js';
import { createDistrictLighting } from '../systems/districtLighting.js';
import { createDetailPlacement } from '../systems/detailPlacement.js';
import { createAudioManager } from '../systems/audioManager.js';
import { createDistrictManager } from '../systems/districtManager.js';
import { createResourceManager } from '../systems/resourceManager.js';
import { createEventManager } from '../systems/eventManager.js';
import { createInteractionHandler } from '../systems/interactionHandler.js';
import { createDistrictPanel } from '../ui/districtPanel.js';

// ── World boundary configs ────────────────────────────────────────────────────
const WALL_HALF  = 300;  // Half-extent of the play area (px)
const WALL_H     = 40;   // Invisible wall height — tall enough NPCs/vehicles can't escape
const WALL_THICK =  4;   // Wall thickness

export function destroyWorld(state) {
  // Clean up Phase 9 systems
  if (state.worldRefs.districtPanel) {
    state.worldRefs.districtPanel.destroy();
    state.worldRefs.districtPanel = null;
  }
  if (state.worldRefs.eventManager) {
    state.worldRefs.eventManager.reset();
    state.worldRefs.eventManager = null;
  }
  if (state.worldRefs.resourceManager) {
    state.worldRefs.resourceManager.reset();
    state.worldRefs.resourceManager = null;
  }
  if (state.worldRefs.districtManager) {
    state.worldRefs.districtManager.reset();
    state.worldRefs.districtManager = null;
  }
  if (state.worldRefs.interactionHandler) {
    state.worldRefs.interactionHandler.reset();
    state.worldRefs.interactionHandler = null;
  }

  // Clean up existing systems
  for (const fn of state.worldRefs.cleanupFns) fn();
  state.worldRefs.cleanupFns = [];
  for (const mesh of state.worldRefs.worldMeshes) {
    if (mesh && !mesh.isDisposed()) mesh.dispose(false, true);
  }
  state.worldRefs.worldMeshes = [];
  state.worldRefs.constructionAnchors = [];
  state.worldRefs.traffic = [];
  state.worldRefs.agents  = [];
}

export function createNationWorld(scene, shadows, state) {
  destroyWorld(state);
  const nation  = state.nations[state.currentNationIndex];
  const rand    = seeded(nation.seed + nation.visits * 7);
  const meshes  = [];
  const cleanupFns = [];
  const tone    = new Color3(...CONFIG.nations[state.currentNationIndex].tone);
  const mats    = materials(scene, tone);

  // ── Ground ─────────────────────────────────────────────────────────────────
  const ground = MeshBuilder.CreateGround('ground', { width: CONFIG.world.size, height: CONFIG.world.size, subdivisions: 70 }, scene);
  sculptGround(ground, nation, rand);
  ground.material = mats.ground;
  ground.receiveShadows = true;
  // Ground is NOT buildable — only construction pads are valid placement targets
  ground.metadata = {};
  meshes.push(ground);

  // ── Roads ──────────────────────────────────────────────────────────────────
  const ROAD_POSITIONS = [0, 120, -120, 240, -240];  // Positions of road centerlines
  for (let a = -240; a <= 240; a += 120) {
    const rz = MeshBuilder.CreateGround(`road-z-${a}`, { width: 560, height: 22 }, scene);
    rz.position.set(0, .12, a); rz.material = mats.road; rz.receiveShadows = true; meshes.push(rz);
    const rx = MeshBuilder.CreateGround(`road-x-${a}`, { width: 22, height: 560 }, scene);
    rx.position.set(a, .12, 0); rx.material = mats.road; rx.receiveShadows = true; meshes.push(rx);

    // 🏙️ Add Billboards near road intersections
    if (Math.abs(a) > 60 && rand() > 0.4) {
      const bb = instantiateModel('billboard', scene);
      if (bb) {
        const s = getModelScale('billboard');
        bb.position.set(a + (a > 0 ? 15 : -15), 0.1, a + 12);
        bb.rotation.y = a > 0 ? Math.PI / 2 : -Math.PI / 2;
        bb.scaling.set(s, s, s);
        bb.getChildMeshes().forEach(m => shadows.addShadowCaster(m));
        meshes.push(bb);
      }
    }
  }

  // ── Beautiful City Planning (District-Based Generation) ─────────────────
  const cityPlanner = createCityPlanner(scene, shadows);
  const plannedBuildings = cityPlanner.generateCity();

  // Add planned buildings to world meshes
  for (const building of plannedBuildings) {
    meshes.push(building.mesh);
  }

  // Log city statistics
  cityPlanner.logStatistics();

  // ── Atmosphere, Environment & World Density (Phase 8) ────────────────────
  // Apply district-specific lighting for atmospheric variety
  const districtLighting = createDistrictLighting(scene);
  districtLighting.applyDistrictWiseLighting(
    cityPlanner.getDistrictPlanner(),
    cityPlanner.getValidator()
  );
  districtLighting.logLighting();

  // Place vegetation and decorative details throughout the world
  const detailPlacement = createDetailPlacement(
    scene,
    cityPlanner.getDistrictPlanner(),
    cityPlanner.getValidator()
  );

  const vegetationMeshes = detailPlacement.placeVegetation();
  for (const veg of vegetationMeshes) {
    meshes.push(veg.mesh);
  }

  const decorativeMeshes = detailPlacement.placeDecoratives();
  for (const decor of decorativeMeshes) {
    meshes.push(decor.mesh);
  }

  detailPlacement.logSummary();

  // Set up audio atmosphere for each district
  const audioManager = createAudioManager(scene);
  const districts = cityPlanner.getDistrictPlanner().getAllDistricts();
  for (const district of districts) {
    audioManager.playDistrictAudio(district.id);
  }
  audioManager.logAudio();

  // ── Interactive Districts & Gameplay (Phase 9) ──────────────────────────────
  console.log('[CreateNationWorld] Initializing Phase 9 interactive systems...');

  // Create district game state manager
  const districtManager = createDistrictManager(cityPlanner.getDistrictPlanner());

  // Create resource economy system
  const resourceManager = createResourceManager(districtManager);

  // Create dynamic event system
  const eventManager = createEventManager(districtManager, resourceManager);

  // Create interaction handler for building clicks
  const interactionHandler = createInteractionHandler(
    scene,
    scene.activeCamera,
    districtManager,
    cityPlanner.getDistrictPlanner()
  );

  // Register all planned buildings for interaction
  interactionHandler.registerBuildings(plannedBuildings);
  interactionHandler.logStatistics();

  // Create district management UI panel
  const districtPanel = createDistrictPanel(scene, districtManager, interactionHandler);

  // Set up district selection callback
  interactionHandler.onDistrictSelected = (districtId) => {
    districtPanel.show(districtId);
  };

  // Store gameplay systems in world refs for update loop
  state.worldRefs.districtManager = districtManager;
  state.worldRefs.resourceManager = resourceManager;
  state.worldRefs.eventManager = eventManager;
  state.worldRefs.interactionHandler = interactionHandler;
  state.worldRefs.districtPanel = districtPanel;

  console.log('[CreateNationWorld] Phase 9 systems initialized successfully');

  // ── Key civic buildings ────────────────────────────────────────────────────
  const parliament = instantiateModel('parliament', scene);
  if (parliament) {
    const s = getModelScale('parliament');
    parliament.scaling.set(s, s, s);
    // Moved off x=0 road — now sits in the safe block between x=0 and x=120 roads
    parliament.position.set(55, 0.1, -80);
    parliament.getChildMeshes().forEach(m => shadows.addShadowCaster(m));
    parliament.metadata = { type: 'parliament', onFire: false };
    meshes.push(parliament);
  }

  const police = instantiateModel('police', scene);
  if (police) {
    const s = getModelScale('police');
    police.scaling.set(s, s, s);
    police.position.set(-88, 0.1, -86);
    police.getChildMeshes().forEach(m => shadows.addShadowCaster(m));
    police.metadata = { type: 'police', onFire: false };
    meshes.push(police);
  }

  // ── Perimeter boundary walls (invisible, Rapier-backed) ──────────────────
  // Four walls: North, South, East, West. Invisible but fully solid.
  const wallDefs = [
    { name: 'wall-north', x: 0,          y: WALL_H / 2, z: -WALL_HALF -  WALL_THICK / 2, w: WALL_HALF * 2 + WALL_THICK * 2, d: WALL_THICK },
    { name: 'wall-south', x: 0,          y: WALL_H / 2, z:  WALL_HALF +  WALL_THICK / 2, w: WALL_HALF * 2 + WALL_THICK * 2, d: WALL_THICK },
    { name: 'wall-west',  x: -WALL_HALF - WALL_THICK / 2, y: WALL_H / 2, z: 0, w: WALL_THICK, d: WALL_HALF * 2 },
    { name: 'wall-east',  x:  WALL_HALF + WALL_THICK / 2, y: WALL_H / 2, z: 0, w: WALL_THICK, d: WALL_HALF * 2 },
  ];
  const RAPIER      = state.worldRefs.rapier;
  const physWorld   = state.worldRefs.rapierWorld;
  for (const wd of wallDefs) {
    const wall = MeshBuilder.CreateBox(wd.name, { width: wd.w, height: WALL_H, depth: wd.d }, scene);
    wall.position.set(wd.x, wd.y, wd.z);
    wall.isVisible = false;   // invisible barrier — NPCs and cars can't cross
    wall.metadata  = { isBoundaryWall: true };
    meshes.push(wall);
    // Rapier collider
    if (RAPIER && physWorld) {
      const body = physWorld.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(wd.x, wd.y, wd.z));
      physWorld.createCollider(RAPIER.ColliderDesc.cuboid(wd.w / 2, WALL_H / 2, wd.d / 2), body);
    }
  }

  // ── Construction build pads ───────────────────────────────────────────────
  const anchors = [];
  const padPositions = [[-150,-120],[-110,-120],[-70,-120],[-30,-120],[10,-120],[50,-120],[90,-120],[130,-120],[-150,120],[-110,120],[-70,120],[-30,120],[10,120],[50,120],[90,120],[130,120],[-180,-20],[180,-20],[-180,20],[180,20],[-180,60],[180,60],[-180,-60],[180,-60]];
  for (const [x, z] of padPositions) {
    const pad = MeshBuilder.CreateGround(`pad-${x}-${z}`, { width: 20, height: 20 }, scene);
    pad.position.set(x, .18, z); pad.material = mats.anchor; pad.metadata = { buildable: true }; anchors.push(pad);
  }
  state.worldRefs.constructionAnchors = anchors; meshes.push(...anchors);

  // ── Traffic (diverse vehicles — all 9 types cycle through the fleet) ──────
  // Each entry: { axis, laneCoord, dir }
  // axis='x' → car travels east/west; laneCoord is the z position (on a z-road)
  // axis='z' → car travels north/south; laneCoord is the x position (on an x-road)
  // Two lanes per road (offset ±4 from centreline): one for each direction.
  const CAR_LANES = [
    // z-roads (cars travel along X axis)
    { axis: 'x', laneCoord:   -4, dir:  1 },   // z=0   road, eastbound
    { axis: 'x', laneCoord:    4, dir: -1 },   // z=0   road, westbound
    { axis: 'x', laneCoord:  116, dir:  1 },   // z=120 road, eastbound
    { axis: 'x', laneCoord:  124, dir: -1 },   // z=120 road, westbound
    { axis: 'x', laneCoord: -124, dir:  1 },   // z=-120 road, eastbound
    { axis: 'x', laneCoord: -116, dir: -1 },   // z=-120 road, westbound
    { axis: 'x', laneCoord:  236, dir:  1 },   // z=240 road, eastbound
    { axis: 'x', laneCoord:  244, dir: -1 },   // z=240 road, westbound
    { axis: 'x', laneCoord: -236, dir:  1 },   // z=-240 road, eastbound
    // x-roads (cars travel along Z axis)
    { axis: 'z', laneCoord:   -4, dir:  1 },   // x=0   road, southbound
    { axis: 'z', laneCoord:    4, dir: -1 },   // x=0   road, northbound
    { axis: 'z', laneCoord:  116, dir:  1 },   // x=120 road, southbound
    { axis: 'z', laneCoord:  124, dir: -1 },   // x=120 road, northbound
    { axis: 'z', laneCoord: -124, dir:  1 },   // x=-120 road, southbound
    { axis: 'z', laneCoord: -116, dir: -1 },   // x=-120 road, northbound
    { axis: 'z', laneCoord:  236, dir:  1 },   // x=240 road, southbound
    { axis: 'z', laneCoord:  244, dir: -1 },   // x=240 road, northbound
    { axis: 'z', laneCoord: -236, dir:  1 },   // x=-240 road, southbound
  ];
  const VEHICLE_TYPES = ['car_a','car_b','car_c','car_model','bus','gtr','police_car','suv','sports_car'];
  const traffic = [];
  for (let i = 0; i < CONFIG.mobile.maxDynamicCars; i++) {
    const lane = CAR_LANES[i % CAR_LANES.length];
    const carType = VEHICLE_TYPES[i % VEHICLE_TYPES.length];
    const carModel = instantiateModel(carType, scene);
    if (carModel) {
      const s = getModelScale(carType);
      carModel.scaling.set(s, s, s);
      // Stagger initial positions so cars are spread across the road length
      const startOffset = -240 + (i * 54) % 480;
      if (lane.axis === 'x') {
        carModel.position.set(startOffset, 0.4, lane.laneCoord);
      } else {
        carModel.position.set(lane.laneCoord, 0.4, startOffset);
      }
      carModel.getChildMeshes().forEach(m => shadows.addShadowCaster(m));
      // Buses are slower; sports/GTR faster
      const baseSpeed = carType === 'bus' ? 5 : (carType === 'gtr' || carType === 'sports_car') ? 14 : 8;
      traffic.push({ mesh: carModel, axis: lane.axis, dir: lane.dir, speed: baseSpeed + rand() * 4, passengers: 0 });
      meshes.push(carModel);
    }
  }
  state.worldRefs.traffic = traffic;

  // ── Diagnostic logging (optional: uncomment for calibration debugging) ──────
  // Logs initial vehicle positions to verify traffic spacing and lane distribution
  if (false) { // Set to true for diagnostics during calibration
    console.log('[Diagnostics] Traffic spawn positions:');
    traffic.forEach((item, i) => {
      console.log(`  Car ${i}: lane=${item.axis}/${item.laneCoord} dir=${item.dir} pos=[${item.mesh.position.x.toFixed(1)},${item.mesh.position.z.toFixed(1)}] scale=${item.mesh.scaling.x.toFixed(3)}`);
    });
  }

  // ── Agents (pedestrians) ───────────────────────────────────────────────────
  const agents = [];
  for (let i = 0; i < CONFIG.mobile.maxAgents; i++) {
    const agentModel = instantiateModel('agent_a', scene);
    if (agentModel) {
      const s = getModelScale('agent_a');
      agentModel.scaling.set(s, s, s);
      agentModel.position.set(-90 + rand() * 180, 0.1, -90 + rand() * 180);
      agentModel.getChildMeshes().forEach(m => shadows.addShadowCaster(m));
      agents.push({
        mesh: agentModel, target: point(rand), speed: 1 + rand() * .8,
        status: 'alive',
        deathReason: null,
        drownTimer: 0,
        _drowningMsg: false,
        deathFadeTimer: 0,
        passenger: null,
      });
      meshes.push(agentModel);
    }
  }
  state.worldRefs.agents = agents;

  // ── Diagnostic logging (optional: uncomment for calibration debugging) ──────
  // Logs initial agent positions to verify spawn area and distribution
  if (false) { // Set to true for diagnostics during calibration
    console.log('[Diagnostics] Agent spawn positions:');
    agents.forEach((item, i) => {
      const dist = Math.sqrt(item.mesh.position.x ** 2 + item.mesh.position.z ** 2);
      console.log(`  Agent ${i}: pos=[${item.mesh.position.x.toFixed(1)},${item.mesh.position.z.toFixed(1)}] dist=${dist.toFixed(1)}`);
    });
  }

  // ── Coastal / inland features ─────────────────────────────────────────────
  if (nation.coastal) {
    const sea = MeshBuilder.CreateGround('sea', { width: 1000, height: 1000, subdivisions: 24 }, scene);
    // Position water far edge at -600 (city extends to -280, so clear gap)
    sea.position.set(-880, CONFIG.world.waterLevel, -880);
    sea.material = mats.water;
    sea.metadata = { isWater: true };   // ←  death zone marker
    meshes.push(sea);
    const port = MeshBuilder.CreateGround('port', { width: 180, height: 80 }, scene);
    port.position.set(-750, 4.1, -750); port.material = mats.port; meshes.push(port);
    for (let i = 0; i < 3; i++) {
      const ship = MeshBuilder.CreateBox(`ship-${i}`, { width: 18, height: 8, depth: 54 }, scene);
      ship.position.set(-750 + i * 80, 8, -750 + i * 30); ship.material = mats.ship; meshes.push(ship);
      traffic.push({ mesh: ship, axis: 'x', dir: i % 2 === 0 ? 1 : -1, speed: 2 + rand() * 1.4, min: -1150, max: -400, ship: true, passengers: 0 });
    }
  } else {
    const airstrip = MeshBuilder.CreateGround('airstrip', { width: 220, height: 40 }, scene);
    airstrip.position.set(-260, .14, -240); airstrip.material = mats.airstrip; meshes.push(airstrip);
  }
  // ── Static world decorations ─────────────────────────────────────────────
  // These are purely visual — do NOT use spawnInstitution() here, as that
  // increments state.buildings counters on every world reload.
  //
  // Positions keep buildings ~2% of city width (≈36 units footprint) and
  // avoid the road grid (roads run at x/z = 0, ±120, ±240).
  //
  // Y = 0.1 places the model pivot flush on the ground plane for all
  // assets whose origin is at their base (standard for Kenney / Quaternius packs).

  const _worldDecorations = [
    // Industrial outskirts — all kept well clear of road centrelines (±0, ±120, ±240)
    { key: 'mine',          pos: new Vector3( 260,  0.1,  190) },   // z moved from 230→190 (was 10 from z=240 road)
    { key: 'refinery',      pos: new Vector3( 220,  0.1, -195) },   // z moved from -250→-195 (was 10 from z=-240 road)
    { key: 'barracks',      pos: new Vector3(-200,  0.1,  220) },   // x moved from -250→-200 (was 10 from x=-240 road)
    { key: 'stadium',       pos: new Vector3( 155,  0.1,  155) },   // x moved from 130→155 (was 10 from x=120 road)

    // Civic downtown (between road bands, clear of parliament & police)
    { key: 'hospital',      pos: new Vector3( 100,  0.1,  -55) },
    { key: 'police_station',pos: new Vector3(  82,  0.1,   65) },
    { key: 'bar',           pos: new Vector3(-105,  0.1,   65) },

    // Rural zone (east outskirts) — shifted inward away from x=240 road
    { key: 'cottage',       pos: new Vector3( 205,  0.1,   80) },   // x moved from 235→205 (was 5 from x=240 road)
    { key: 'greenhouse',    pos: new Vector3( 205,  0.1,   55) },
    { key: 'rural_farm',    pos: new Vector3( 205,  0.1,  -55) },   // x moved from 245→205, z moved from -30→-55

    // Stop signs at road corners — placed just outside the road edge (road half-width = 11)
    { key: 'stop_sign',     pos: new Vector3(  55,  0.1,  132) },   // z moved from 125→132 (12 from z=120 road edge)
    { key: 'stop_sign',     pos: new Vector3( -55,  0.1,  132) },   // same z fix
    { key: 'stop_sign',     pos: new Vector3( 132,  0.1,   13) },   // x moved from 115→132, z moved from 5→13
    { key: 'stop_sign',     pos: new Vector3(-132,  0.1,   13) },   // x moved from -115→-132, z moved from 5→13

    // Small decorative cats — kept off road surfaces
    { key: 'cat',           pos: new Vector3(  20,  0.1,   20) },   // z moved from 10→20 (was on z=0 road)
    { key: 'cat',           pos: new Vector3( -30,  0.1,   25) },
    { key: 'cat',           pos: new Vector3(  45,  0.1,  -28) },
  ];

  // Waterfall — inland nations only (coastal maps have the sea edge)
  if (!nation.coastal) {
    // x moved from -230→-200 (was 10 from x=-240 road)
    _worldDecorations.push({ key: 'waterfall', pos: new Vector3(-200, 0.1, 100) });
  }

  for (const decoration of _worldDecorations) {
    const { key, pos, rotY } = decoration;
    const dm = instantiateModel(key, scene);
    if (dm) {
      const s = getModelScale(key);
      dm.scaling.set(s, s, s);
      dm.position.copyFrom(pos);
      if (rotY !== undefined) {
        dm.rotation.y = rotY;
      }
      dm.metadata = { type: key, onFire: false };
      // Only cast shadows for sizeable objects; skip tiny props to save GPU bandwidth
      const skipShadow = key === 'stop_sign' || key === 'cat' || key === 'road_bits';
      if (!skipShadow) {
        dm.getChildMeshes().forEach(c => { c.receiveShadows = true; shadows.addShadowCaster(c); });
      } else {
        dm.getChildMeshes().forEach(c => { c.receiveShadows = true; });
      }
      meshes.push(dm);
    }
  }

  // 🌲 Scatter Trees & Nature (mixed types for visual variety)
  const primaryTree = nation.coastal ? 'palm' : (rand() > 0.5 ? 'birch' : 'pine');
  const secondaryTree = nation.coastal ? 'birch' : 'pine';
  for (let i = 0; i < 40; i++) {
    const treeType = i % 5 === 0 ? secondaryTree : primaryTree;
    const tree = instantiateModel(treeType, scene);
    if (tree) {
      const tx = -280 + rand() * 560;
      const tz = -280 + rand() * 560;
      if (Math.abs(tx) < 40 && Math.abs(tz) < 40) continue; // avoid centre plaza
      // Avoid all road centrelines (roads at 0, ±120, ±240; half-width 11 + small buffer)
      if (ROAD_POSITIONS.some(r => Math.abs(tx - r) < 13) || ROAD_POSITIONS.some(r => Math.abs(tz - r) < 13)) continue;
      tree.position.set(tx, 0.1, tz);
      const s = 0.12 + rand() * 0.09;
      tree.scaling.set(s, s, s);
      tree.rotation.y = rand() * Math.PI * 2;
      tree.getChildMeshes().forEach(m => shadows.addShadowCaster(m));
      meshes.push(tree);
    }
  }

  // 🚜 Farmland cluster (landmark farm models)
  for (let i = 0; i < 6; i++) {
    const farm = instantiateModel('farm', scene);
    if (farm) {
      // x range 160-215 and z range 150-220: both clear of x=120, x=240, z=120, z=240 roads
      farm.position.set(160 + rand() * 55, 0.1, 150 + rand() * 70);
      farm.scaling.setAll(0.09);
      farm.getChildMeshes().forEach(m => shadows.addShadowCaster(m));
      meshes.push(farm);
    }
  }

  state.worldRefs.worldMeshes  = meshes;

  // ── Event-reactive agent redirections ─────────────────────────────────────
  // Named handlers so they can be unsubscribed when the world is destroyed
  const _onProtest = ({ size }) => {
    const count = size === 'large'
      ? Math.floor(state.worldRefs.agents.length * 0.5)
      : Math.floor(state.worldRefs.agents.length * 0.3);
    for (let i = 0; i < count; i++) {
      const ag = state.worldRefs.agents[i];
      if (ag && ag.status === 'alive' && !ag.passenger)
        ag.target = new Vector3(45 + Math.random() * 20, 0.9, -70 + Math.random() * 20);
    }
  };
  const _onScandal = () => {
    for (const ag of state.worldRefs.agents) {
      if (ag.status === 'alive' && !ag.passenger && ag.mesh.position.z > 0)
        ag.target = new Vector3(-160 + Math.random() * 80, 0.9, -160 + Math.random() * 80);
    }
  };
  on('PROTEST', _onProtest);
  on('SCANDAL', _onScandal);
  cleanupFns.push(() => { off('PROTEST', _onProtest); off('SCANDAL', _onScandal); });

  // ── Phase 9: Click handler for district interaction ──────────────────────────
  const _onMouseClick = (e) => {
    if (e.button === 0) { // Left click only
      const x = e.clientX;
      const y = e.clientY;
      state.worldRefs.interactionHandler.handleClick(x, y);
    }
  };
  scene.getEngine().getRenderingCanvas().addEventListener('click', _onMouseClick);
  cleanupFns.push(() => {
    scene.getEngine().getRenderingCanvas().removeEventListener('click', _onMouseClick);
  });

  state.worldRefs.cleanupFns = cleanupFns;

  return {
    update(dt, t) {
      // ── Phase 9: Update all gameplay systems ──────────────────────────────────
      if (state.worldRefs.districtManager && state.worldRefs.resourceManager && state.worldRefs.eventManager) {
        // Update districts (population, production, consumption)
        const globalStats = state.worldRefs.resourceManager.getGlobalStats();
        state.worldRefs.districtManager.updateDistricts(dt, globalStats);

        // Execute resource trades between districts
        state.worldRefs.resourceManager.executeTrades();

        // Update active events and check for new ones
        state.worldRefs.eventManager.updateEvents();

        // Update district UI panel if visible
        if (state.worldRefs.districtPanel) {
          state.worldRefs.districtPanel.update(dt);
        }
      }

      // ── Traffic movement + car rotation ───────────────────────────────────
      for (const item of state.worldRefs.traffic) {
        if (item.ship) {
          item.mesh.position.x += item.speed * item.dir * dt;
          if (item.mesh.position.x > -120) item.dir = -1;
          if (item.mesh.position.x < -520) item.dir = 1;
          item.mesh.position.z += Math.sin(t * 0.15 + item.mesh.uniqueId) * dt * 0.8;
          // Ships face direction of travel
          item.mesh.rotation.y = item.dir > 0 ? 0 : Math.PI;
          continue;
        }
        if (item.axis === 'x') {
          item.mesh.position.x += item.speed * item.dir * dt;
          if (item.mesh.position.x >  260) item.mesh.position.x = -260;
          if (item.mesh.position.x < -260) item.mesh.position.x =  260;
          // Face direction of travel along X-axis (models import facing +Z; π/2 = +X, -π/2 = -X)
          item.mesh.rotation.y = item.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
        } else {
          item.mesh.position.z += item.speed * item.dir * dt;
          if (item.mesh.position.z >  260) item.mesh.position.z = -260;
          if (item.mesh.position.z < -260) item.mesh.position.z =  260;
          // Face direction of travel along Z-axis (π = +Z direction, 0 = -Z direction)
          item.mesh.rotation.y = item.dir > 0 ? Math.PI : 0;
        }
      }

      // ── Agent pathfinding + event-reactive behaviour ───────────────────────
      const recentEvents = getRecentEvents(15000);
      const hasProtest   = recentEvents.some(e => e.type === 'PROTEST');
      const hasScandal   = recentEvents.some(e => e.type === 'SCANDAL');
      const lowSecurity  = state.security < 10;

      for (const person of state.worldRefs.agents) {
        // Skip dead or riding agents — handled by physicsInteractionSystem
        if (person.status === 'dead' || person.passenger) continue;

        if (lowSecurity) {
          person.mesh.isVisible = Math.random() > 0.6;
        } else {
          person.mesh.isVisible = true;
        }

        const dir = person.target.subtract(person.mesh.position);
        dir.y = 0;
        if (dir.lengthSquared() < 4) {
          if (hasProtest && Math.random() < 0.3) {
            person.target = new Vector3(35 + Math.random() * 40, 0.9, -80 + Math.random() * 30);
          } else if (hasScandal && Math.random() < 0.4 && person.mesh.position.z > 0) {
            person.target = new Vector3(-170 + Math.random() * 100, 0.9, -170 + Math.random() * 100);
          } else {
            person.target = point(rand);
          }
          continue;
        }
        dir.normalize();
        const speedMod = hasProtest ? 1.6 : hasScandal ? 0.5 : 1.0;
        person.mesh.position.addInPlace(dir.scale(person.speed * speedMod * dt));
        person.mesh.rotation.y = Math.atan2(dir.x, dir.z);

        // Boundary clamp — wall should stop them but just in case
        person.mesh.position.x = Math.max(-WALL_HALF + 2, Math.min(WALL_HALF - 2, person.mesh.position.x));
        person.mesh.position.z = Math.max(-WALL_HALF + 2, Math.min(WALL_HALF - 2, person.mesh.position.z));
      }
    }
  };
}

function sculptGround(ground, nation, rand) {
  const positions = ground.getVerticesData('position');
  for (let i = 0; i < positions.length; i += 3) {
    const x = positions[i], z = positions[i + 2]; let y = 0;
    const roadBand = Math.abs((Math.abs(x) % 120) - 60) < 12 || Math.abs((Math.abs(z) % 120) - 60) < 12;
    const cityDist = Math.max(Math.abs(x), Math.abs(z));

    if (cityDist < 220) {
      // Flat city core — buildings and roads live here
      y = 0;
    } else if (!roadBand) {
      // Outskirts — organic rolling hills with multiple noise octaves
      const blend = Math.min(1.0, (cityDist - 220) / 160); // smooth 0→1 from city edge outward
      const hillBase = Math.sin((x + nation.seed) * 0.008) * 14
                     + Math.cos((z - nation.seed) * 0.007) * 11
                     + Math.sin((x + z + nation.seed) * 0.004) * 20;
      // Mid-frequency detail for rocky/ridgeline feel
      const hillDetail = Math.sin(x * 0.022 + nation.seed * 0.3) * 7
                       + Math.cos(z * 0.018 - nation.seed * 0.2) * 6;
      // High-frequency micro bumps
      const microBump = Math.sin(x * 0.055) * 2.5 + Math.cos(z * 0.048) * 2.0;
      y = blend * (hillBase + hillDetail + microBump);
    }

    if (nation.coastal) {
      // Coastal slope dips down toward the sea corner
      const coastDip = Math.max(0, 28 - Math.abs(x + 340) * 0.055);
      y -= coastDip;
    }
    positions[i + 1] = y;
  }
  ground.updateVerticesData('position', positions); ground.refreshBoundingInfo();
}
function materials(scene, tone) {
  const make = (name, diff, spec = [.04,.04,.04], alpha = 1) => {
    const m = new StandardMaterial(name, scene);
    m.diffuseColor  = Array.isArray(diff) ? new Color3(...diff) : diff;
    m.specularColor = new Color3(...spec); m.alpha = alpha; return m;
  };
  return {
    ground: make('ground', tone), road: make('road', [.18,.18,.20]),
    building: make('building',[.72,.62,.50],[.20,.20,.22]), civic: make('civic',[.65,.58,.48],[.15,.15,.15]),
    dark: make('dark',[.35,.30,.28],[.12,.12,.12]), anchor: make('anchor',[.28,.38,.30],[.05,.05,.05],.72),
    car: make('car',[.25,.28,.32],[.3,.3,.3]), agent: make('agent',[.35,.32,.28]),
    water: make('water',[.15,.45,.65],[.5,.55,.6],.93), port: make('port',[.50,.48,.42]),
    ship: make('ship',[.45,.42,.38]), airstrip: make('air',[.22,.22,.24]), industrial: make('ind',[.55,.50,.44]),
  };
}
function point(rand) { return new Vector3(-170 + rand() * 340, .9, -170 + rand() * 340); }
function seeded(seed) { return () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; }; }