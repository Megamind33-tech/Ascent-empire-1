import RAPIER from '@dimforge/rapier3d-compat';
export async function createRapierWorld(){ await RAPIER.init(); const world = new RAPIER.World({x:0,y:-9.81,z:0}); return { RAPIER, world }; }
export function createFixedBox(world, RAPIER, position, size){ const body = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(position.x,position.y,position.z)); world.createCollider(RAPIER.ColliderDesc.cuboid(size.x,size.y,size.z), body); return body; }
export function stepRapier(world, dt){ world.timestep = Math.min(dt, 1/30); world.step(); }