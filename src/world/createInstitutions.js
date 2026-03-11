import { Color3, Color4, MeshBuilder, StandardMaterial, Vector3, ParticleSystem, Texture } from '@babylonjs/core';
import { instantiateModel, getModelScale } from '../systems/assetLoader.js';

/** Emit a sparkling construction burst at the given world position. */
function spawnConstructionBurst(scene, position) {
  const ps = new ParticleSystem('constructBurst', 120, scene);
  // Use a built-in Babylon flare texture procedurally encoded as data URI
  ps.particleTexture = new Texture('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAANElEQVQoU2NkIAAY////z8DAwMBIjCZGBhQNpGoiwgZSDSRqIsYGUg0kaqLABhINJGoixgYAhRMECF2PZSMAAAAASUVORK5CYII=', scene);
  ps.emitter = position.clone();
  ps.minEmitBox = new Vector3(-4, 0, -4);
  ps.maxEmitBox = new Vector3( 4, 2,  4);
  ps.color1 = new Color4(1.0, 0.88, 0.55, 1.0); // warm gold
  ps.color2 = new Color4(0.6, 0.85, 1.0,  1.0); // cool blue
  ps.colorDead = new Color4(0.2, 0.2, 0.2, 0.0);
  ps.minSize = 0.8; ps.maxSize = 2.5;
  ps.minLifeTime = 0.6; ps.maxLifeTime = 1.4;
  ps.emitRate = 180;
  ps.blendMode = ParticleSystem.BLENDMODE_ADD;
  ps.gravity = new Vector3(0, -14, 0);
  ps.direction1 = new Vector3(-6, 14, -6);
  ps.direction2 = new Vector3( 6, 22,  6);
  ps.minAngularSpeed = 0; ps.maxAngularSpeed = Math.PI;
  ps.minEmitPower = 1; ps.maxEmitPower = 4;
  ps.updateSpeed = 0.016;
  ps.start();
  setTimeout(() => { ps.stop(); setTimeout(() => ps.dispose(), 1500); }, 400);
}

