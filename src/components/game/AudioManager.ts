export class AudioManager {
  private enabled: boolean;
  private sfxVolume: number;
  private musicVolume: number;
  private audioContext: AudioContext | null = null;
  private sounds: Map<string, AudioBuffer> = new Map();
  private music: AudioBufferSourceNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private isLoaded: boolean = false;
  private loadPromise: Promise<void> | null = null;

  constructor(enabled: boolean = true, sfxVolume: number = 0.5, musicVolume: number = 0.3) {
    this.enabled = enabled;
    this.sfxVolume = sfxVolume;
    this.musicVolume = musicVolume;
    
    if (typeof window !== 'undefined') {
      // Initialize audio context
      try {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        this.setupAudio();
      } catch (e) {
        console.warn('Web Audio API not supported in this browser');
      }
    }
  }

  private async setupAudio(): Promise<void> {
    if (!this.audioContext) return;
    
    // Create gain nodes for volume control
    this.sfxGain = this.audioContext.createGain();
    this.sfxGain.gain.value = this.enabled ? this.sfxVolume : 0;
    this.sfxGain.connect(this.audioContext.destination);
    
    this.musicGain = this.audioContext.createGain();
    this.musicGain.gain.value = this.enabled ? this.musicVolume : 0;
    this.musicGain.connect(this.audioContext.destination);
    
    // Load sounds
    this.loadPromise = this.loadSounds();
  }
  
  private async loadSounds(): Promise<void> {
    if (!this.audioContext) return;
    
    const soundFiles = {
      'laser': '/sounds/laser.mp3',
      'plasma': '/sounds/plasma.mp3',
      'missile': '/sounds/missile.mp3',
      'explosion': '/sounds/explosion.mp3',
      'powerup': '/sounds/powerup.mp3',
      'gameOver': '/sounds/game-over.mp3',
      'music': '/audio/blipotron.mp3'
    };
    
    // Create placeholder sounds to prevent errors
    for (const [key] of Object.entries(soundFiles)) {
      // Create a short silent buffer as placeholder
      const buffer = this.audioContext.createBuffer(1, 22050, 44100);
      this.sounds.set(key, buffer);
    }
    
    // Load actual sounds in background (non-blocking)
    const promises = Object.entries(soundFiles).map(async ([key, url]) => {
      try {
        // Create a silent placeholder first to avoid errors
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await this.audioContext!.decodeAudioData(arrayBuffer);
        this.sounds.set(key, audioBuffer);
      } catch (error) {
        console.warn(`Failed to load sound: ${key}`, error);
      }
    });
    
    await Promise.all(promises);
    this.isLoaded = true;
    
    // Start background music once loaded
    if (this.enabled) {
      this.playMusic();
    }
  }

  public play(name: string): void {
    if (!this.enabled || !this.audioContext || !this.sfxGain) return;
    
    // Resume audio context if it's suspended (common due to browser autoplay policies)
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
    
    const sound = this.sounds.get(name);
    if (!sound) return;
    
    // Create and play sound
    const source = this.audioContext.createBufferSource();
    source.buffer = sound;
    source.connect(this.sfxGain);
    
    // Add some variety to sound effects
    if (name !== 'music' && name !== 'gameOver') {
      source.playbackRate.value = 0.9 + Math.random() * 0.2;
    }
    
    source.start(0);
  }

  public playMusic(): void {
    if (!this.enabled || !this.audioContext || !this.musicGain) return;
    
    // Stop current music if playing
    if (this.music) {
      this.music.stop();
      this.music = null;
    }
    
    const musicBuffer = this.sounds.get('music');
    if (!musicBuffer) return;
    
    // Resume audio context if needed
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
    
    // Create and play background music
    this.music = this.audioContext.createBufferSource();
    this.music.buffer = musicBuffer;
    this.music.loop = true;
    this.music.connect(this.musicGain);
    this.music.start(0);
  }

  public stopMusic(): void {
    if (this.music) {
      this.music.stop();
      this.music = null;
    }
  }

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    
    if (!this.audioContext || !this.sfxGain || !this.musicGain) return;
    
    // Update gain nodes
    this.sfxGain.gain.value = enabled ? this.sfxVolume : 0;
    this.musicGain.gain.value = enabled ? this.musicVolume : 0;
    
    // Start or stop music
    if (enabled) {
      if (!this.music) {
        this.playMusic();
      }
    } else {
      this.stopMusic();
    }
  }

  public isAudioEnabled(): boolean {
    return this.enabled;
  }
}
