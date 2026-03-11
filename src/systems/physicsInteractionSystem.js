/**
 * physicsInteractionSystem.js — World Interaction Logic
 * ======================================================
 * All environmental hazard checks run here every tick:
 *   • NPC vs Car  → instant death (ragdoll effect)
 *   • NPC + Water → drowning (3s timer then death)
 *   • NPC + Car (board) → ride along: NPC locks to car seat, car drives, NPC exits
 *   • NPC shot    → kill (external trigger via eventBus NPC_SHOT)
 *   • Building fire → burns mesh tint, debuffs stats, needs repair action
 *
 * Each agent has an extended FSM in state.worldRefs.agents[i]:
 *   { mesh, target, speed, status, drownTimer, onFire, passenger: { car, seat } }
 *
 * Buildings track fire in state.worldRefs.worldMeshes[i].metadata.onFire
 */

import { Vector3, Color3 } from '@babylonjs/core';
import { emit, on } from './eventBus.js';
import { setMessage } from '../ui/hud.js';

// ── Constants ─────────────────────────────────────────────────────────────────
const WATER_Y_THRESHOLD   =  3.0;   // below this Y → in water. Coastal nations have sea at y≈4
const DROWN_TIME          =  3.0;   // seconds in water before death
const CAR_COLLISION_RADIUS = 5.0;   // Xz-plane distance to trigger car hit
const BOARD_RADIUS         = 7.0;   // Distance at which NPC can board a passing car
const BOARD_CHANCE_PER_S   = 0.08;  // Probability per second of boarding
const MIN_BOARD_RIDETIME   = 6.0;   // Minimum ride duration in seconds
const MAX_BOARD_RIDETIME   = 18.0;  // Max ride duration

// Fire spread/duration
const FIRE_SPREAD_RADIUS   = 40;    // World units. Nearby buildings can catch.
const FIRE_SPREAD_CHANCE   = 0.0006;// Per second, per neighbouring building pair

// ── Fire material cache ───────────────────────────────────────────────────────
// We tint the mesh emissive to simulate glow; no shader change needed.
const _FIRE_EMISSIVE    = new Color3(1.0, 0.28, 0.02);
const _CHARRED_EMISSIVE = new Color3(0.12, 0.06, 0.02);
const _NORMAL_EMISSIVE  = new Color3(0.0,  0.0,  0.0);

function setFireVisual(mesh, onFire) {
  if (!mesh) return;
  const target = onFire ? _FIRE_EMISSIVE : _CHARRED_EMISSIVE;

  const apply = (m) => {
    if (m.material) {
      // Handle both StandardMaterial and PBRMaterial
      m.material.emissiveColor = target.clone();
      if (onFire && m.material.emissiveIntensity !== undefined) {
        m.material.emissiveIntensity = 1.0;
      }
    }
  };

  apply(mesh);
  mesh.getChildMeshes().forEach(apply);
}

function clearFireVisual(mesh) {
  if (!mesh) return;
  const apply = (m) => {
    if (m.material) {
      m.material.emissiveColor = _NORMAL_EMISSIVE.clone();
      if (m.material.emissiveIntensity !== undefined) {
        m.material.emissiveIntensity = 0;
      }
    }
  };
  apply(mesh);
  mesh.getChildMeshes().forEach(apply);
}

// ── NPC death animation (simple: sink + fade) ─────────────────────────────────

function killAgent(agent, reason) {
  if (agent.status === 'dead') return;
  agent.status = 'dead';
  agent.deathReason = reason;
  // Release from car if riding
  if (agent.passenger) {
    agent.passenger = null;
  }
  // Visual: tilt and sink
  agent.mesh.rotation.x = Math.PI / 2;   // fall flat
  agent.mesh.isVisible   = true;
  // Fade out handled in update loop (deathFadeTimer)
  agent.deathFadeTimer   = 3.0;
  emit('NPC_DIED', { reason, position: agent.mesh.position.clone() });
}

