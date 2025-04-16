import { Vector3D } from './utils/math3d';

export interface Vector2D {
  x: number;
  y: number;
}

export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

export interface Camera {
  position: Vector3D;
  target: Vector3D;
  up: Vector3D;
  fov: number;
  aspect: number;
  near: number;
  far: number;
  viewDistance: number;
}

export interface GameObject {
  position: Vector3D;
  rotation: Vector3D;
  scale: Vector3D;
  velocity: Vector3D;
  color: string;
  opacity: number;
}

export interface Ship extends GameObject {
  shield: number;
  energy: number;
  isMoving: boolean;
  direction: 'clockwise' | 'counterclockwise' | null;
  trail: Vector3D[];
  weapons: Weapon[];
  currentWeapon: number;
  acceleration: Vector3D;
  targetRotation: Vector3D;
  roll: number;
  pitch: number;
  yaw: number;
}

export interface MovementControls {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  strafeLeft: boolean;
  strafeRight: boolean;
  boost: boolean;
}

export interface Weapon {
  type: string;
  damage: number;
  cooldown: number;
  lastFired: number;
  color: string;
}

export interface Obstacle extends GameObject {
  type: 'asteroid' | 'energyField' | 'blackHole';
  section: number;
  rotationSpeed: {
    x: number;
    y: number;
    z: number;
  };
  damage: number;
}

export interface PowerUp extends GameObject {
  type: 'shield' | 'energy' | 'weapon';
  value: number;
  duration: number;
}

export interface Star extends GameObject {
  size: number;
  twinkleSpeed: number;
  twinklePhase: number;
}

export interface Pattern {
  sections: number[];
  duration: number;
  type: 'asteroid' | 'energyField' | 'blackHole';
  difficulty: number;
}

export interface ParticleEffect extends GameObject {
  type: 'explosion' | 'shield' | 'trail' | 'debris' | 'muzzleFlash' | 'plasmaTrail' | 'missileTrail' | 'engineTrail' | 'boostTrail';
  position: Vector3D;
  size: number;
  lifetime: number;
  currentTime: number;
  color: string;
}

export interface Projectile extends GameObject {
  type: string;
  damage: number;
  lifetime: number;
  currentTime: number;
  ownerId: string;
}

export interface GameSettings {
  camera: {
    fov: number;
    near: number;
    far: number;
    viewDistance: number;
  };
  ship: {
    maxShield: number;
    maxEnergy: number;
    rechargeRate: number;
    moveSpeed: number;
    rotationSpeed: number;
    strafeSpeed: number;
  };
  obstacles: {
    spawnRate: number;
    maxSpeed: number;
    minSize: number;
    maxSize: number;
    maxCount: number;
    spawnDistance: number;
  };
  visuals: {
    maxStars: number;
    starDepth: number;
    starSpread: number;
    trailLength: number;
    glowIntensity: number;
  };
  game: {
    difficultyScale: number;
    powerUpFrequency: number;
    scoreMultiplier: number;
    sectionCount: number;
    worldBoundary: number;
  };
  audio: {
    enabled: boolean;
    volume: number;
  };
}

export interface GameState {
  score: number;
  shield: number;
  energy: number;
  isGameOver: boolean;
  currentWeapon: Weapon;
  difficulty: number;
  powerUps: PowerUp[];
  weaponCooldown: number;
}