import { GameObject, GameSettings, Obstacle, Pattern, Ship, Star, PowerUp, ParticleEffect, Weapon, GameState, Projectile, MovementControls } from './types';
import { Vector3D, createVector3D, createStarfield } from './utils/math3d';
import { Renderer } from './Renderer';
import { AudioManager } from './AudioManager';

const DEFAULT_SETTINGS: GameSettings = {
  camera: {
    fov: 75,
    near: 0.1,
    far: 2000,
    viewDistance: 1500
  },
  ship: {
    maxShield: 100,
    maxEnergy: 100,
    rechargeRate: 0.15,
    moveSpeed: 4.0,
    rotationSpeed: 0.05,
    strafeSpeed: 3.0
  },
  obstacles: {
    spawnRate: 0.03, // Increased chance to spawn obstacles
    maxSpeed: 5.0,   // Faster obstacles
    minSize: 8,
    maxSize: 25,
    maxCount: 25,    // More obstacles on screen
    spawnDistance: 1500 // Spawn further away to give more reaction time
  },
  visuals: {
    maxStars: 800,   // More stars for a better space feel
    starDepth: 2000,
    starSpread: 1500,
    trailLength: 15,
    glowIntensity: 1.2
  },
  game: {
    difficultyScale: 0.0003,
    powerUpFrequency: 0.006, // Increased power-up frequency
    scoreMultiplier: 10,
    worldBoundary: 150  // Smaller boundary to keep player centered
  },
  audio: {
    enabled: true,
    volume: 0.5
  }
};

const DEFAULT_WEAPONS: Weapon[] = [
  {
    type: 'laser',
    damage: 10,
    cooldown: 200,
    lastFired: 0,
    color: 'rgb(0, 255, 0)'
  },
  {
    type: 'plasma',
    damage: 25,
    cooldown: 500,
    lastFired: 0,
    color: 'rgb(255, 0, 255)'
  },
  {
    type: 'missile',
    damage: 50,
    cooldown: 1000,
    lastFired: 0,
    color: 'rgb(255, 0, 0)'
  }
];

