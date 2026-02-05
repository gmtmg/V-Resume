/**
 * PitchShifter - Web Audio API を使用したリアルタイム音声加工
 *
 * プライバシー保護のため、ユーザーの生声をピッチ変更して匿名化します。
 */

export interface PitchShifterOptions {
  pitchRatio?: number; // 0.5 = 1オクターブ下、2.0 = 1オクターブ上
  grainSize?: number; // グラニュラーシンセシスのグレインサイズ
}

export class PitchShifter {
  private audioContext: AudioContext;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private destinationNode: MediaStreamAudioDestinationNode;
  private workletNode: AudioWorkletNode | null = null;
  private pitchRatio: number;
  private isInitialized: boolean = false;

  // Fallback: ScriptProcessorNode (deprecated but widely supported)
  private scriptProcessor: ScriptProcessorNode | null = null;
  private grainSize: number;
  private pitchShifterBuffer: Float32Array;
  private grainWindow: Float32Array;
  private inputBuffer: Float32Array;
  private inputBufferPos: number = 0;

  constructor(options: PitchShifterOptions = {}) {
    this.audioContext = new AudioContext();
    this.pitchRatio = options.pitchRatio ?? 0.75; // デフォルトで少し低い声
    this.grainSize = options.grainSize ?? 512;
    this.destinationNode = this.audioContext.createMediaStreamDestination();

    // Initialize buffers for granular pitch shifting
    this.pitchShifterBuffer = new Float32Array(this.grainSize * 2);
    this.grainWindow = this.createHannWindow(this.grainSize);
    this.inputBuffer = new Float32Array(this.grainSize * 4);
  }

  // Create Hann window for smooth grain transitions
  private createHannWindow(size: number): Float32Array {
    const window = new Float32Array(size);
    for (let i = 0; i < size; i++) {
      window[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (size - 1)));
    }
    return window;
  }

  // Initialize pitch shifter
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    // Resume audio context if suspended
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    this.isInitialized = true;
  }

  // Connect audio source and start processing
  async connectSource(stream: MediaStream): Promise<void> {
    await this.initialize();

    // Disconnect existing source if any
    if (this.sourceNode) {
      this.sourceNode.disconnect();
    }

    // Create source from stream
    this.sourceNode = this.audioContext.createMediaStreamSource(stream);

    // Use ScriptProcessorNode for pitch shifting (granular synthesis)
    this.scriptProcessor = this.audioContext.createScriptProcessor(
      this.grainSize,
      1,
      1
    );

    this.scriptProcessor.onaudioprocess = (event) => {
      this.processAudio(event);
    };

    // Connect: source -> processor -> destination
    this.sourceNode.connect(this.scriptProcessor);
    this.scriptProcessor.connect(this.destinationNode);
  }

  // Granular synthesis pitch shifting
  private processAudio(event: AudioProcessingEvent): void {
    const inputData = event.inputBuffer.getChannelData(0);
    const outputData = event.outputBuffer.getChannelData(0);

    // Copy input to ring buffer
    for (let i = 0; i < inputData.length; i++) {
      this.inputBuffer[(this.inputBufferPos + i) % this.inputBuffer.length] = inputData[i];
    }

    // Calculate output using overlap-add granular synthesis
    const hopSize = Math.floor(this.grainSize / 4);
    const pitchedHopSize = Math.floor(hopSize * this.pitchRatio);

    for (let i = 0; i < outputData.length; i++) {
      let sample = 0;

      // Sum overlapping grains
      for (let grain = 0; grain < 4; grain++) {
        const grainStart = this.inputBufferPos + i - grain * pitchedHopSize;
        const grainPhase = ((i + grain * hopSize) % this.grainSize) / this.grainSize;
        const windowValue = this.grainWindow[Math.floor(grainPhase * this.grainSize)];

        const bufferIndex = ((grainStart % this.inputBuffer.length) + this.inputBuffer.length) % this.inputBuffer.length;
        sample += this.inputBuffer[bufferIndex] * windowValue * 0.5;
      }

      outputData[i] = Math.max(-1, Math.min(1, sample));
    }

    this.inputBufferPos = (this.inputBufferPos + inputData.length) % this.inputBuffer.length;
  }

  // Get the processed audio stream
  getOutputStream(): MediaStream {
    return this.destinationNode.stream;
  }

  // Set pitch ratio dynamically
  setPitchRatio(ratio: number): void {
    this.pitchRatio = Math.max(0.5, Math.min(2.0, ratio));
  }

  // Disconnect and cleanup
  disconnect(): void {
    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }
    if (this.scriptProcessor) {
      this.scriptProcessor.disconnect();
      this.scriptProcessor = null;
    }
  }

  // Full cleanup
  async dispose(): Promise<void> {
    this.disconnect();
    if (this.audioContext.state !== 'closed') {
      await this.audioContext.close();
    }
    this.isInitialized = false;
  }
}

// Simple utility to create a pitch shifted stream
export async function createPitchShiftedStream(
  originalStream: MediaStream,
  pitchRatio: number = 0.75
): Promise<{ stream: MediaStream; pitchShifter: PitchShifter }> {
  const pitchShifter = new PitchShifter({ pitchRatio });
  await pitchShifter.connectSource(originalStream);
  return {
    stream: pitchShifter.getOutputStream(),
    pitchShifter,
  };
}
