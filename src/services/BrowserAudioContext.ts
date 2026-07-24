import type {
  AudioContextLike,
  AudioNodeLike,
  AudioParamLike,
  GainNodeLike,
  OscillatorNodeLike,
  ScheduledSourceLike,
} from "./AudioTypes";

class BrowserAudioParam implements AudioParamLike {
  public constructor(private readonly parameter: AudioParam) {}

  public get value(): number {
    return this.parameter.value;
  }

  public set value(value: number) {
    this.parameter.value = value;
  }

  public setValueAtTime(value: number, startTime: number): void {
    this.parameter.setValueAtTime(value, startTime);
  }

  public linearRampToValueAtTime(value: number, endTime: number): void {
    this.parameter.linearRampToValueAtTime(value, endTime);
  }

  public exponentialRampToValueAtTime(value: number, endTime: number): void {
    this.parameter.exponentialRampToValueAtTime(value, endTime);
  }

  public cancelScheduledValues(cancelTime: number): void {
    this.parameter.cancelScheduledValues(cancelTime);
  }
}

class BrowserAudioNode implements AudioNodeLike {
  public constructor(protected readonly node: AudioNode) {}

  public connect(destination: AudioNodeLike): void {
    if (!(destination instanceof BrowserAudioNode)) {
      throw new TypeError("Cannot connect incompatible audio nodes");
    }
    this.node.connect(destination.node);
  }

  public disconnect(): void {
    this.node.disconnect();
  }
}

class BrowserGainNode extends BrowserAudioNode implements GainNodeLike {
  public readonly gain: AudioParamLike;

  public constructor(node: GainNode) {
    super(node);
    this.gain = new BrowserAudioParam(node.gain);
  }
}

class BrowserScheduledSource extends BrowserAudioNode implements ScheduledSourceLike {
  private endListener: (() => void) | null = null;

  public constructor(protected readonly source: AudioScheduledSourceNode) {
    super(source);
  }

  public get onended(): (() => void) | null {
    return this.endListener;
  }

  public set onended(listener: (() => void) | null) {
    this.endListener = listener;
    this.source.onended = listener === null ? null : () => listener();
  }

  public start(when = 0): void {
    this.source.start(when);
  }

  public stop(when = 0): void {
    this.source.stop(when);
  }
}

class BrowserOscillatorNode extends BrowserScheduledSource implements OscillatorNodeLike {
  public readonly frequency: AudioParamLike;

  public constructor(private readonly oscillator: OscillatorNode) {
    super(oscillator);
    this.frequency = new BrowserAudioParam(oscillator.frequency);
  }

  public get type(): OscillatorType {
    return this.oscillator.type;
  }

  public set type(type: OscillatorType) {
    this.oscillator.type = type;
  }
}

export class BrowserAudioContext implements AudioContextLike {
  private readonly context = new AudioContext();
  public readonly destination: AudioNodeLike = new BrowserAudioNode(this.context.destination);

  public get currentTime(): number {
    return this.context.currentTime;
  }

  public get state(): AudioContextState {
    return this.context.state;
  }

  public resume(): Promise<void> {
    return this.context.resume();
  }

  public createGain(): GainNodeLike {
    return new BrowserGainNode(this.context.createGain());
  }

  public createOscillator(): OscillatorNodeLike {
    return new BrowserOscillatorNode(this.context.createOscillator());
  }

  public createNoiseSource(durationSeconds: number): ScheduledSourceLike {
    const frameCount = Math.max(1, Math.floor(this.context.sampleRate * durationSeconds));
    const buffer = this.context.createBuffer(1, frameCount, this.context.sampleRate);
    const samples = buffer.getChannelData(0);
    let state = 0x2f6e2b1;
    for (let index = 0; index < samples.length; index += 1) {
      state = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0;
      samples[index] = (state / 0xffff_ffff) * 2 - 1;
    }
    const source = this.context.createBufferSource();
    source.buffer = buffer;
    return new BrowserScheduledSource(source);
  }

  public close(): Promise<void> {
    return this.context.close();
  }
}

export const createBrowserAudioContext = (): AudioContextLike => new BrowserAudioContext();