// ── Intersection helpers ──────────────────────────────────────────────────────

function xzDist(a, b) {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dz * dz);
}

// ── Fire: start a building fire ───────────────────────────────────────────────
export function igniteMesh(mesh, state) {
  if (!mesh?.metadata) mesh.metadata = {};
  if (mesh.metadata.onFire) return;      // already burning
  mesh.metadata.onFire    = true;
  mesh.metadata.fireDuration = 0;        // how long it has been burning
  setFireVisual(mesh, true);
  setMessage(`🔥 A building is on fire! Respond before it spreads.`);
  emit('BUILDING_FIRE', { position: mesh.position.clone() });
}

// ── Extinguish a building (called by player action "extinguish") ──────────────
export function extinguishMesh(mesh) {
  if (!mesh?.metadata?.onFire) return;
  mesh.metadata.onFire    = false;
  mesh.metadata.wasCharred = true;
  setFireVisual(mesh, false);            // charred look
  setMessage('🚒 Fire extinguished. Building is charred — inspect for damage.');
}

// ── Subscribe to external triggers ───────────────────────────────────────────
let _subsActive = false;
export function subscribeInteractions(state) {
  if (_subsActive) return;
  _subsActive = true;

  // Rival VENGEFUL event can ignite the sabotage target building
  on('BUILDING_SABOTAGE', ({ buildingType }) => {
    const candidates = state.worldRefs.worldMeshes.filter(m =>
      m?.name?.includes(buildingType) && !m?.metadata?.onFire
    );
    if (candidates.length > 0) {
      igniteMesh(candidates[Math.floor(Math.random() * candidates.length)], state);
    }
  });

  // NPC_SHOT: kill matching agent by mesh name (future: projectile system)
  on('NPC_SHOT', ({ agentId }) => {
    const ag = state.worldRefs.agents.find(a => a.mesh?.name === agentId);
    if (ag) killAgent(ag, 'shot');
  });
}

// ── Main per-frame update ─────────────────────────────────────────────────────

