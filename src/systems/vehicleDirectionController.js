/**
 * vehicleDirectionController.js — Vehicle Direction & Rotation System
 * ==================================================================
 * Fixes vehicle orientation to match their actual direction of travel.
 * Separates movement direction from visual rotation.
 */

/**
 * Get the correct rotation for a vehicle moving in a specific direction.
 * Accounts for model mesh forward axis alignment.
 *
 * @param {number} dir Movement direction: 1 (forward) or -1 (backward)
 * @param {string} axis Movement axis: 'x' or 'z'
 * @param {string} meshForwardAxis Model's forward axis: '+z', '-z', '+x', '-x'
 * @returns {number} Rotation in radians to apply to mesh
 */
export function getVehicleRotation(dir, axis, meshForwardAxis = '+z') {
  // Standard forward direction is +z (0 radians in Babylon.js)
  // This assumes most vehicle models face +z direction by default

  let rotationY = 0;

  if (axis === 'x') {
    // Moving along X axis
    if (dir > 0) {
      // Moving towards +X (right)
      rotationY = Math.PI / 2;
    } else {
      // Moving towards -X (left)
      rotationY = -Math.PI / 2;
    }
  } else {
    // Moving along Z axis
    if (dir > 0) {
      // Moving towards +Z (forward)
      rotationY = 0;
    } else {
      // Moving towards -Z (backward)
      rotationY = Math.PI;
    }
  }

  // Account for mesh-specific forward axis
  // If model faces -Z instead of +Z, flip the rotation
  if (meshForwardAxis === '-z') {
    rotationY += Math.PI;
  } else if (meshForwardAxis === '+x') {
    // Model faces +X; rotate 90 degrees
    rotationY -= Math.PI / 2;
  } else if (meshForwardAxis === '-x') {
    // Model faces -X; rotate -90 degrees
    rotationY += Math.PI / 2;
  }
  // Default +z needs no adjustment

  return rotationY;
}

/**
 * Create a vehicle controller for standardized movement and rotation.
 * @param {Mesh} vehicleMesh The vehicle 3D mesh
 * @param {Object} options Configuration
 * @returns {Object} Controller object with movement methods
 */
export function createVehicleController(vehicleMesh, options = {}) {
  const { meshForwardAxis = '+z' } = options;

  return {
    /**
     * Move vehicle along an axis and update visual rotation.
     * @param {string} axis 'x' or 'z'
     * @param {number} dir Direction: 1 or -1
     * @param {number} speed Units per second
     * @param {number} dt Delta time
     */
    moveAndRotate(axis, dir, speed, dt) {
      const distance = speed * dir * dt;

      if (axis === 'x') {
        vehicleMesh.position.x += distance;
      } else {
        vehicleMesh.position.z += distance;
      }

      // Update visual rotation to face movement direction
      vehicleMesh.rotation.y = getVehicleRotation(dir, axis, meshForwardAxis);
    },

    /**
     * Teleport vehicle to position and update rotation.
     * @param {Vector3} position New position
     * @param {string} axis Movement axis
     * @param {number} dir Movement direction
     */
    teleport(position, axis = 'z', dir = 1) {
      vehicleMesh.position = position;
      vehicleMesh.rotation.y = getVehicleRotation(dir, axis, meshForwardAxis);
    },

    /**
     * Get forward vector in world space for this vehicle.
     * @returns {Vector3} Forward direction vector
     */
    getForwardVector() {
      const forward = new (require('@babylonjs/core')).Vector3(0, 0, 1);
      const rotationMatrix = (require('@babylonjs/core')).Matrix.RotationY(vehicleMesh.rotation.y);
      return (require('@babylonjs/core')).Vector3.TransformCoordinates(forward, rotationMatrix);
    }
  };
}

/**
 * Debug visualization: Draw vehicle forward vector.
 * Creates a line showing which direction vehicle considers "forward".
 *
 * @param {Scene} scene Babylon.js scene
 * @param {Mesh} vehicleMesh The vehicle mesh
 * @param {number} length Length of debug line
 */
export function addVehicleDebugVisualization(scene, vehicleMesh, length = 20) {
  const { Vector3, MeshBuilder, StandardMaterial, Color3 } = require('@babylonjs/core');

  // Create a line along vehicle's local Z axis (forward)
  const start = vehicleMesh.position.clone();
  const end = vehicleMesh.position.clone().addInPlace(
    Vector3.Forward().scale(length).applyRotationQuaternionInPlace(vehicleMesh.rotationQuaternion)
  );

  const tube = MeshBuilder.CreateTube(
    `vehicleForward_${vehicleMesh.uniqueId}`,
    [start, end],
    0.3,
    undefined,
    scene,
    false
  );

  const mat = new StandardMaterial(`vehicleDebugMat_${vehicleMesh.uniqueId}`, scene);
  mat.emissiveColor = new Color3(0, 1, 0); // Green
  tube.material = mat;

  // Update line each frame to follow vehicle
  // Note: Would need to be called in game loop
  return {
    update() {
      tube.dispose();
      const newStart = vehicleMesh.position.clone();
      const newEnd = vehicleMesh.position.clone().addInPlace(
        Vector3.Forward().scale(length).applyRotationQuaternionInPlace(vehicleMesh.rotationQuaternion)
      );
      return MeshBuilder.CreateTube(
        `vehicleForward_${vehicleMesh.uniqueId}`,
        [newStart, newEnd],
        0.3,
        undefined,
        scene
      );
    }
  };
}
