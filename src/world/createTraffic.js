import { MeshBuilder, StandardMaterial, Color3, Vector3 } from '@babylonjs/core';
import { instantiateModel, getModelScale } from '../systems/assetLoader.js';

export function createTraffic(scene,shadows){
  const cars=[],agents=[],ships=[];
  
  // 🚗 Cars
  for(let i=0;i<16;i++){
    const type = i % 2 === 0 ? 'car_a' : 'car_b';
    const car = instantiateModel(type, scene);
    if (!car) continue;
    
    const lane = i % 2 === 0 ? -10 : 10;
    car.position = new Vector3(-220 + i * 20, 0.1, lane * 4);
    const s = getModelScale(type);
    car.scaling.set(s, s, s);
    car.getChildMeshes().forEach(m => shadows.addShadowCaster(m));
    
    cars.push({
      mesh: car,
      speed: 8 + Math.random() * 6,
      axis: i % 2 === 0 ? 'x' : 'z',
      dir: i % 3 === 0 ? -1 : 1
    });
  }

  // 🚶 Agents
  for(let i=0;i<20;i++){
    const a = instantiateModel('agent_a', scene);
    if (!a) continue;
    
    a.position = new Vector3(-90 + Math.random() * 180, 0.1, -90 + Math.random() * 180);
    const s = getModelScale('agent_a');
    a.scaling.set(s, s, s);
    a.getChildMeshes().forEach(m => shadows.addShadowCaster(m));
    
    agents.push({
      mesh: a,
      target: p(),
      speed: 1 + Math.random() * .8
    });
  }

  // 🚢 Ships
  for(let i=0;i<3;i++){
    const s = instantiateModel('ship', scene);
    if (!s) continue;
    
    s.position = new Vector3(-330 - i * 40, 0.1, -250 + i * 40);
    const scale = getModelScale('ship');
    s.scaling.set(scale, scale, scale);
    s.getChildMeshes().forEach(m => shadows.addShadowCaster(m));
    
    ships.push({
      mesh: s,
      phase: i * 0.33,
      ship: true,
      speed: 1.5,
      dir: 1
    });
  }

  return {
    update(dt, t) {
      // Logic remains same, but we reuse the state-based items if passed, 
      // or internal ones for this local creation.
      // (Simplified: using the local arrays created above)
      const all = [...cars, ...agents, ...ships];
      for (const item of all) {
        if (item.ship) {
          item.mesh.position.x += item.speed * item.dir * dt;
          if (item.mesh.position.x > -120) item.dir = -1;
          if (item.mesh.position.x < -520) item.dir = 1;
          item.mesh.position.z += Math.sin(t * 0.15 + item.mesh.uniqueId) * dt * 0.8;
          item.mesh.rotation.y = item.dir > 0 ? 0 : Math.PI;
          continue;
        }
        
        // Traffic movement
        if (item.axis) {
            if (item.axis === 'x') {
              item.mesh.position.x += item.speed * item.dir * dt;
              if (item.mesh.position.x > 260) item.mesh.position.x = -260;
              if (item.mesh.position.x < -260) item.mesh.position.x = 260;
              item.mesh.rotation.y = item.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
            } else {
              item.mesh.position.z += item.speed * item.dir * dt;
              if (item.mesh.position.z > 260) item.mesh.position.z = -260;
              if (item.mesh.position.z < -260) item.mesh.position.z = 260;
              item.mesh.rotation.y = item.dir > 0 ? 0 : Math.PI;
            }
        } else if (item.target) {
            // Agent movement
            const d = item.target.subtract(item.mesh.position);
            d.y = 0;
            if (d.lengthSquared() < 4) {
              item.target = p();
              continue;
            }
            d.normalize();
            item.mesh.position.addInPlace(d.scale(item.speed * dt));
            item.mesh.rotation.y = Math.atan2(d.x, d.z);
        }
      }
    }
  }
}
function p(){return new Vector3(-180+Math.random()*360,.9,-180+Math.random()*360)}