export function updatePhysicsInteractions(state, dt) {
  const agents  = state.worldRefs.agents;
  const traffic = state.worldRefs.traffic;
  const meshes  = state.worldRefs.worldMeshes;
  const nation  = state.nations[state.currentNationIndex];
  const isCoastal = nation?.coastal ?? false;

  // ── 1. NPC lifecycle ────────────────────────────────────────────────────────
  for (const ag of agents) {

    // Fade out dead agents
    if (ag.status === 'dead') {
      if (ag.deathFadeTimer > 0) {
        ag.deathFadeTimer -= dt;
        const alpha = Math.max(0, ag.deathFadeTimer / 3.0);
        const applyAlpha = (m) => {
            if (m.material) m.material.alpha = alpha;
        };
        applyAlpha(ag.mesh);
        ag.mesh.getChildMeshes().forEach(applyAlpha);
        // Sink into ground
        ag.mesh.position.y -= 0.4 * dt;
      } else {
        ag.mesh.isVisible = false;
        ag.mesh.getChildMeshes().forEach(m => m.isVisible = false);
      }
      continue;
    }

    // ── 1a. Passenger (riding in car) ────────────────────────────────────────
    if (ag.passenger) {
      const car = ag.passenger.car;
      // Attach NPC to the car's seat (offset from car center)
      const seatOffset = new Vector3(ag.passenger.side * 1.2, 0.9, 0.8);
      ag.mesh.position.copyFrom(car.mesh.position).addInPlace(seatOffset);
      ag.mesh.rotation.y = car.mesh.rotation.y;
      ag.passenger.rideTime -= dt;
      if (ag.passenger.rideTime <= 0) {
        // Disembark: jump off at current car position
        ag.target = ag.mesh.position.clone().addInPlace(
          new Vector3(-20 + Math.random() * 40, 0, -20 + Math.random() * 40)
        );
        ag.target.y = 0.9;
        ag.passenger = null;
        car.passengers = (car.passengers || 0) - 1;
      }
      continue;
    }

    const aPos = ag.mesh.position;

    // ── 1b. Water drowning ────────────────────────────────────────────────────
    if (isCoastal && aPos.y < WATER_Y_THRESHOLD && aPos.y < 3.5) {
      ag.drownTimer = (ag.drownTimer || 0) + dt;
      if (ag.drownTimer < DROWN_TIME) {
        // Thrash in place (bobbing)
        ag.mesh.position.y = 2.0 + Math.sin(ag.drownTimer * 6) * 0.3;
        if (!ag._drowningMsg) {
          ag._drowningMsg = true;
          setMessage('🌊 A civilian has fallen in the water and cannot swim!');
        }
      } else {
        killAgent(ag, 'drowned');
      }
      continue;
    } else {
      ag.drownTimer = 0;
      ag._drowningMsg = false;
    }

    // ── 1c. Car collision ─────────────────────────────────────────────────────
    for (const car of traffic) {
      if (car.ship) continue; // ships don't kill pedestrians
      if (car.passengers > 0 && car.passengers <= 2) {
        // This car already has a passenger — check boarding
      }
      const dist = xzDist(aPos, car.mesh.position);
      if (dist < CAR_COLLISION_RADIUS) {
        // Hit! kill the NPC
        killAgent(ag, 'car_collision');
        setMessage('🚗 A civilian was struck by a vehicle.');
        break;
      }

      // ── 1d. Boarding: NPC approaches, car slows, NPC boards ───────────────
      if (!ag.passenger && dist < BOARD_RADIUS && (car.passengers || 0) < 2) {
        if (Math.random() < BOARD_CHANCE_PER_S * dt) {
          ag.passenger = {
            car,
            side: car.passengers === 0 ? -1 : 1,  // left or right seat
            rideTime: MIN_BOARD_RIDETIME + Math.random() * (MAX_BOARD_RIDETIME - MIN_BOARD_RIDETIME),
          };
          car.passengers = (car.passengers || 0) + 1;
          // Snap NPC visually into car immediately
          ag.mesh.rotation.y = car.mesh.rotation.y;
          break;
        }
      }
    }
  }

  // ── 2. Building fire spread & stat impact ───────────────────────────────────
  let firesActive = 0;
  const burningBuildings = meshes.filter(m => m?.metadata?.onFire);
  firesActive = burningBuildings.length;

  for (const b of burningBuildings) {
    b.metadata.fireDuration += dt;

    // Flicker emissive intensity
    const flicker = 0.8 + Math.sin(Date.now() * 0.012) * 0.2;
    const applyFlicker = (m) => {
      if (m.material) {
        m.material.emissiveColor.copyFrom(_FIRE_EMISSIVE).scaleInPlace(flicker);
      }
    };
    applyFlicker(b);
    b.getChildMeshes().forEach(applyFlicker);

    // Stat debuff while burning
    state.approval   -= 0.02 * dt;
    state.legitimacy -= 0.01 * dt;

    // Spread to nearby buildings (probabilistic)
    for (const other of meshes) {
      if (!other || other === b || other.metadata?.onFire) continue;
      if (!other.metadata) other.metadata = {};
      const d = xzDist(b.position, other.position);
      if (d < FIRE_SPREAD_RADIUS && Math.random() < FIRE_SPREAD_CHANCE * dt * 60) {
        igniteMesh(other, state);
        setMessage('🔥 The fire is spreading! More buildings are at risk.');
      }
    }

    // Auto-extinguish after 120s if buildings.police > 0 (fire department)
    if (b.metadata.fireDuration > 120 && state.buildings.police > 0) {
      extinguishMesh(b);
      setMessage('🚒 Police/fire services contained the blaze after 2 minutes.');
    }
  }

  // If fires are active drain the player's budget too
  if (firesActive > 0) {
    state.cash -= firesActive * 12 * dt;   // Running fire costs money
  }
}
