export interface AudioParamLike {
  value: number;
  setValueAtTime(value: number, startTime: number): void;
  linearRampToValueAtTime(value: number, endTime: number): void;
  exponentialRampToValueAtTime(value: number, endTime: number): void;
  cancelScheduledValues(cancelTime: number): void;
}

export interface AudioNodeLike {
  connect(destination: AudioNodeLike): void;
  disconnect(): void;
}

export interface GainNodeLike extends AudioNodeLike {
  readonly gain: AudioParamLike;
}

export interface ScheduledSourceLike extends AudioNodeLike {
  onended: (() => void) | null;
  start(when?: number): void;
  stop(when?: number): void;
}

export interface OscillatorNodeLike extends ScheduledSourceLike {
  readonly frequency: AudioParamLike;
  type: OscillatorType;
}

export interface AudioContextLike {
  readonly destination: AudioNodeLike;
  readonly currentTime: number;
  readonly state: AudioContextState;
  resume(): Promise<void>;
  createGain(): GainNodeLike;
  createOscillator(): OscillatorNodeLike;
  createNoiseSource(durationSeconds: number): ScheduledSourceLike;
  close(): Promise<void>;
}

export type AudioContextFactory = () => AudioContextLike;

export interface AudioSettingsSnapshot {
  readonly musicVolume: number;
  readonly sfxVolume: number;
  readonly muted: boolean;
}
