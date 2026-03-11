import { Color3, MeshBuilder, StandardMaterial, Vector3, Matrix } from '@babylonjs/core';
import { CONFIG } from '../config.js';
import { on, off, getRecentEvents } from '../systems/eventBus.js';
import { instantiateModel, getModelScale } from '../systems/assetLoader.js';

// ── World boundary configs ────────────────────────────────────────────────────
const WALL_HALF  = 300;  // Half-extent of the play area (px)
const WALL_H     = 40;   // Invisible wall height — tall enough NPCs/vehicles can't escape
const WALL_THICK =  4;   // Wall thickness

export function destroyWorld(state) {
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
  for (let a = -240; a <= 240; a += 120) {
    const rz = MeshBuilder.CreateGround(`road-z-${a}`, { width: 560, height: 22 }, scene);
    rz.position.set(0, .12, a); rz.material = mats.road; rz.receiveShadows = true; meshes.push(rz);
    const rx = MeshBuilder.CreateGround(`road-x-${a}`, { width: 22, height: 560 }, scene);
    rx.position.set(a, .12, 0); rx.material = mats.road; rx.receiveShadows = true; meshes.push(rx);

    // 🏙️ Add Billboards near road intersections
    if (Math.abs(a) > 60 && rand() > 0.4) {
      const bb = instantiateModel('billboard', scene);
      if (bb) {
        bb.position.set(a + (a > 0 ? 15 : -15), 0.1, a + 12);
        bb.rotation.y = a > 0 ? Math.PI / 2 : -Math.PI / 2;
        bb.scaling.set(1.5, 1.5, 1.5);
        bb.getChildMeshes().forEach(m => shadows.addShadowCaster(m));
        meshes.push(bb);
      }
    }
  }

  // ── Skyline (Buildings) ──────────────────────────────────────────────────
  for (let x = -220; x <= 220; x += 32) {
    for (let z = -220; z <= 220; z += 32) {
      if (Math.abs((x + 14) % 120 - 60) < 18 || Math.abs((z + 14) % 120 - 60) < 18) continue;
      if (rand() > CONFIG.mobile.skylineDensity) continue;

      const type = rand() > 0.5 ? 'tower_a' : 'tower_b';
      const tower = instantiateModel(type, scene);
      if (tower) {
        const s = getModelScale(type) * (0.8 + rand() * 0.4);
        tower.scaling.set(s, s, s);
        tower.position.set(x, 0.1, z);
        tower.getChildMeshes().forEach(m => shadows.addShadowCaster(m));
        tower.metadata = { type: 'skyline', onFire: false }; // Can catch fire
        meshes.push(tower);
      }
    }
  }

  // ── Key civic buildings ────────────────────────────────────────────────────
  const parliament = instantiateModel('parliament', scene);
  if (parliament) {
    const s = getModelScale('parliament');
    parliament.scaling.set(s, s, s);
    parliament.position.set(0, 0.1, -96);
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

  // ── Traffic (cars) ────────────────────────────────────────────────────────
  const traffic = [];
  for (let i = 0; i < CONFIG.mobile.maxDynamicCars; i++) {
    const carType = i % 2 === 0 ? 'car_a' : 'car_b';
    const carModel = instantiateModel(carType, scene);
    if (carModel) {
      const s = getModelScale(carType);
      carModel.scaling.set(s, s, s);
      carModel.position.set(-240 + i * 26, 0.4, i % 2 === 0 ? -40 : 40);
      carModel.getChildMeshes().forEach(m => shadows.addShadowCaster(m));
      traffic.push({ mesh: carModel, axis: i % 2 === 0 ? 'x' : 'z', dir: i % 3 === 0 ? -1 : 1, speed: 8 + rand() * 6, passengers: 0 });
      meshes.push(carModel);
    }
  }
  state.worldRefs.traffic = traffic;

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

  // ── Coastal / inland features ─────────────────────────────────────────────
  if (nation.coastal) {
    const sea = MeshBuilder.CreateGround('sea', { width: 880, height: 880, subdivisions: 24 }, scene);
    sea.position.set(-450, CONFIG.world.waterLevel, -450);
    sea.material = mats.water;
    sea.metadata = { isWater: true };   // ←  death zone marker
    meshes.push(sea);
    const port = MeshBuilder.CreateGround('port', { width: 180, height: 80 }, scene);
    port.position.set(-230, 4.1, -220); port.material = mats.port; meshes.push(port);
    for (let i = 0; i < 3; i++) {
      const ship = MeshBuilder.CreateBox(`ship-${i}`, { width: 18, height: 8, depth: 54 }, scene);
      ship.position.set(-380 + i * 80, 8, -290 + i * 30); ship.material = mats.ship; meshes.push(ship);
      traffic.push({ mesh: ship, axis: 'x', dir: i % 2 === 0 ? 1 : -1, speed: 2 + rand() * 1.4, min: -520, max: -120, ship: true, passengers: 0 });
    }
  } else {
    const airstrip = MeshBuilder.CreateGround('airstrip', { width: 220, height: 40 }, scene);
    airstrip.position.set(-260, .14, -240); airstrip.material = mats.airstrip; meshes.push(airstrip);
  }
  const mine     = MeshBuilder.CreateBox('mine-zone',    { width: 50, depth: 50, height: 8  }, scene); mine.position.set(260, 4, 230);   mine.material = mats.industrial; meshes.push(mine);
  const refinery = MeshBuilder.CreateBox('refinery-zone',{ width: 70, depth: 46, height: 14 }, scene); refinery.position.set(220, 7, -250); refinery.material = mats.industrial; meshes.push(refinery);
  const barracks = MeshBuilder.CreateBox('barracks-zone',{ width: 54, depth: 36, height: 10 }, scene); barracks.position.set(-250, 5, 220); barracks.material = mats.dark; meshes.push(barracks);
  const stadium  = MeshBuilder.CreateCylinder('stadium', { diameterTop: 48, diameterBottom: 58, height: 10, tessellation: 24 }, scene); stadium.position.set(120, 5, 160); stadium.material = mats.civic; meshes.push(stadium);

  // 🌲 Scatter Trees & Nature
  const treeType = nation.coastal ? 'palm' : (rand() > 0.5 ? 'birch' : 'pine');
  for (let i = 0; i < 40; i++) {
    const tree = instantiateModel(treeType, scene);
    if (tree) {
      const tx = -280 + rand() * 560;
      const tz = -280 + rand() * 560;
      // Avoid center roads
      if (Math.abs(tx) < 40 && Math.abs(tz) < 40) continue;
      tree.position.set(tx, 0.1, tz);
      const s = 1.8 + rand() * 1.5;
      tree.scaling.set(s, s, s);
      tree.rotation.y = rand() * Math.PI * 2;
      tree.getChildMeshes().forEach(m => shadows.addShadowCaster(m));
      meshes.push(tree);
    }
  }

  // 🚜 Add Farmland models
  for (let i = 0; i < 6; i++) {
    const farm = instantiateModel('farm', scene);
    if (farm) {
      farm.position.set(200 + rand() * 80, 0.1, 150 + rand() * 100);
      farm.scaling.set(2.0, 2.0, 2.0);
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
        ag.target = new Vector3(-10 + Math.random() * 20, 0.9, -86 + Math.random() * 20);
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

  state.worldRefs.cleanupFns = cleanupFns;

  return {
    update(dt, t) {
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
          // Face direction of travel along X-axis
          item.mesh.rotation.y = item.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
        } else {
          item.mesh.position.z += item.speed * item.dir * dt;
          if (item.mesh.position.z >  260) item.mesh.position.z = -260;
          if (item.mesh.position.z < -260) item.mesh.position.z =  260;
          // Face direction of travel along Z-axis
          item.mesh.rotation.y = item.dir > 0 ? 0 : Math.PI;
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
            person.target = new Vector3(-20 + Math.random() * 40, 0.9, -96 + Math.random() * 30);
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
    if (Math.abs(x) < 280 && Math.abs(z) < 280) y = 0;
    else if (!roadBand) { y += Math.sin((x + nation.seed) * .008) * 3.5 + Math.cos((z - nation.seed) * .007) * 3; y += Math.sin((x + z + nation.seed) * .004) * 5.5; }
    if (nation.coastal) y -= Math.max(0, 18 - Math.abs(x + 340) * .05);
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
    ground: make('ground', tone), road: make('road', [.11,.12,.13]),
    building: make('building',[.43,.45,.48],[.16,.16,.18]), civic: make('civic',[.54,.52,.49],[.12,.12,.12]),
    dark: make('dark',[.24,.27,.31],[.1,.1,.1]), anchor: make('anchor',[.22,.26,.28],[.03,.03,.03],.72),
    car: make('car',[.16,.17,.19],[.3,.3,.3]), agent: make('agent',[.22,.23,.24]),
    water: make('water',[.08,.22,.32],[.4,.45,.5],.93), port: make('port',[.36,.37,.35]),
    ship: make('ship',[.27,.29,.31]), airstrip: make('air',[.15,.15,.15]), industrial: make('ind',[.37,.39,.4]),
  };
}
function point(rand) { return new Vector3(-170 + rand() * 340, .9, -170 + rand() * 340); }
function seeded(seed) { return () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; }; }