export function spawnInstitution(scene, shadows, type, point, state) {
  const mat = new StandardMaterial(`${type}-mat-${Date.now()}`, scene);
  let mesh;

  // Try loading GLB first
  const model = instantiateModel(type === 'housing' ? 'housing' : type, scene);
  if (model) {
    mesh = model;
    const s = getModelScale(type);
    mesh.scaling.set(s, s, s);
    mesh.position.copyFrom(point);
    // Real models often have pivot at bottom; if not, we compensate:
    // Some assets are centered, some on floor.
    // For Quaternius/Kenney, we usually leave Y=0 as the ground if the model is set up correctly.
    mesh.position.y = 0.1; 

    // Metadata update for specific types
    if (type === 'housing')   { state.buildings.housing += 1;   state.population += 120; state.legitimacy += 0.6; }
    if (type === 'school')    { state.buildings.schools += 1;   state.education += 3;    state.approval += 1.2; }
    if (type === 'store')     { state.buildings.stores += 1;    state.cash += 180; }
    if (type === 'police')    { state.buildings.police += 1;    state.security += 4; }
    if (type === 'acc')       { state.buildings.acc += 1;       state.corruption -= 3;   state.legitimacy += 2; }
    if (type === 'dec')       { state.buildings.dec += 1;       state.security += 2;     state.legitimacy += 1; }
    if (type === 'mine')      { state.buildings.mines += 1;      state.steel += 8; }
    if (type === 'refinery')  { state.buildings.refineries += 1; state.fuel += 6; }
    if (type === 'barracks')  { state.buildings.barracks += 1;  state.security += 3; }
    if (type === 'base')      { state.buildings.bases += 1;     state.security += 6;     state.influence += 1; }
    if (type === 'stadium')   { state.buildings.stadiums += 1;  state.approval += 2;     state.sportsPrestige += 3; }

    // Recursive shadows for all parts of the GLB
    mesh.getChildMeshes().forEach(m => shadows.addShadowCaster(m));
  } else {
    // Fallback to primitive boxes if asset is missing
    switch (type) {
      case 'housing':   mat.diffuseColor = new Color3(0.56, 0.57, 0.6);  mesh = MeshBuilder.CreateBox(`housing-${Date.now()}`, { width: 16, depth: 16, height: 20 }, scene); mesh.position = new Vector3(point.x, 10, point.z); state.buildings.housing += 1; state.population += 120; state.legitimacy += 0.6; break;
      case 'school':    mat.diffuseColor = new Color3(0.52, 0.49, 0.43); mesh = MeshBuilder.CreateBox(`school-${Date.now()}`, { width: 24, depth: 18, height: 10 }, scene); mesh.position = new Vector3(point.x, 5, point.z); state.buildings.schools += 1; state.education += 3; state.approval += 1.2; break;
      case 'store':     mat.diffuseColor = new Color3(0.35, 0.37, 0.39); mesh = MeshBuilder.CreateBox(`store-${Date.now()}`, { width: 20, depth: 16, height: 8 }, scene); mesh.position = new Vector3(point.x, 4, point.z); state.buildings.stores += 1; state.cash += 180; break;
      case 'police':    mat.diffuseColor = new Color3(0.22, 0.25, 0.31); mesh = MeshBuilder.CreateBox(`police-${Date.now()}`, { width: 18, depth: 18, height: 12 }, scene); mesh.position = new Vector3(point.x, 6, point.z); state.buildings.police += 1; state.security += 4; break;
      case 'acc':       mat.diffuseColor = new Color3(0.4, 0.42, 0.45);  mesh = MeshBuilder.CreateBox(`acc-${Date.now()}`, { width: 18, depth: 18, height: 13 }, scene); mesh.position = new Vector3(point.x, 6.5, point.z); state.buildings.acc += 1; state.corruption -= 3; state.legitimacy += 2; break;
      case 'dec':       mat.diffuseColor = new Color3(0.31, 0.35, 0.36); mesh = MeshBuilder.CreateBox(`dec-${Date.now()}`, { width: 18, depth: 18, height: 13 }, scene); mesh.position = new Vector3(point.x, 6.5, point.z); state.buildings.dec += 1; state.security += 2; state.legitimacy += 1; break;
      case 'mine':      mat.diffuseColor = new Color3(0.38, 0.34, 0.31); mesh = MeshBuilder.CreateBox(`mine-${Date.now()}`, { width: 24, depth: 24, height: 9 }, scene); mesh.position = new Vector3(point.x, 4.5, point.z); state.buildings.mines += 1; state.steel += 8; break;
      case 'refinery':  mat.diffuseColor = new Color3(0.34, 0.37, 0.39); mesh = MeshBuilder.CreateBox(`refinery-${Date.now()}`, { width: 28, depth: 20, height: 14 }, scene); mesh.position = new Vector3(point.x, 7, point.z); state.buildings.refineries += 1; state.fuel += 6; break;
      case 'barracks':  mat.diffuseColor = new Color3(0.27, 0.31, 0.28); mesh = MeshBuilder.CreateBox(`barracks-${Date.now()}`, { width: 24, depth: 18, height: 10 }, scene); mesh.position = new Vector3(point.x, 5, point.z); state.buildings.barracks += 1; state.security += 3; break;
      case 'base':      mat.diffuseColor = new Color3(0.24, 0.28, 0.29); mesh = MeshBuilder.CreateBox(`base-${Date.now()}`, { width: 34, depth: 26, height: 12 }, scene); mesh.position = new Vector3(point.x, 6, point.z); state.buildings.bases += 1; state.security += 6; state.influence += 1; break;
      case 'stadium':   mat.diffuseColor = new Color3(0.48, 0.47, 0.44); mesh = MeshBuilder.CreateCylinder(`stadium-${Date.now()}`, { diameterTop: 22, diameterBottom: 28, height: 8, tessellation: 20 }, scene); mesh.position = new Vector3(point.x, 4, point.z); state.buildings.stadiums += 1; state.approval += 2; state.sportsPrestige += 3; break;
      default: return null;
    }
    mesh.material = mat;
    shadows.addShadowCaster(mesh);
  }
  mesh.receiveShadows=true;
  shadows.addShadowCaster(mesh);
  state.worldRefs.worldMeshes.push(mesh);

  // Add Compound Rapier Collider
  const RAPIER = state.worldRefs.rapier;
  const physicsWorld = state.worldRefs.rapierWorld;
  if (RAPIER && physicsWorld && mesh) {
    const bodyDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(mesh.position.x, mesh.position.y, mesh.position.z);
    const rigidBody = physicsWorld.createRigidBody(bodyDesc);
    mesh.computeWorldMatrix(true);
    const boundingInfo = mesh.getBoundingInfo();
    const extents = boundingInfo.boundingBox.extendSize;
    // Compound collider: base portion and a slightly inset roof portion
    const baseCollider = RAPIER.ColliderDesc.cuboid(extents.x, extents.y * 0.8, extents.z)
        .setTranslation(0, -extents.y * 0.2, 0);
    const roofCollider = RAPIER.ColliderDesc.cuboid(extents.x * 0.8, extents.y * 0.2, extents.z * 0.8)
        .setTranslation(0, extents.y * 0.8, 0);
    physicsWorld.createCollider(baseCollider, rigidBody);
    physicsWorld.createCollider(roofCollider, rigidBody);
    mesh.metadata = { ...mesh.metadata, rigidBody };
  }

  // 🎇 Spawn construction particle burst
  spawnConstructionBurst(scene, mesh.position);

  return mesh;
}