export class GameEngine {
  private renderer: Renderer;
  private settings: GameSettings;
  private ship: Ship;
  private obstacles: Obstacle[];
  private stars: Vector3D[];
  private powerUps: PowerUp[];
  private particles: ParticleEffect[];
  private projectiles: Projectile[];
  private patterns: Pattern[];
  private currentPattern: Pattern | null;
  private score: number;
  private difficulty: number;
  private isGameOver: boolean;
  private isPaused: boolean = false;
  private centerX: number;
  private centerY: number;
  private audioManager: AudioManager;
  private movementControls: MovementControls = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    boost: false,
    strafeLeft: false,
    strafeRight: false
  };
  private cameraOffset: Vector3D = { x: 0, y: 15, z: 50 };

  constructor(ctx: CanvasRenderingContext2D, settings: Partial<GameSettings> = {}) {
    this.settings = this.mergeSettings(DEFAULT_SETTINGS, settings);
    this.renderer = new Renderer(ctx, ctx.canvas.width, ctx.canvas.height);
    this.centerX = ctx.canvas.width / 2;
    this.centerY = ctx.canvas.height / 2;

    this.obstacles = [];
    this.powerUps = [];
    this.particles = [];
    this.projectiles = [];
    this.patterns = this.initializePatterns();
    this.currentPattern = null;
    this.score = 0;
    this.difficulty = 1;
    this.isGameOver = false;

    this.stars = createStarfield(
      this.settings.visuals.maxStars,
      this.settings.visuals.starDepth,
      this.settings.visuals.starSpread
    );

    this.ship = {
      position: createVector3D(0, 0, 0),
      rotation: createVector3D(0, 0, 0),
      scale: createVector3D(10, 5, 20),
      velocity: createVector3D(0, 0, 0),
      color: 'rgb(0, 170, 255)',
      opacity: 1,
      shield: this.settings.ship.maxShield,
      energy: this.settings.ship.maxEnergy,
      isMoving: false,
      direction: null,
      trail: [],
      weapons: [...DEFAULT_WEAPONS],
      currentWeapon: 0,
      acceleration: createVector3D(0, 0, 0),
      targetRotation: createVector3D(0, 0, 0),
      roll: 0,
      pitch: 0,
      yaw: 0
    };

    this.audioManager = new AudioManager(
      this.settings.audio.enabled,
      this.settings.audio.volume,
      this.settings.audio.volume * 0.6
    );
  }

  private mergeSettings(defaults: GameSettings, overrides: Partial<GameSettings>): GameSettings {
    return {
      camera: { ...defaults.camera, ...overrides.camera },
      ship: { ...defaults.ship, ...overrides.ship },
      obstacles: { ...defaults.obstacles, ...overrides.obstacles },
      visuals: { ...defaults.visuals, ...overrides.visuals },
      game: { ...defaults.game, ...overrides.game },
      audio: { ...defaults.audio, ...overrides.audio }
    };
  }

  private initializePatterns(): Pattern[] {
    return [
      {
        sections: [0, 2, 4, 6],
        duration: 60,
        type: 'asteroid',
        difficulty: 1
      },
      {
        sections: [1, 3, 5, 7],
        duration: 60,
        type: 'energyField',
        difficulty: 1.2
      },
      {
        sections: [0, 1, 2, 3],
        duration: 45,
        type: 'asteroid',
        difficulty: 1.5
      },
      {
        sections: [4, 5, 6, 7],
        duration: 45,
        type: 'blackHole',
        difficulty: 2
      }
    ];
  }

  public setMovementControl(control: keyof MovementControls, active: boolean): void {
    this.movementControls[control] = active;
    this.ship.isMoving = Object.values(this.movementControls).some(val => val);
  }

  public updateShip(): void {
    let movementVector = createVector3D(0, 0, 0);

    if (this.movementControls.left) {
      movementVector.x -= this.settings.ship.moveSpeed;
      this.ship.roll = 0.3;
    } else if (this.movementControls.right) {
      movementVector.x += this.settings.ship.moveSpeed;
      this.ship.roll = -0.3;
    } else {
      this.ship.roll *= 0.9;
    }

    if (this.movementControls.forward) {
      movementVector.y -= this.settings.ship.moveSpeed;
      this.ship.pitch = -0.2;
    } else if (this.movementControls.backward) {
      movementVector.y += this.settings.ship.moveSpeed;
      this.ship.pitch = 0.2;
    } else {
      this.ship.pitch *= 0.9;
    }

    const speedMultiplier = this.movementControls.boost ? 1.8 : 1.0;
    movementVector.x *= speedMultiplier;
    movementVector.y *= speedMultiplier;

    this.ship.rotation.z = this.ship.roll;
    this.ship.rotation.x = this.ship.pitch;

    this.ship.position.x += movementVector.x;
    this.ship.position.y += movementVector.y;

    const boundary = this.settings.game.worldBoundary;
    if (Math.abs(this.ship.position.x) > boundary) {
      this.ship.position.x = Math.sign(this.ship.position.x) * boundary;
    }
    if (Math.abs(this.ship.position.y) > boundary) {
      this.ship.position.y = Math.sign(this.ship.position.y) * boundary;
    }

    if (this.movementControls.boost || Math.random() < 0.3) {
      this.ship.trail.push({ ...this.ship.position });
      if (this.ship.trail.length > this.settings.visuals.trailLength) {
        this.ship.trail.shift();
      }

      const engineOffset = 10;
      const enginePos = {
        x: this.ship.position.x,
        y: this.ship.position.y,
        z: this.ship.position.z - engineOffset
      };

      this.particles.push(
        this.createParticleEffect(
          this.movementControls.boost ? 'boostTrail' : 'engineTrail',
          enginePos,
          this.movementControls.boost ? 5 : 3
        )
      );
    }

    const camDist = 50;
    const camHeight = 10;

    this.renderer.updateCamera(
      {
        x: this.ship.position.x,
        y: this.ship.position.y + camHeight,
        z: this.ship.position.z - camDist
      },
      this.ship.position
    );
  }

  public fireWeapon(): void {
    if (this.isGameOver) return;

    const weapon = this.ship.weapons[this.ship.currentWeapon];
    const now = performance.now();
    const energyCost = weapon.type === 'laser' ? 5 : weapon.type === 'plasma' ? 15 : 25;

    if (now - weapon.lastFired >= weapon.cooldown && this.ship.energy >= energyCost) {
      weapon.lastFired = now;
      this.ship.energy -= energyCost;

      const spawnOffset = 15;
      const spawnPos = {
        x: this.ship.position.x,
        y: this.ship.position.y,
        z: this.ship.position.z + spawnOffset
      };

      const speed = weapon.type === 'laser' ? 30 : weapon.type === 'plasma' ? 25 : 20;
      const velocity = {
        x: 0,
        y: 0,
        z: speed
      };

      const projectile: Projectile = {
        position: spawnPos,
        rotation: { ...this.ship.rotation },
        scale: createVector3D(
          weapon.type === 'laser' ? 1 : weapon.type === 'plasma' ? 3 : 2,
          weapon.type === 'laser' ? 1 : weapon.type === 'plasma' ? 3 : 2,
          weapon.type === 'laser' ? 8 : weapon.type === 'plasma' ? 3 : 2
        ),
        velocity: velocity,
        color: weapon.color,
        opacity: 1,
        type: weapon.type,
        damage: weapon.damage,
        lifetime: weapon.type === 'laser' ? 1000 : weapon.type === 'plasma' ? 1500 : 2000,
        currentTime: 0,
        ownerId: 'player'
      };

      this.projectiles.push(projectile);

      this.particles.push(
        this.createParticleEffect(
          'muzzleFlash',
          spawnPos,
          weapon.type === 'laser' ? 5 : weapon.type === 'plasma' ? 10 : 15
        )
      );

      this.playSound(weapon.type);
    }
  }

  private createParticleEffect(
    type: 'explosion' | 'shield' | 'trail' | 'debris' | 'muzzleFlash' | 'plasmaTrail' | 'missileTrail' | 'engineTrail' | 'boostTrail',
    position: Vector3D,
    size: number
  ): ParticleEffect {
    let color: string;
    let lifetime: number;

    switch (type) {
      case 'explosion':
        color = 'rgb(255, 100, 0)';
        lifetime = 1000;
        break;
      case 'shield':
        color = 'rgb(0, 150, 255)';
        lifetime = 600;
        break;
      case 'trail':
        color = 'rgb(0, 150, 255)';
        lifetime = 300;
        break;
      case 'debris':
        color = 'rgb(150, 100, 50)';
        lifetime = 800;
        break;
      case 'muzzleFlash':
        color = 'rgb(255, 255, 150)';
        lifetime = 200;
        break;
      case 'plasmaTrail':
        color = 'rgb(200, 0, 255)';
        lifetime = 400;
        break;
      case 'missileTrail':
        color = 'rgb(255, 100, 50)';
        lifetime = 500;
        break;
      case 'engineTrail':
        color = 'rgb(0, 170, 255)';
        lifetime = 400;
        break;
      case 'boostTrail':
        color = 'rgb(50, 200, 255)';
        lifetime = 500;
        break;
      default:
        color = 'rgb(255, 255, 255)';
        lifetime = 500;
    }

    let particleVelocity: Vector3D;

    switch (type) {
      case 'explosion':
        particleVelocity = createVector3D(
          (Math.random() - 0.5) * 3,
          (Math.random() - 0.5) * 3,
          (Math.random() - 0.5) * 3
        );
        break;
      case 'debris':
        particleVelocity = createVector3D(
          (Math.random() - 0.5) * 2,
          (Math.random() - 0.5) * 2,
          (Math.random() - 0.5) * 2
        );
        break;
      case 'engineTrail':
      case 'boostTrail':
        particleVelocity = createVector3D(
          (Math.random() - 0.5) * 1,
          (Math.random() - 0.5) * 1,
          -Math.random() * 2 - 1
        );
        break;
      default:
        particleVelocity = createVector3D(0, 0, 0);
    }

    return {
      position: { ...position },
      rotation: createVector3D(0, 0, 0),
      scale: createVector3D(1, 1, 1),
      velocity: particleVelocity,
      color,
      opacity: 1,
      type,
      lifetime,
      currentTime: 0,
      size
    };
  }

  private updateParticles(): void {
    this.particles = this.particles.filter(particle => {
      particle.currentTime += 16;

      particle.position.x += particle.velocity.x;
      particle.position.y += particle.velocity.y;
      particle.position.z += particle.velocity.z;

      if (particle.type === 'debris' || particle.type === 'explosion') {
        particle.velocity.x *= 0.98;
        particle.velocity.y *= 0.98;
        particle.velocity.z *= 0.98;

        if (particle.type === 'debris') {
          particle.velocity.y -= 0.01;
        }
      }

      if (particle.type === 'engineTrail' || particle.type === 'boostTrail') {
        particle.position.x += (Math.random() - 0.5) * 0.2;
        particle.position.y += (Math.random() - 0.5) * 0.2;
      }

      if (particle.type === 'muzzleFlash') {
        particle.size *= 1.05;
      }

      const dx = particle.position.x - this.ship.position.x;
      const dy = particle.position.y - this.ship.position.y;
      const dz = particle.position.z - this.ship.position.z;
      const distanceToPlayer = Math.sqrt(dx * dx + dy * dy + dz * dz);

      return particle.currentTime < particle.lifetime &&
        distanceToPlayer < this.settings.camera.viewDistance;
    });
  }

  private updateProjectiles(): void {
    this.projectiles = this.projectiles.filter(projectile => {
      projectile.position.x += projectile.velocity.x;
      projectile.position.y += projectile.velocity.y;
      projectile.position.z += projectile.velocity.z;
      projectile.currentTime += 16;

      if (projectile.type !== 'laser' && Math.random() < 0.3) {
        this.particles.push(
          this.createParticleEffect(
            projectile.type === 'plasma' ? 'plasmaTrail' : 'missileTrail',
            { ...projectile.position },
            projectile.type === 'plasma' ? 2 : 3
          )
        );
      }

      for (let i = this.obstacles.length - 1; i >= 0; i--) {
        const obstacle = this.obstacles[i];
        const dx = projectile.position.x - obstacle.position.x;
        const dy = projectile.position.y - obstacle.position.y;
        const dz = projectile.position.z - obstacle.position.z;
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

        if (distance < obstacle.scale.x * 1.5) {
          this.particles.push(
            this.createParticleEffect('explosion', obstacle.position, obstacle.scale.x * 1.5)
          );

          for (let j = 0; j < 8; j++) {
            const offset = {
              x: (Math.random() - 0.5) * obstacle.scale.x,
              y: (Math.random() - 0.5) * obstacle.scale.y,
              z: (Math.random() - 0.5) * obstacle.scale.z
            };

            const debrisPos = {
              x: obstacle.position.x + offset.x,
              y: obstacle.position.y + offset.y,
              z: obstacle.position.z + offset.z
            };

            this.particles.push(
              this.createParticleEffect('debris', debrisPos, obstacle.scale.x * 0.3)
            );
          }

          if (Math.random() < 0.1) {
            const types: Array<'shield' | 'energy' | 'weapon'> = ['shield', 'energy', 'weapon'];
            this.powerUps.push(
              this.createPowerUp(types[Math.floor(Math.random() * types.length)], obstacle.position)
            );
          }

          this.obstacles.splice(i, 1);
          this.playSound('explosion');

          const scoreMultiplier =
            obstacle.type === 'asteroid' ? 1 :
              obstacle.type === 'energyField' ? 2 :
                obstacle.type === 'blackHole' ? 3 : 1;

          this.score += Math.round(
            obstacle.scale.x * scoreMultiplier *
            this.difficulty * this.settings.game.scoreMultiplier
          );

          return false;
        }
      }

      const maxDistance = this.settings.camera.viewDistance;
      const distanceTraveled = Math.sqrt(
        Math.pow(projectile.position.x - this.ship.position.x, 2) +
        Math.pow(projectile.position.y - this.ship.position.y, 2) +
        Math.pow(projectile.position.z - this.ship.position.z, 2)
      );

      return projectile.currentTime < projectile.lifetime && distanceTraveled < maxDistance;
    });
  }

  private updateObstacles(): void {
    this.obstacles = this.obstacles.filter(obstacle => {
      // Update position
      obstacle.position.x += obstacle.velocity.x;
      obstacle.position.y += obstacle.velocity.y;
      obstacle.position.z += obstacle.velocity.z;

      // Update rotation
      obstacle.rotation.x += obstacle.rotationSpeed.x;
      obstacle.rotation.y += obstacle.rotationSpeed.y;
      obstacle.rotation.z += obstacle.rotationSpeed.z;

      // Calculate distance to player
      const distanceToPlayer = Math.sqrt(
        Math.pow(obstacle.position.x - this.ship.position.x, 2) +
        Math.pow(obstacle.position.y - this.ship.position.y, 2) +
        Math.pow(obstacle.position.z - this.ship.position.z, 2)
      );

      // Remove if too far behind player or too far to sides
      return (obstacle.position.z > this.ship.position.z - 200) &&
             (distanceToPlayer < this.settings.camera.viewDistance);
    });

    // Spawn new obstacles based on difficulty and current count
    const spawnChance = this.settings.obstacles.spawnRate * this.difficulty;
    if (Math.random() < spawnChance && this.obstacles.length < this.settings.obstacles.maxCount) {
      this.spawnObstacles();
    }
  }

  private updatePowerUps(): void {
    this.powerUps = this.powerUps.filter(powerUp => {
      // Update position based on velocity
      powerUp.position.x += powerUp.velocity.x;
      powerUp.position.y += powerUp.velocity.y;
      powerUp.position.z += powerUp.velocity.z;
      
      // Rotate power-up for visual effect
      powerUp.rotation.y += 0.02;
      powerUp.rotation.x += 0.01;
      
      // Calculate distance to player
      const distanceToPlayer = Math.sqrt(
        Math.pow(powerUp.position.x - this.ship.position.x, 2) +
        Math.pow(powerUp.position.y - this.ship.position.y, 2) +
        Math.pow(powerUp.position.z - this.ship.position.z, 2)
      );
      
      // Remove if too far behind player
      return (powerUp.position.z > this.ship.position.z - 200) &&
             (distanceToPlayer < this.settings.camera.viewDistance);
    });

    // Spawn new power-ups based on game difficulty and random chance
    const powerUpChance = this.settings.game.powerUpFrequency * this.difficulty;
    if (Math.random() < powerUpChance && this.powerUps.length < 3) {
      // Select random power-up type with weighted probabilities
      const roll = Math.random();
      let type: 'shield' | 'energy' | 'weapon';
      
      if (this.ship.shield < 40) {
        // Higher chance of shield when low
        type = roll < 0.6 ? 'shield' : roll < 0.9 ? 'energy' : 'weapon';
      } else if (this.ship.energy < 40) {
        // Higher chance of energy when low
        type = roll < 0.6 ? 'energy' : roll < 0.9 ? 'shield' : 'weapon';
      } else {
        // Normal distribution
        type = roll < 0.4 ? 'shield' : roll < 0.8 ? 'energy' : 'weapon';
      }
      
      this.powerUps.push(this.createPowerUp(type));
    }
  }

  private checkCollisions(): void {
    if (this.isGameOver) return;

    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const obstacle = this.obstacles[i];

      const dx = obstacle.position.x - this.ship.position.x;
      const dy = obstacle.position.y - this.ship.position.y;
      const dz = obstacle.position.z - this.ship.position.z;
      const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

      const shipRadius = Math.max(this.ship.scale.x, this.ship.scale.z) * 0.8;

      if (distance < (obstacle.scale.x + shipRadius)) {
        this.ship.shield -= obstacle.damage;

        this.particles.push(
          this.createParticleEffect('explosion', obstacle.position, obstacle.scale.x * 1.2)
        );

        for (let j = 0; j < 10; j++) {
          const offset = {
            x: (Math.random() - 0.5) * obstacle.scale.x,
            y: (Math.random() - 0.5) * obstacle.scale.y,
            z: (Math.random() - 0.5) * obstacle.scale.z
          };

          const debrisPos = {
            x: obstacle.position.x + offset.x,
            y: obstacle.position.y + offset.y,
            z: obstacle.position.z + offset.z
          };

          this.particles.push(
            this.createParticleEffect('debris', debrisPos, obstacle.scale.x * 0.2)
          );
        }

        this.obstacles.splice(i, 1);
        this.playSound('explosion');

        this.particles.push(
          this.createParticleEffect('shield', this.ship.position, 30)
        );

        if (this.ship.shield <= 0) {
          this.gameOver();
          break;
        }
      }
    }

    this.powerUps = this.powerUps.filter(powerUp => {
      const dx = powerUp.position.x - this.ship.position.x;
      const dy = powerUp.position.y - this.ship.position.y;
      const dz = powerUp.position.z - this.ship.position.z;
      const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

      if (distance < 40) {
        switch (powerUp.type) {
          case 'shield':
            this.ship.shield = Math.min(this.settings.ship.maxShield, this.ship.shield + powerUp.value);
            break;
          case 'energy':
            this.ship.energy = Math.min(this.settings.ship.maxEnergy, this.ship.energy + powerUp.value);
            break;
          case 'weapon':
            const currentWeapon = this.ship.weapons[this.ship.currentWeapon];
            currentWeapon.damage *= 1.2;
            currentWeapon.cooldown *= 0.9;
            break;
        }

        this.particles.push(
          this.createParticleEffect('shield', this.ship.position, 40)
        );

        this.playSound('powerup');
        return false;
      }
      return true;
    });
  }

  public update(): void {
    if (this.isGameOver || this.isPaused) return;

    this.stars = this.stars.map(star => {
      star.z -= 5 * (this.movementControls.boost ? 1.5 : 1.0);

      if (star.z < this.ship.position.z - 200) {
        star.z = this.ship.position.z + this.settings.visuals.starDepth;
        star.x = (Math.random() - 0.5) * this.settings.visuals.starSpread;
        star.y = (Math.random() - 0.5) * this.settings.visuals.starSpread;
      }

      return star;
    });

    this.updateShip();
    this.updateObstacles();
    this.updatePowerUps();
    this.updateParticles();
    this.updateProjectiles();
    this.checkCollisions();

    if (this.ship.shield < this.settings.ship.maxShield) {
      this.ship.shield = Math.min(
        this.settings.ship.maxShield,
        this.ship.shield + this.settings.ship.rechargeRate
      );
    }

    if (this.ship.energy < this.settings.ship.maxEnergy) {
      this.ship.energy = Math.min(
        this.settings.ship.maxEnergy,
        this.ship.energy + this.settings.ship.rechargeRate * 2
      );
    }

    this.score++;
    this.difficulty += this.settings.game.difficultyScale;
  }

  public render(): void {
    this.renderer.clear();

    // Render stars
    for (const star of this.stars) {
      this.renderer.renderStar({
        position: star,
        rotation: createVector3D(0, 0, 0),
        scale: createVector3D(1, 1, 1),
        velocity: createVector3D(0, 0, 0),
        color: 'rgb(255, 255, 255)',
        opacity: 1,
        size: 1 + Math.random() * 2,
        twinkleSpeed: 0.5 + Math.random() * 2,
        twinklePhase: Math.random() * Math.PI * 2
      });
    }

    // Render obstacles
    for (const obstacle of this.obstacles) {
      this.renderer.renderObstacle(obstacle);
    }

    // Render power-ups
    for (const powerUp of this.powerUps) {
      this.renderer.renderPowerUp(powerUp);
    }

    // Render projectiles
    for (const projectile of this.projectiles) {
      this.renderer.renderProjectile(projectile);
    }

    // Render particles
    for (const particle of this.particles) {
      this.renderer.renderParticleEffect(particle);
    }

    // Render ship
    this.renderer.renderShip(this.ship);

    // Render game over
    if (this.isGameOver) {
      const ctx = this.renderer['ctx'];
      ctx.fillStyle = 'white';
      ctx.font = '48px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('GAME OVER', this.centerX, this.centerY);
      ctx.font = '24px Arial';
      ctx.fillText(`Score: ${this.score}`, this.centerX, this.centerY + 40);
    }

    // Render paused state
    if (this.isPaused) {
      const ctx = this.renderer['ctx'];
      ctx.save();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      
      ctx.fillStyle = 'white';
      ctx.font = '48px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('PAUSED', this.centerX, this.centerY);
      ctx.font = '20px Arial';
      ctx.fillText('Press ESC to resume', this.centerX, this.centerY + 40);
      ctx.restore();
    }
  }

  public togglePause(): boolean {
    this.isPaused = !this.isPaused;
    
    if (this.isPaused) {
      this.audioManager.stopMusic();
    } else {
      this.audioManager.playMusic();
    }
    
    return this.isPaused;
  }

  public isPauseState(): boolean {
    return this.isPaused;
  }

  public toggleAudio(): boolean {
    const newState = !this.settings.audio.enabled;
    this.settings.audio.enabled = newState;
    this.audioManager.setEnabled(newState);
    return newState;
  }

  public getAudioEnabled(): boolean {
    return this.settings.audio.enabled;
  }

  public getGameState(): GameState {
    const currentWeapon = this.ship.weapons[this.ship.currentWeapon];
    const cooldownProgress = Math.min(
      1, 
      (performance.now() - currentWeapon.lastFired) / currentWeapon.cooldown
    );
    
    return {
      score: this.score,
      shield: Math.round(this.ship.shield),
      energy: Math.round(this.ship.energy),
      isGameOver: this.isGameOver,
      currentWeapon: currentWeapon,
      difficulty: this.difficulty,
      powerUps: this.powerUps,
      weaponCooldown: cooldownProgress
    };
  }

  private createPowerUp(type: 'shield' | 'energy' | 'weapon', position?: Vector3D): PowerUp {
    let value: number;
    switch (type) {
      case 'shield':
        value = 35;
        break;
      case 'energy':
        value = 40;
        break;
      case 'weapon':
        value = 1;
        break;
    }

    let powerUpPosition: Vector3D;

    if (position) {
      powerUpPosition = { ...position };
    } else {
      const angle = (Math.random() - 0.5) * Math.PI * 0.5;
      const heightVariation = (Math.random() - 0.5) * 100;
      const spawnDistance = 1200;

      powerUpPosition = {
        x: this.ship.position.x + Math.sin(angle) * spawnDistance,
        y: this.ship.position.y + heightVariation,
        z: this.ship.position.z + spawnDistance
      };
    }

    const velocityMagnitude = 3 + Math.random() * 2;
    const dirToPlayer = {
      x: this.ship.position.x - powerUpPosition.x,
      y: this.ship.position.y - powerUpPosition.y,
      z: this.ship.position.z - powerUpPosition.z
    };

    const distance = Math.sqrt(
      dirToPlayer.x * dirToPlayer.x +
      dirToPlayer.y * dirToPlayer.y +
      dirToPlayer.z * dirToPlayer.z
    );

    const velocity = {
      x: (dirToPlayer.x / distance) * velocityMagnitude,
      y: (dirToPlayer.y / distance) * velocityMagnitude,
      z: (dirToPlayer.z / distance) * velocityMagnitude
    };

    return {
      position: powerUpPosition,
      rotation: createVector3D(
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2
      ),
      scale: createVector3D(15, 15, 15),
      velocity,
      color: type === 'shield' ? 'rgb(0, 150, 255)' :
        type === 'energy' ? 'rgb(255, 200, 0)' :
          'rgb(255, 50, 100)',
      opacity: 1,
      type,
      duration: 10000,
      value
    };
  }

  private spawnObstacles(): void {
    if (this.obstacles.length >= this.settings.obstacles.maxCount) return;

    const spawnDistance = this.settings.obstacles.spawnDistance;
    const angleSpread = Math.PI * 0.7;
    const angle = (Math.random() - 0.5) * angleSpread;

    const yVariation = (Math.random() - 0.5) * 200;

    const position = {
      x: this.ship.position.x + Math.sin(angle) * spawnDistance,
      y: this.ship.position.y + yVariation,
      z: this.ship.position.z + spawnDistance
    };

    const directionToPlayer = {
      x: this.ship.position.x - position.x,
      y: this.ship.position.y - position.y,
      z: this.ship.position.z - position.z
    };

    const length = Math.sqrt(
      directionToPlayer.x * directionToPlayer.x +
      directionToPlayer.y * directionToPlayer.y +
      directionToPlayer.z * directionToPlayer.z
    );

    directionToPlayer.x /= length;
    directionToPlayer.y /= length;
    directionToPlayer.z /= length;

    directionToPlayer.x += (Math.random() - 0.5) * 0.1;
    directionToPlayer.y += (Math.random() - 0.5) * 0.1;

    const speed = this.settings.obstacles.maxSpeed * (0.7 + Math.random() * 0.5) * this.difficulty;
    const velocity = {
      x: directionToPlayer.x * speed,
      y: directionToPlayer.y * speed,
      z: directionToPlayer.z * speed
    };

    let obstacleType: 'asteroid' | 'energyField' | 'blackHole' = 'asteroid';
    const typeRoll = Math.random();

    if (this.difficulty > 3 && typeRoll > 0.7) {
      obstacleType = 'blackHole';
    } else if (this.difficulty > 1.5 && typeRoll > 0.4) {
      obstacleType = 'energyField';
    }

    const baseSize = this.settings.obstacles.minSize +
      Math.random() * (this.settings.obstacles.maxSize - this.settings.obstacles.minSize);

    const obstacle: Obstacle = {
      position,
      rotation: createVector3D(
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2
      ),
      scale: createVector3D(baseSize, baseSize, baseSize),
      velocity,
      color: obstacleType === 'asteroid' ? 'rgb(170, 85, 0)' :
        obstacleType === 'energyField' ? 'rgb(0, 255, 0)' :
          'rgb(75, 0, 130)',
      opacity: 1,
      type: obstacleType,
      section: 0,
      rotationSpeed: {
        x: (Math.random() - 0.5) * 0.04 * this.difficulty,
        y: (Math.random() - 0.5) * 0.04 * this.difficulty,
        z: (Math.random() - 0.5) * 0.04 * this.difficulty
      },
      damage: obstacleType === 'asteroid' ? 15 : obstacleType === 'energyField' ? 8 : 25
    };

    this.obstacles.push(obstacle);
  }

  private gameOver(): void {
    this.isGameOver = true;
    this.playSound('gameOver');
    this.audioManager.stopMusic();
  }

  public playSound(name: string): void {
    if (this.settings.audio.enabled) {
      this.audioManager.play(name);
    }
  }

  public switchWeapon(): void {
    this.ship.currentWeapon = (this.ship.currentWeapon + 1) % this.ship.weapons.length;
  }
}