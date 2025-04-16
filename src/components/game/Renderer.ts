import { GameObject, Ship, Obstacle, Star, ParticleEffect, PowerUp, Projectile } from './types';
import { project, calculatePerspective, createVector3D } from './utils/math3d';

// Define Camera interface here instead of importing it
interface Camera {
  position: { x: number; y: number; z: number };
  lookAt: { x: number; y: number; z: number };
  up: { x: number; y: number; z: number };
  fov: number;
  aspect: number;
  near: number;
  far: number;
  viewDistance: number;
}

// Implementation of createCamera function in this file
export function createCamera(position: { x: number; y: number; z: number }, lookAt: { x: number; y: number; z: number }): Camera {
  return {
    position,
    lookAt,
    up: { x: 0, y: 1, z: 0 },
    fov: 75,
    aspect: 1,
    near: 0.1,
    far: 2000,
    viewDistance: 1000
  };
}

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private width: number;
  private height: number;
  private camera: Camera;
  private readonly maxTrailLength = 20;
  private readonly glowCanvas: HTMLCanvasElement;
  private readonly glowCtx: CanvasRenderingContext2D;

  constructor(ctx: CanvasRenderingContext2D, width: number, height: number) {
    this.ctx = ctx;
    this.width = width;
    this.height = height;

    // Initialize camera with better 3D positioning
    this.camera = createCamera(
      { x: 0, y: 15, z: 50 }, // Camera positioned behind the player
      { x: 0, y: 0, z: 0 }    // Looking at the player
    );
    this.camera.aspect = width / height;

    // Create offscreen canvas for glow effects
    this.glowCanvas = document.createElement('canvas');
    this.glowCanvas.width = this.width;
    this.glowCanvas.height = this.height;
    this.glowCtx = this.glowCanvas.getContext('2d', { alpha: true })!;
  }

  private isValidCoordinate(x: number, y: number, z: number = 0): boolean {
    return Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z) &&
           x >= -this.width && x <= this.width * 2 &&
           y >= -this.height && y <= this.height * 2;
  }

  private createGlow(x: number, y: number, radius: number, color: string, intensity: number = 1): void {
    if (!this.isValidCoordinate(x, y) || radius <= 0) return;

    this.glowCtx.save();
    this.glowCtx.globalCompositeOperation = 'lighter';
    
    try {
      const gradient = this.glowCtx.createRadialGradient(x, y, 0, x, y, radius);
      
      // Parse color and create rgba strings
      const rgbMatch = color.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
      if (!rgbMatch) {
        console.warn('Invalid color format:', color);
        return;
      }
      
      const [_, r, g, b] = rgbMatch.map(Number);
      gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${0.8 * intensity})`);
      gradient.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, ${0.4 * intensity})`);
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

      this.glowCtx.fillStyle = gradient;
      this.glowCtx.beginPath();
      this.glowCtx.arc(x, y, radius, 0, Math.PI * 2);
      this.glowCtx.fill();
    } catch (error) {
      console.warn('Failed to create glow effect:', error);
    }
    
    this.glowCtx.restore();
  }

  private drawObject3D(vertices: Vector3D[], rotation: Vector3D, position: Vector3D, color: string, opacity: number = 1, glow: boolean = false) {
    if (!this.isValidCoordinate(position.x, position.y, position.z)) return;

    const matrix = createRotationMatrix(rotation.x, rotation.y, rotation.z);
    const transformedVertices = vertices.map(v => {
      const rotated = rotatePoint(v, matrix);
      const translated = {
        x: rotated.x + position.x,
        y: rotated.y + position.y,
        z: rotated.z + position.z
      };
      return project(translated, this.camera, this.width, this.height);
    });

    if (!transformedVertices.every(v => this.isValidCoordinate(v.x, v.y))) return;

    // Sort vertices by Z for proper depth rendering
    transformedVertices.sort((a, b) => b.z - a.z);

    // Draw glow effect
    if (glow) {
      const center = project(position, this.camera, this.width, this.height);
      const glowRadius = Math.max(...vertices.map(v => Math.hypot(v.x, v.y))) * 1.5;
      this.createGlow(center.x, center.y, glowRadius, color, opacity);
    }

    // Draw object
    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.strokeStyle = color;
    this.ctx.fillStyle = color.replace('rgb', 'rgba').replace(')', `, ${opacity})`);
    this.ctx.lineWidth = 2;
    
    this.ctx.moveTo(transformedVertices[0].x, transformedVertices[0].y);
    for (let i = 1; i < transformedVertices.length; i++) {
      this.ctx.lineTo(transformedVertices[i].x, transformedVertices[i].y);
    }
    this.ctx.closePath();
    this.ctx.fill();
    this.ctx.stroke();
    this.ctx.restore();
  }

  // Update to allow setting both camera position and target
  public updateCamera(position: Vector3D, target?: Vector3D): void {
    this.camera.position = { ...position };
    
    if (target) {
      this.camera.lookAt = { ...target };
    }
  }

  public renderShip(ship: Ship): void {
    const projected = project(ship.position, this.camera, this.width, this.height);
    if (!this.isValidCoordinate(projected.x, projected.y)) return;

    // Render shield effect with improved visuals
    if (ship.shield > 0) {
      const shieldRadius = calculatePerspective(ship.position.z, 25, 40, this.camera.viewDistance);
      if (shieldRadius > 0) {
        // Shield ripple effect
        const time = performance.now() / 1000;
        const rippleOffset = Math.sin(time * 2) * 3;
        const opacity = 0.2 + Math.sin(time * 3) * 0.1;
        const shieldStrength = ship.shield / 100;

        this.ctx.save();
        
        // Draw shield layers
        for (let i = 0; i < 2; i++) {
          const radius = shieldRadius + rippleOffset + i * 3;
          this.ctx.beginPath();
          this.ctx.strokeStyle = `hsla(200, 100%, ${50 + i * 10}%, ${shieldStrength * opacity * (1 - i * 0.3)})`;
          this.ctx.lineWidth = 1.5 - i * 0.5;
          this.ctx.setLineDash([3, 5]);
          this.ctx.lineDashOffset = time * 30 * (i + 1);
          this.ctx.arc(projected.x, projected.y, radius, 0, Math.PI * 2);
          this.ctx.stroke();
        }
        
        this.ctx.restore();

        // Shield glow
        this.createGlow(projected.x, projected.y, shieldRadius * 1.1, 'rgb(0, 150, 255)', shieldStrength * 0.3);
      }
    }

    // Create 3D ship model vertices based on ship's dimensions
    const vertices = this.create3DShipVertices(ship.scale);
    
    // Apply ship's rotation to vertices
    const transformedVertices = this.transformVertices(vertices, ship.position, ship.rotation);
    
    // Render the ship as a 3D model with faces and lighting
    this.render3DShip(transformedVertices, ship);
    
    // Add engine glow at the back of the ship if moving
    if (ship.isMoving) {
      const enginePos = {
        x: ship.position.x - Math.sin(ship.rotation.y) * ship.scale.z * 0.6,
        y: ship.position.y,
        z: ship.position.z - Math.cos(ship.rotation.y) * ship.scale.z * 0.6
      };
      
      const projectedEngine = project(enginePos, this.camera, this.width, this.height);
      if (this.isValidCoordinate(projectedEngine.x, projectedEngine.y)) {
        const glowSize = ship.isMoving ? 12 : 8;
        this.createGlow(projectedEngine.x, projectedEngine.y, glowSize, 'rgb(0, 200, 255)', ship.isMoving ? 0.7 : 0.4);
      }
    }
  }

  private create3DShipVertices(scale: Vector3D): Vector3D[] {
    // Define ship vertices for a cooler spaceship shape
    const w = scale.x;
    const h = scale.y;
    const l = scale.z;
    
    return [
      // Nose
      { x: 0, y: 0, z: -l * 0.5 },
      // Main body vertices
      { x: -w * 0.3, y: -h * 0.2, z: -l * 0.3 },
      { x: w * 0.3, y: -h * 0.2, z: -l * 0.3 },
      { x: w * 0.5, y: 0, z: 0 },
      { x: w * 0.3, y: h * 0.2, z: l * 0.2 },
      { x: -w * 0.3, y: h * 0.2, z: l * 0.2 },
      { x: -w * 0.5, y: 0, z: 0 },
      // Rear points
      { x: -w * 0.4, y: -h * 0.1, z: l * 0.5 },
      { x: w * 0.4, y: -h * 0.1, z: l * 0.5 },
      { x: 0, y: h * 0.3, z: l * 0.4 }
    ];
  }

  private transformVertices(vertices: Vector3D[], position: Vector3D, rotation: Vector3D): Vector3D[] {
    return vertices.map(vertex => {
      // Apply rotation
      let x = vertex.x;
      let y = vertex.y;
      let z = vertex.z;
      
      // Apply roll (rotation around z-axis)
      const cosZ = Math.cos(rotation.z);
      const sinZ = Math.sin(rotation.z);
      const xRolled = x * cosZ - y * sinZ;
      const yRolled = x * sinZ + y * cosZ;
      
      x = xRolled;
      y = yRolled;
      
      // Apply pitch (rotation around x-axis)
      const cosX = Math.cos(rotation.x);
      const sinX = Math.sin(rotation.x);
      const yPitched = y * cosX - z * sinX;
      const zPitched = y * sinX + z * cosX;
      
      y = yPitched;
      z = zPitched;
      
      // Apply yaw (rotation around y-axis)
      const cosY = Math.cos(rotation.y);
      const sinY = Math.sin(rotation.y);
      const xYawed = x * cosY + z * sinY;
      const zYawed = -x * sinY + z * cosY;
      
      x = xYawed;
      z = zYawed;
      
      // Translate to position
      return {
        x: x + position.x,
        y: y + position.y,
        z: z + position.z
      };
    });
  }

  private render3DShip(vertices: Vector3D[], ship: Ship): void {
    // Define ship faces (groups of vertices that form surfaces)
    const faces = [
      // Body
      [0, 1, 2], // Nose triangle
      [1, 6, 5], // Left side
      [2, 3, 4], // Right side
      [0, 6, 1], // Bottom left
      [0, 2, 3], // Bottom right
      [0, 5, 6], // Top left
      [0, 4, 5], // Top right
      [7, 8, 9], // Rear
      [5, 7, 9], // Left wing
      [4, 8, 9]  // Right wing
    ];
    
    // Colors for different parts of the ship
    const faceColors = [
      ship.color, // Nose
      'rgb(0, 120, 200)', // Left side
      'rgb(0, 120, 200)', // Right side
      'rgb(0, 100, 170)', // Bottom left
      'rgb(0, 100, 170)', // Bottom right
      'rgb(0, 150, 230)', // Top left
      'rgb(0, 150, 230)', // Top right
      'rgb(100, 100, 120)', // Rear
      'rgb(40, 90, 150)',  // Left wing
      'rgb(40, 90, 150)'   // Right wing
    ];

    // Project all vertices
    const projectedVertices = vertices.map(vertex => 
      project(vertex, this.camera, this.width, this.height)
    );
    
    // Simple backface culling and depth sorting
    const visibleFaces = [];
    
    for (let i = 0; i < faces.length; i++) {
      const face = faces[i];
      const v1 = vertices[face[0]];
      const v2 = vertices[face[1]];
      const v3 = vertices[face[2]];
      
      // Calculate face normal using cross product
      const vec1 = { x: v2.x - v1.x, y: v2.y - v1.y, z: v2.z - v1.z };
      const vec2 = { x: v3.x - v1.x, y: v3.y - v1.y, z: v3.z - v1.z };
      
      const normal = {
        x: vec1.y * vec2.z - vec1.z * vec2.y,
        y: vec1.z * vec2.x - vec1.x * vec2.z,
        z: vec1.x * vec2.y - vec1.y * vec2.x
      };
      
      // Calculate vector from camera to face center
      const faceCenter = {
        x: (v1.x + v2.x + v3.x) / 3,
        y: (v1.y + v2.y + v3.y) / 3,
        z: (v1.z + v2.z + v3.z) / 3
      };
      
      const toCam = {
        x: this.camera.position.x - faceCenter.x,
        y: this.camera.position.y - faceCenter.y,
        z: this.camera.position.z - faceCenter.z
      };
      
      // Dot product to determine if face is visible
      const dotProduct = normal.x * toCam.x + normal.y * toCam.y + normal.z * toCam.z;
      
      if (dotProduct > 0) {
        // Calculate average z for depth sorting
        const avgZ = (v1.z + v2.z + v3.z) / 3;
        visibleFaces.push({ face, color: faceColors[i], avgZ });
      }
    }
    
    // Sort faces by z (painter's algorithm)
    visibleFaces.sort((a, b) => b.avgZ - a.avgZ);
    
    // Draw faces
    this.ctx.save();
    
    for (const { face, color } of visibleFaces) {
      const v1 = projectedVertices[face[0]];
      const v2 = projectedVertices[face[1]];
      const v3 = projectedVertices[face[2]];
      
      // Skip if any vertex is invalid
      if (!this.isValidCoordinate(v1.x, v1.y) || 
          !this.isValidCoordinate(v2.x, v2.y) || 
          !this.isValidCoordinate(v3.x, v3.y)) {
        continue;
      }
      
      this.ctx.beginPath();
      this.ctx.moveTo(v1.x, v1.y);
      this.ctx.lineTo(v2.x, v2.y);
      this.ctx.lineTo(v3.x, v3.y);
      this.ctx.closePath();
      
      this.ctx.fillStyle = color;
      this.ctx.fill();
      
      // Add subtle edge highlight
      this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      this.ctx.lineWidth = 1;
      this.ctx.stroke();
    }
    
    this.ctx.restore();
  }

  public renderObstacle(obstacle: Obstacle) {
    const projected = project(obstacle.position, this.camera, this.width, this.height);
    if (!this.isValidCoordinate(projected.x, projected.y)) return;

    switch (obstacle.type) {
      case 'asteroid':
        const vertices = this.createAsteroidVertices(obstacle.scale.x);
        this.drawObject3D(vertices, obstacle.rotation, obstacle.position, obstacle.color, obstacle.opacity);
        break;
      case 'energyField':
        this.renderEnergyField(obstacle);
        break;
      case 'blackHole':
        this.renderBlackHole(obstacle);
        break;
    }
  }

  private renderEnergyField(obstacle: Obstacle) {
    const projected = project(obstacle.position, this.camera, this.width, this.height);
    if (!this.isValidCoordinate(projected.x, projected.y)) return;

    const radius = calculatePerspective(obstacle.position.z, obstacle.scale.x, obstacle.scale.x * 2, this.camera.viewDistance);
    if (radius <= 0) return;

    const time = performance.now() / 1000;
    const segments = 12;
    const vertices: Vector3D[] = [];

    // Create pulsing energy field
    for (let i = 0; i < segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      const pulseOffset = Math.sin(angle * 3 + time * 2) * radius * 0.2;
      vertices.push({
        x: Math.cos(angle) * (radius + pulseOffset),
        y: Math.sin(angle) * (radius + pulseOffset),
        z: Math.cos(angle * 3 + time) * radius * 0.2
      });
    }

    // Draw energy field with glow
    this.drawObject3D(vertices, obstacle.rotation, obstacle.position, obstacle.color, obstacle.opacity * 0.7, true);
    this.createGlow(projected.x, projected.y, radius * 1.5, obstacle.color, 0.5);
  }

  private renderBlackHole(blackHole: Obstacle) {
    const projected = project(blackHole.position, this.camera, this.width, this.height);
    if (!this.isValidCoordinate(projected.x, projected.y)) return;

    const radius = calculatePerspective(blackHole.position.z, 10, 40, this.camera.viewDistance);
    if (radius <= 0) return;

    const time = performance.now() / 1000;
    
    // Draw swirling effect
    this.ctx.save();
    this.ctx.translate(projected.x, projected.y);
    this.ctx.rotate(time);

    const gradient = this.ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
    gradient.addColorStop(0, 'rgba(0, 0, 0, 1)');
    gradient.addColorStop(0.4, 'rgba(75, 0, 130, 0.8)');
    gradient.addColorStop(0.7, 'rgba(50, 0, 80, 0.5)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

    this.ctx.fillStyle = gradient;
    this.ctx.beginPath();
    this.ctx.arc(0, 0, radius, 0, Math.PI * 2);
    this.ctx.fill();

    // Draw swirl arms
    const arms = 3;
    for (let i = 0; i < arms; i++) {
      const angle = (i / arms) * Math.PI * 2;
      this.ctx.beginPath();
      this.ctx.strokeStyle = 'rgba(100, 0, 150, 0.3)';
      this.ctx.lineWidth = 2;
      
      for (let j = 0; j < radius; j += 5) {
        const spiralAngle = angle + (j / radius) * Math.PI * 4;
        const x = Math.cos(spiralAngle) * j;
        const y = Math.sin(spiralAngle) * j;
        
        if (j === 0) {
          this.ctx.moveTo(x, y);
        } else {
          this.ctx.lineTo(x, y);
        }
      }
      this.ctx.stroke();
    }
    this.ctx.restore();

    // Add outer glow
    this.createGlow(projected.x, projected.y, radius * 2, 'rgb(100, 0, 150)', 0.3);
  }

  public renderStar(star: Star) {
    const projected = project(star.position, this.camera, this.width, this.height);
    if (!this.isValidCoordinate(projected.x, projected.y)) return;

    const size = calculatePerspective(star.position.z, 1, 4, this.camera.viewDistance);
    if (size <= 0) return;

    const time = performance.now() / 1000;
    const twinkle = 0.7 + Math.sin(time * star.twinkleSpeed + star.twinklePhase) * 0.3;
    
    // Calculate star color (more variation)
    let starColor: string;
    if (star.twinklePhase < Math.PI * 0.33) {
      // Blue-ish stars
      starColor = `rgb(200, 220, 255)`;
    } else if (star.twinklePhase < Math.PI * 0.66) {
      // Yellow-ish stars
      starColor = `rgb(255, 255, 220)`;
    } else if (star.twinklePhase < Math.PI) {
      // Red-ish stars
      starColor = `rgb(255, 220, 200)`;
    } else {
      // White stars
      starColor = `rgb(255, 255, 255)`;
    }
    
    // Draw star with improved appearance
    this.ctx.save();
    
    // Star glow
    const glowSize = size * (2 + twinkle);
    const glowGradient = this.ctx.createRadialGradient(
      projected.x, projected.y, 0,
      projected.x, projected.y, glowSize
    );
    
    glowGradient.addColorStop(0, `rgba(255, 255, 255, ${twinkle * 0.7})`);
    glowGradient.addColorStop(0.5, starColor.replace('rgb', 'rgba').replace(')', `, ${twinkle * 0.3})`));
    glowGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    
    this.ctx.fillStyle = glowGradient;
    this.ctx.beginPath();
    this.ctx.arc(projected.x, projected.y, glowSize, 0, Math.PI * 2);
    this.ctx.fill();
    
    // Star core
    this.ctx.fillStyle = `rgba(255, 255, 255, ${twinkle * 0.9})`;
    this.ctx.beginPath();
    this.ctx.arc(projected.x, projected.y, size, 0, Math.PI * 2);
    this.ctx.fill();
    
    // Optional: Add a small flare for brighter stars
    if (size > 2 && Math.random() < 0.3) {
      this.ctx.strokeStyle = `rgba(255, 255, 255, ${twinkle * 0.4})`;
      this.ctx.lineWidth = 0.5;
      
      // Draw crosshair flare
      const flareSize = size * 4;
      this.ctx.beginPath();
      this.ctx.moveTo(projected.x - flareSize, projected.y);
      this.ctx.lineTo(projected.x + flareSize, projected.y);
      this.ctx.moveTo(projected.x, projected.y - flareSize);
      this.ctx.lineTo(projected.x, projected.y + flareSize);
      this.ctx.stroke();
    }
    
    this.ctx.restore();
  }

  public renderParticleEffect(effect: ParticleEffect) {
    const projected = project(effect.position, this.camera, this.width, this.height);
    if (!this.isValidCoordinate(projected.x, projected.y)) return;

    const progress = effect.currentTime / effect.lifetime;
    const size = effect.size * (1 - progress * 0.7); // Slower shrinking
    if (size <= 0) return;

    switch (effect.type) {
      case 'explosion':
        // Multi-layered explosion
        const innerSize = size * 0.6;
        const outerSize = size * (1 + progress * 0.5);
        
        // Outer shockwave
        this.ctx.save();
        const waveGradient = this.ctx.createRadialGradient(
          projected.x, projected.y, innerSize,
          projected.x, projected.y, outerSize
        );
        waveGradient.addColorStop(0, `rgba(255, 200, 100, ${(1 - progress) * 0.8})`);
        waveGradient.addColorStop(0.6, `rgba(255, 100, 50, ${(1 - progress) * 0.4})`);
        waveGradient.addColorStop(1, 'rgba(100, 0, 0, 0)');
        
        this.ctx.fillStyle = waveGradient;
        this.ctx.beginPath();
        this.ctx.arc(projected.x, projected.y, outerSize, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Inner explosion core
        const coreGradient = this.ctx.createRadialGradient(
          projected.x, projected.y, 0,
          projected.x, projected.y, innerSize
        );
        coreGradient.addColorStop(0, `rgba(255, 255, 200, ${(1 - progress) * 0.9})`);
        coreGradient.addColorStop(0.5, `rgba(255, 150, 50, ${(1 - progress) * 0.7})`);
        coreGradient.addColorStop(1, `rgba(200, 50, 0, ${(1 - progress) * 0.5})`);
        
        this.ctx.fillStyle = coreGradient;
        this.ctx.beginPath();
        this.ctx.arc(projected.x, projected.y, innerSize, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.restore();

        // Add glow
        this.createGlow(projected.x, projected.y, outerSize * 1.5, 'rgb(255, 100, 0)', (1 - progress) * 0.6);
        break;

      case 'shield':
        // Improved shield ripple effect
        this.ctx.save();
        
        const rippleSize = size * (1 + progress * 0.8);
        const shieldOpacity = (1 - progress) * 0.7;
        
        // Outer ripple
        this.ctx.strokeStyle = `hsla(200, 100%, 70%, ${shieldOpacity * 0.5})`;
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        this.ctx.arc(projected.x, projected.y, rippleSize, 0, Math.PI * 2);
        this.ctx.stroke();
        
        // Inner ripple
        this.ctx.strokeStyle = `hsla(200, 100%, 50%, ${shieldOpacity})`;
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.arc(projected.x, projected.y, rippleSize * 0.8, 0, Math.PI * 2);
        this.ctx.stroke();
        
        this.ctx.restore();

        // Add shield glow
        this.createGlow(projected.x, projected.y, rippleSize * 1.2, 'rgb(0, 150, 255)', shieldOpacity * 0.5);
        break;

      case 'trail':
        // Engine trail with better fade
        const trailOpacity = (1 - progress) * 0.6;
        this.createGlow(projected.x, projected.y, size * 1.5, 'rgb(0, 150, 255)', trailOpacity);
        break;
        
      case 'debris':
        // Small asteroid/obstacle fragments
        this.ctx.save();
        this.ctx.fillStyle = `rgba(180, 120, 60, ${(1 - progress) * 0.9})`;
        this.ctx.beginPath();
        this.ctx.arc(projected.x, projected.y, size, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Add slight glow
        this.createGlow(projected.x, projected.y, size * 1.5, 'rgb(255, 100, 0)', (1 - progress) * 0.2);
        this.ctx.restore();
        break;
        
      case 'muzzleFlash':
        // Muzzle flash is a bright but quick effect
        const flashSize = size * (1 + (1 - progress));
        
        const flashGradient = this.ctx.createRadialGradient(
          projected.x, projected.y, 0, 
          projected.x, projected.y, flashSize
        );
        
        flashGradient.addColorStop(0, `rgba(255, 255, 200, ${progress})`);
        flashGradient.addColorStop(0.5, `rgba(255, 200, 0, ${progress * 0.8})`);
        flashGradient.addColorStop(1, `rgba(255, 50, 0, 0)`);
        
        this.ctx.beginPath();
        this.ctx.arc(projected.x, projected.y, flashSize, 0, Math.PI * 2);
        this.ctx.fillStyle = flashGradient;
        this.ctx.fill();
        
        // Add lens flare effect
        this.ctx.globalCompositeOperation = 'lighter';
        
        // Horizontal flare
        this.ctx.beginPath();
        this.ctx.moveTo(projected.x - flashSize * 2, projected.y);
        this.ctx.lineTo(projected.x + flashSize * 2, projected.y);
        this.ctx.strokeStyle = `rgba(255, 255, 200, ${progress * 0.3})`;
        this.ctx.lineWidth = flashSize * 0.5;
        this.ctx.stroke();
        
        // Vertical flare
        this.ctx.beginPath();
        this.ctx.moveTo(projected.x, projected.y - flashSize * 2);
        this.ctx.lineTo(projected.x, projected.y + flashSize * 2);
        this.ctx.stroke();
        
        this.ctx.globalCompositeOperation = 'source-over';
        break;
        
      case 'engineTrail':
      case 'boostTrail':
        // Engine trail particles fade and shrink
        const isBoost = effect.type === 'boostTrail';
        const trailSize = size * progress;
        
        // Different colors for normal engine vs boost
        const engineColor = isBoost ? 
          `rgba(100, 200, 255, ${progress * 0.8})` : 
          `rgba(0, 150, 255, ${progress * 0.7})`;
        
        const coreColor = isBoost ? 
          `rgba(200, 240, 255, ${progress})` : 
          `rgba(150, 220, 255, ${progress * 0.9})`;
        
        // Draw the trail particle
        this.ctx.beginPath();
        this.ctx.arc(projected.x, projected.y, trailSize, 0, Math.PI * 2);
        
        const trailGradient = this.ctx.createRadialGradient(
          projected.x, projected.y, 0,
          projected.x, projected.y, trailSize
        );
        
        trailGradient.addColorStop(0, coreColor);
        trailGradient.addColorStop(1, engineColor);
        
        this.ctx.fillStyle = trailGradient;
        this.ctx.fill();
        
        // Add glow
        if (Math.random() < 0.3) {
          this.createGlow(projected.x, projected.y, trailSize * 2, 'rgb(0, 150, 255)', progress * 0.2);
        }
        break;
        
      case 'plasmaTrail':
        // Plasma trail is an energetic particle
        const plasmaSize = size * progress;
        
        this.ctx.beginPath();
        this.ctx.arc(projected.x, projected.y, plasmaSize, 0, Math.PI * 2);
        
        const pTrailGradient = this.ctx.createRadialGradient(
          projected.x, projected.y, 0,
          projected.x, projected.y, plasmaSize
        );
        
        pTrailGradient.addColorStop(0, `rgba(255, 255, 255, ${progress})`);
        pTrailGradient.addColorStop(0.4, `rgba(200, 100, 255, ${progress * 0.8})`);
        pTrailGradient.addColorStop(1, `rgba(100, 0, 150, 0)`);
        
        this.ctx.fillStyle = pTrailGradient;
        this.ctx.fill();
        break;
        
      case 'missileTrail':
        // Missile trail is smoke and fire
        const missileTrailSize = size * progress;
        
        this.ctx.beginPath();
        this.ctx.arc(projected.x, projected.y, missileTrailSize, 0, Math.PI * 2);
        
        const missileTrailGradient = this.ctx.createRadialGradient(
          projected.x, projected.y, 0,
          projected.x, projected.y, missileTrailSize
        );
        
        if (progress > 0.7) {
          // Fire stage
          missileTrailGradient.addColorStop(0, `rgba(255, 200, 50, ${progress})`);
          missileTrailGradient.addColorStop(0.5, `rgba(255, 100, 0, ${progress * 0.8})`);
          missileTrailGradient.addColorStop(1, `rgba(100, 0, 0, 0)`);
        } else {
          // Smoke stage
          missileTrailGradient.addColorStop(0, `rgba(150, 150, 150, ${progress * 0.7})`);
          missileTrailGradient.addColorStop(0.6, `rgba(100, 100, 100, ${progress * 0.5})`);
          missileTrailGradient.addColorStop(1, `rgba(50, 50, 50, 0)`);
        }
        
        this.ctx.fillStyle = missileTrailGradient;
        this.ctx.fill();
        break;
        
      default:
        // Generic particle
        const genericSize = size * progress;
        
        this.ctx.beginPath();
        this.ctx.arc(projected.x, projected.y, genericSize, 0, Math.PI * 2);
        this.ctx.fillStyle = `rgba(255, 255, 255, ${progress})`;
        this.ctx.fill();
        break;
    }
    
    this.ctx.restore();
  }

  public renderPowerUp(powerUp: PowerUp) {
    const projected = project(powerUp.position, this.camera, this.width, this.height);
    if (!this.isValidCoordinate(projected.x, projected.y)) return;

    const size = calculatePerspective(powerUp.position.z, 10, 20, this.camera.viewDistance);
    if (size <= 0) return;

    const time = performance.now() / 1000;
    const pulseScale = 1 + Math.sin(time * 3) * 0.2;
    const rotationAngle = time * 2;

    let color: string;
    switch (powerUp.type) {
      case 'shield':
        color = 'rgb(0, 200, 255)';
        break;
      case 'energy':
        color = 'rgb(255, 200, 0)';
        break;
      case 'weapon':
        color = 'rgb(255, 0, 100)';
        break;
    }

    // Draw pulsing powerup
    this.ctx.save();
    this.ctx.translate(projected.x, projected.y);
    this.ctx.rotate(rotationAngle);
    this.ctx.scale(pulseScale, pulseScale);

    // Draw powerup symbol
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();

    switch (powerUp.type) {
      case 'shield':
        this.ctx.arc(0, 0, size * 0.5, 0, Math.PI * 2);
        break;
      case 'energy':
        this.ctx.moveTo(-size * 0.4, size * 0.4);
        this.ctx.lineTo(0, -size * 0.4);
        this.ctx.lineTo(size * 0.4, size * 0.4);
        break;
      case 'weapon':
        this.ctx.moveTo(0, -size * 0.5);
        this.ctx.lineTo(0, size * 0.5);
        this.ctx.moveTo(-size * 0.5, 0);
        this.ctx.lineTo(size * 0.5, 0);
        break;
    }
    this.ctx.stroke();
    this.ctx.restore();

    // Add glow effect
    this.createGlow(projected.x, projected.y, size * pulseScale * 1.5, color, 0.5);
  }

  public renderProjectile(projectile: Projectile): void {
    const projected = project(projectile.position, this.camera, this.width, this.height);
    if (!this.isValidCoordinate(projected.x, projected.y)) return;

    const size = calculatePerspective(projectile.position.z, 2, 5, this.camera.viewDistance);
    if (size <= 0) return;

    const progressFade = Math.min(1, projectile.currentTime / 200); // Fade in
    const opacity = Math.min(1, progressFade) * projectile.opacity;

    this.ctx.save();
    
    switch (projectile.type) {
      case 'laser':
        // Draw laser beam
        const beamLength = 20;
        const front = {
          x: projectile.position.x + projectile.velocity.x * 0.5,
          y: projectile.position.y + projectile.velocity.y * 0.5,
          z: projectile.position.z + projectile.velocity.z * 0.5
        };
        const back = {
          x: projectile.position.x - projectile.velocity.x * beamLength / 10,
          y: projectile.position.y - projectile.velocity.y * beamLength / 10,
          z: projectile.position.z - projectile.velocity.z * beamLength / 10
        };
        
        const projectedFront = project(front, this.camera, this.width, this.height);
        const projectedBack = project(back, this.camera, this.width, this.height);
        
        // Draw outer glow
        const gradient = this.ctx.createLinearGradient(
          projectedBack.x, projectedBack.y, 
          projectedFront.x, projectedFront.y
        );
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
        gradient.addColorStop(0.5, projectile.color.replace('rgb', 'rgba').replace(')', `, ${opacity * 0.5})`));
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        
        this.ctx.beginPath();
        this.ctx.strokeStyle = gradient;
        this.ctx.lineWidth = size * 3;
        this.ctx.lineCap = 'round';
        this.ctx.moveTo(projectedBack.x, projectedBack.y);
        this.ctx.lineTo(projectedFront.x, projectedFront.y);
        this.ctx.stroke();
        
        // Draw inner beam
        this.ctx.beginPath();
        this.ctx.strokeStyle = `rgba(255, 255, 255, ${opacity * 0.8})`;
        this.ctx.lineWidth = size;
        this.ctx.moveTo(projectedBack.x, projectedBack.y);
        this.ctx.lineTo(projectedFront.x, projectedFront.y);
        this.ctx.stroke();
        break;
        
      case 'plasma':
        // Draw plasma ball with inner glow
        const plasmaSize = size * 1.5;
        this.ctx.beginPath();
        
        // Outer glow
        const plasmaGradient = this.ctx.createRadialGradient(
          projected.x, projected.y, 0,
          projected.x, projected.y, plasmaSize * 2
        );
        plasmaGradient.addColorStop(0, `rgba(255, 255, 255, ${opacity * 0.9})`);
        plasmaGradient.addColorStop(0.4, projectile.color.replace('rgb', 'rgba').replace(')', `, ${opacity * 0.7})`));
        plasmaGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        
        this.ctx.fillStyle = plasmaGradient;
        this.ctx.arc(projected.x, projected.y, plasmaSize * 2, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Inner core
        this.ctx.beginPath();
        this.ctx.fillStyle = 'rgba(255, 255, 255, ' + opacity * 0.9 + ')';
        this.ctx.arc(projected.x, projected.y, plasmaSize * 0.5, 0, Math.PI * 2);
        this.ctx.fill();
        break;
        
      case 'missile':
        // Draw missile with trail
        const missileSize = size * 1.2;
        
        // Missile body
        this.ctx.beginPath();
        this.ctx.fillStyle = projectile.color;
        this.ctx.arc(projected.x, projected.y, missileSize, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Missile tip (direction indicator)
        const tipOffset = {
          x: projected.x + projectile.velocity.x * 0.5,
          y: projected.y + projectile.velocity.y * 0.5
        };
        
        this.ctx.beginPath();
        this.ctx.fillStyle = 'rgba(255, 255, 200, ' + opacity * 0.9 + ')';
        this.ctx.arc(tipOffset.x, tipOffset.y, missileSize * 0.6, 0, Math.PI * 2);
        this.ctx.fill();
        break;
    }
    
    this.ctx.restore();

    // Add glow effect for all projectiles
    const glowSize = 
      projectile.type === 'laser' ? size * 2 :
      projectile.type === 'plasma' ? size * 4 :
      size * 3;
      
    this.createGlow(projected.x, projected.y, glowSize, projectile.color, opacity * 0.7);
  }

  public clear() {
    // Clear main canvas
    this.ctx.fillStyle = '#000';
    this.ctx.fillRect(0, 0, this.width, this.height);

    // Clear glow canvas
    this.glowCtx.clearRect(0, 0, this.width, this.height);

    // Apply glow effects from previous frame
    this.ctx.save();
    this.ctx.globalCompositeOperation = 'lighter';
    this.ctx.drawImage(this.glowCanvas, 0, 0);
    this.ctx.restore();
  }
}