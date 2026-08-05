/**
 * AudioStreamer
 * Captures microphone input, computes volume level, encodes 16-bit PCM (16kHz),
 * and streams Base64 encoded audio chunks.
 */

export interface AudioStreamerOptions {
  onAudioChunk: (base64Pcm: string, volume: number) => void;
  onError: (error: Error) => void;
}

export class AudioStreamer {
  private mediaStream: MediaStream | null = null;
  private audioCtx: AudioContext | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private processorNode: ScriptProcessorNode | null = null;
  private isMuted: boolean = false;
  private isRecording: boolean = false;

  constructor(private options: AudioStreamerOptions) {}

  public async start(): Promise<void> {
    if (this.isRecording) return;

    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // Target sample rate for Gemini Live input is 16000Hz
      // Browser AudioContext defaults to hardware rate (44100Hz or 48000Hz)
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioCtx = new AudioCtxClass();

      this.sourceNode = this.audioCtx.createMediaStreamSource(this.mediaStream);
      
      // 4096 buffer size gives a good balance between latency (~85ms) and performance
      this.processorNode = this.audioCtx.createScriptProcessor(4096, 1, 1);

      const targetSampleRate = 16000;
      const nativeSampleRate = this.audioCtx.sampleRate;

      this.processorNode.onaudioprocess = (e: AudioProcessingEvent) => {
        if (this.isMuted || !this.isRecording) return;

        const inputData = e.inputBuffer.getChannelData(0);

        // 1. Calculate RMS volume level for visualizer
        let sumSq = 0;
        for (let i = 0; i < inputData.length; i++) {
          sumSq += inputData[i] * inputData[i];
        }
        const rms = Math.sqrt(sumSq / inputData.length);
        const volume = Math.min(1.0, Math.max(0, rms * 4)); // scaled 0..1

        // 2. Resample Float32 audio to 16kHz Int16 PCM
        const pcm16 = this.resampleAndEncodePCM16(inputData, nativeSampleRate, targetSampleRate);

        if (pcm16.length > 0) {
          const base64 = this.arrayBufferToBase64(pcm16.buffer);
          this.options.onAudioChunk(base64, volume);
        }
      };

      this.sourceNode.connect(this.processorNode);
      this.processorNode.connect(this.audioCtx.destination);
      this.isRecording = true;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      this.options.onError(error);
      this.stop();
    }
  }

  public setMuted(muted: boolean): void {
    this.isMuted = muted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public stop(): void {
    this.isRecording = false;

    if (this.processorNode) {
      this.processorNode.disconnect();
      this.processorNode.onaudioprocess = null;
      this.processorNode = null;
    }

    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }

    if (this.audioCtx && this.audioCtx.state !== 'closed') {
      this.audioCtx.close().catch(() => {});
      this.audioCtx = null;
    }
  }

  /**
   * Resamples raw Float32 array to target 16kHz Int16 array
   */
  private resampleAndEncodePCM16(
    float32Array: Float32Array,
    fromRate: number,
    toRate: number
  ): Int16Array {
    if (fromRate === toRate) {
      const result = new Int16Array(float32Array.length);
      for (let i = 0; i < float32Array.length; i++) {
        const s = Math.max(-1, Math.min(1, float32Array[i]));
        result[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
      }
      return result;
    }

    const ratio = fromRate / toRate;
    const newLength = Math.floor(float32Array.length / ratio);
    const result = new Int16Array(newLength);

    for (let i = 0; i < newLength; i++) {
      const originIndex = Math.floor(i * ratio);
      const s = Math.max(-1, Math.min(1, float32Array[originIndex]));
      result[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }

    return result;
  }

  private arrayBufferToBase64(buffer: ArrayBufferLike): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }
}
