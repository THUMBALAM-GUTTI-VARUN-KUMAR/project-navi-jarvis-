/**
 * AmbientAudioEngine
 * Generates synthetic procedural ambient soundscapes using Web Audio API
 * (Rain, Ocean Waves, Lofi Chimes, Cozy Cafe, Fireplace).
 */

export class AmbientAudioEngine {
  private audioCtx: AudioContext | null = null;
  private currentSound: string = 'stop';
  private gainNode: GainNode | null = null;
  private noiseNode: AudioNode | null = null;
  private timerId: number | null = null;

  public play(sound: string): void {
    this.stop();

    if (sound === 'stop' || !sound) return;

    const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.audioCtx = new AudioCtxClass();
    this.gainNode = this.audioCtx.createGain();
    this.gainNode.gain.value = 0.25;
    this.gainNode.connect(this.audioCtx.destination);

    this.currentSound = sound;

    switch (sound) {
      case 'rain':
        this.createRainSound();
        break;
      case 'waves':
        this.createOceanWavesSound();
        break;
      case 'lofi_chimes':
        this.createLofiChimesSound();
        break;
      case 'fireplace':
        this.createFireplaceSound();
        break;
      case 'cozy_cafe':
        this.createCozyCafeSound();
        break;
      default:
        this.createRainSound();
    }
  }

  public stop(): void {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    if (this.noiseNode) {
      try {
        (this.noiseNode as AudioBufferSourceNode).stop();
      } catch (e) {
        // ignore
      }
      this.noiseNode = null;
    }
    if (this.audioCtx && this.audioCtx.state !== 'closed') {
      this.audioCtx.close().catch(() => {});
      this.audioCtx = null;
    }
    this.currentSound = 'stop';
  }

  public getCurrentSound(): string {
    return this.currentSound;
  }

  private createPinkNoiseBuffer(ctx: AudioContext): AudioBuffer {
    const bufferSize = ctx.sampleRate * 5;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;

    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.04;
      b6 = white * 0.115926;
    }
    return buffer;
  }

  private createRainSound(): void {
    if (!this.audioCtx || !this.gainNode) return;

    const noiseBuffer = this.createPinkNoiseBuffer(this.audioCtx);
    const whiteNoise = this.audioCtx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    const filter = this.audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1000;

    whiteNoise.connect(filter);
    filter.connect(this.gainNode);
    whiteNoise.start();
    this.noiseNode = whiteNoise;
  }

  private createOceanWavesSound(): void {
    if (!this.audioCtx || !this.gainNode) return;

    const noiseBuffer = this.createPinkNoiseBuffer(this.audioCtx);
    const whiteNoise = this.audioCtx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    const filter = this.audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 400;

    const lfo = this.audioCtx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.12; // wave period ~8 seconds

    const lfoGain = this.audioCtx.createGain();
    lfoGain.gain.value = 300;

    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);

    whiteNoise.connect(filter);
    filter.connect(this.gainNode);

    lfo.start();
    whiteNoise.start();
    this.noiseNode = whiteNoise;
  }

  private createFireplaceSound(): void {
    if (!this.audioCtx || !this.gainNode) return;

    const noiseBuffer = this.createPinkNoiseBuffer(this.audioCtx);
    const whiteNoise = this.audioCtx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    const filter = this.audioCtx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 600;
    filter.Q.value = 3;

    whiteNoise.connect(filter);
    filter.connect(this.gainNode);
    whiteNoise.start();
    this.noiseNode = whiteNoise;
  }

  private createLofiChimesSound(): void {
    if (!this.audioCtx || !this.gainNode) return;

    const notes = [261.63, 329.63, 392.0, 523.25, 659.25]; // C E G C E pentatonic
    this.timerId = window.setInterval(() => {
      if (!this.audioCtx || !this.gainNode) return;
      const freq = notes[Math.floor(Math.random() * notes.length)];
      const osc = this.audioCtx.createOscillator();
      const noteGain = this.audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.value = freq;

      const now = this.audioCtx.currentTime;
      noteGain.gain.setValueAtTime(0.01, now);
      noteGain.gain.exponentialRampToValueAtTime(0.15, now + 0.1);
      noteGain.gain.exponentialRampToValueAtTime(0.0001, now + 3.5);

      osc.connect(noteGain);
      noteGain.connect(this.gainNode);

      osc.start(now);
      osc.stop(now + 3.6);
    }, 2200);
  }

  private createCozyCafeSound(): void {
    if (!this.audioCtx || !this.gainNode) return;

    const noiseBuffer = this.createPinkNoiseBuffer(this.audioCtx);
    const whiteNoise = this.audioCtx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    const filter = this.audioCtx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1200;
    filter.Q.value = 1.5;

    whiteNoise.connect(filter);
    filter.connect(this.gainNode);
    whiteNoise.start();
    this.noiseNode = whiteNoise;
  }
}
