import { Camera } from '../Renderer';

export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

export function createVector3D(x: number, y: number, z: number): Vector3D {
  return { x, y, z };
}

export function createStarfield(count: number, depth: number, spread: number): Vector3D[] {
  const stars: Vector3D[] = [];
  
  for (let i = 0; i < count; i++) {
    // Distribute stars in a spherical space around the viewer
    const theta = Math.random() * Math.PI * 2; // Angle around y-axis
    const phi = Math.random() * Math.PI - Math.PI / 2; // Angle from xz-plane
    const r = Math.random() * spread + depth / 2; // Distance from origin
    
    // Convert spherical coordinates to cartesian
    const x = r * Math.cos(phi) * Math.cos(theta);
    const y = r * Math.sin(phi);
    const z = r * Math.cos(phi) * Math.sin(theta);
    
    stars.push(createVector3D(x, y, z));
  }
  
  return stars;
}

export function project(point: Vector3D, camera: Camera, width: number, height: number): { x: number, y: number } {
  // Calculate camera-to-point vector
  const dx = point.x - camera.position.x;
  const dy = point.y - camera.position.y;
  const dz = point.z - camera.position.z;
  
  // Calculate camera forward vector (from camera position to look-at point)
  const forwardX = camera.lookAt.x - camera.position.x;
  const forwardY = camera.lookAt.y - camera.position.y;
  const forwardZ = camera.lookAt.z - camera.position.z;
  
  // Normalize forward vector
  const forwardLength = Math.sqrt(forwardX * forwardX + forwardY * forwardY + forwardZ * forwardZ);
  const forwardNormX = forwardX / forwardLength;
  const forwardNormY = forwardY / forwardLength;
  const forwardNormZ = forwardZ / forwardLength;
  
  // Calculate right vector (cross product of forward and up)
  const rightX = forwardNormY * camera.up.z - forwardNormZ * camera.up.y;
  const rightY = forwardNormZ * camera.up.x - forwardNormX * camera.up.z;
  const rightZ = forwardNormX * camera.up.y - forwardNormY * camera.up.x;
  
  // Normalize right vector
  const rightLength = Math.sqrt(rightX * rightX + rightY * rightY + rightZ * rightZ);
  const rightNormX = rightX / rightLength;
  const rightNormY = rightY / rightLength;
  const rightNormZ = rightZ / rightLength;
  
  // Calculate true up vector (cross product of right and forward)
  const trueUpX = rightNormY * forwardNormZ - rightNormZ * forwardNormY;
  const trueUpY = rightNormZ * forwardNormX - rightNormX * forwardNormZ;
  const trueUpZ = rightNormX * forwardNormY - rightNormY * forwardNormX;
  
  // Project point onto camera viewing plane
  const dotProductForward = dx * forwardNormX + dy * forwardNormY + dz * forwardNormZ;
  
  if (dotProductForward <= 0) {
    // Point is behind camera
    return { x: -10000, y: -10000 }; // Return a point well off-screen
  }
  
  // Calculate projected position on camera plane
  const projScale = camera.viewDistance / dotProductForward;
  
  // Calculate position relative to forward vector
  const rightComponent = (dx * rightNormX + dy * rightNormY + dz * rightNormZ) * projScale;
  const upComponent = (dx * trueUpX + dy * trueUpY + dz * trueUpZ) * projScale;
  
  // Convert to screen coordinates
  const x = width / 2 + rightComponent;
  const y = height / 2 - upComponent; // Negative because y-axis is flipped in screen space
  
  return { x, y };
}

export function calculatePerspective(z: number, minSize: number, maxSize: number, viewDistance: number): number {
  // Calculate scale based on distance
  const dist = Math.abs(z);
  const scale = viewDistance / (viewDistance + dist);
  
  // Apply scale to size range
  return Math.max(0, minSize + (maxSize - minSize) * scale);
}

export function distance3D(a: Vector3D, b: Vector3D): number {
  return Math.sqrt(
    Math.pow(a.x - b.x, 2) +
    Math.pow(a.y - b.y, 2) +
    Math.pow(a.z - b.z, 2)
  );
}

export function normalize3D(vec: Vector3D): Vector3D {
  const length = Math.sqrt(vec.x * vec.x + vec.y * vec.y + vec.z * vec.z);
  if (length === 0) return { x: 0, y: 0, z: 0 };
  
  return {
    x: vec.x / length,
    y: vec.y / length,
    z: vec.z / length
  };
}