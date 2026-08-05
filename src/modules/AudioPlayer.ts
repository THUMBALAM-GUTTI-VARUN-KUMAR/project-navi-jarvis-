/**
 * AudioPlayer
 * Plays raw 24kHz PCM16 model output audio chunks using Web Audio API.
 * Supports gapless scheduled playback, real-time audio visualization analysis,
 * and instant interruption queue clearing.
 */

export class AudioPlayer {
  private audioCtx: AudioContext | null = null;
  private analyserNode: AnalyserNode | null = null;
  private gainNode: GainNode | null = null;
  private nextStartTime: number = 0;
  private activeSources: AudioBufferSourceNode[] = [];
  private sampleRate: number = 24000;
  private isPlaying: boolean = false;
  private onPlaybackEndCallback?: () => void;

  constructor() {
    // AudioContext will be initialized on user interaction / session start
  }

  public init(): void {
    if (!this.audioCtx || this.audioCtx.state === 'closed') {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioCtx = new AudioCtxClass({ sampleRate: this.sampleRate });
      
      this.analyserNode = this.audioCtx.createAnalyser();
      this.analyserNode.fftSize = 256;
      this.analyserNode.smoothingTimeConstant = 0.8;

      this.gainNode = this.audioCtx.createGain();
      this.gainNode.gain.value = 1.0;

      this.gainNode.connect(this.analyserNode);
      this.analyserNode.connect(this.audioCtx.destination);

      this.nextStartTime = this.audioCtx.currentTime;
    } else if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  public async playChunk(base64Pcm: string): Promise<void> {
    this.init();

    if (!this.audioCtx || !this.gainNode) return;

    try {
      const float32Data = this.base64ToFloat32(base64Pcm);
      if (float32Data.length === 0) return;

      const buffer = this.audioCtx.createBuffer(1, float32Data.length, this.sampleRate);
      buffer.getChannelData(0).set(float32Data);

      const source = this.audioCtx.createBufferSource();
      source.buffer = buffer;
      source.connect(this.gainNode);

      const currentTime = this.audioCtx.currentTime;
      // Schedule chunk sequentially for gapless audio playback
      const startTime = Math.max(currentTime, this.nextStartTime);
      source.start(startTime);

      this.nextStartTime = startTime + buffer.duration;
      this.isPlaying = true;
      this.activeSources.push(source);

      source.onended = () => {
        const index = this.activeSources.indexOf(source);
        if (index !== -1) {
          this.activeSources.splice(index, 1);
        }
        if (this.activeSources.length === 0 && this.audioCtx) {
          if (this.audioCtx.currentTime >= this.nextStartTime - 0.05) {
            this.isPlaying = false;
            if (this.onPlaybackEndCallback) {
              this.onPlaybackEndCallback();
            }
          }
        }
      };
    } catch (err) {
      console.error('AudioPlayer playChunk error:', err);
    }
  }

  /**
   * Clears the playback queue immediately upon user interruption
   */
  public clearQueue(): void {
    this.activeSources.forEach((source) => {
      try {
        source.stop();
        source.disconnect();
      } catch (e) {
        // Source may have already stopped
      }
    });
    this.activeSources = [];
    if (this.audioCtx) {
      this.nextStartTime = this.audioCtx.currentTime;
    }
    this.isPlaying = false;
  }

  public setVolume(volume: number): void {
    if (this.gainNode) {
      this.gainNode.gain.value = Math.max(0, Math.min(1, volume));
    }
  }

  public setOnPlaybackEnd(callback: () => void): void {
    this.onPlaybackEndCallback = callback;
  }

  public getIsPlaying(): boolean {
    return this.isPlaying || this.activeSources.length > 0;
  }

  /**
   * Returns current real-time audio energy volume (0..1)
   */
  public getVolume(): number {
    if (!this.analyserNode) return 0;
    const data = new Uint8Array(this.analyserNode.frequencyBinCount);
    this.analyserNode.getByteFrequencyData(data);
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      sum += data[i];
    }
    const average = sum / data.length;
    return Math.min(1.0, average / 128);
  }

  /**
   * Returns frequency byte array for waveform canvas animation
   */
  public getFrequencyData(dataArray: Uint8Array): void {
    if (this.analyserNode) {
      this.analyserNode.getByteFrequencyData(dataArray);
    } else {
      dataArray.fill(0);
    }
  }

  public close(): void {
    this.clearQueue();
    if (this.audioCtx && this.audioCtx.state !== 'closed') {
      this.audioCtx.close().catch(() => {});
      this.audioCtx = null;
    }
  }

  private base64ToFloat32(base64: string): Float32Array {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const int16Array = new Int16Array(bytes.buffer);
    const float32Array = new Float32Array(int16Array.length);
    for (let i = 0; i < int16Array.length; i++) {
      float32Array[i] = int16Array[i] / 32768.0;
    }
    return float32Array;
  }
}
