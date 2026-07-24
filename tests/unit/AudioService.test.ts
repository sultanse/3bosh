import { afterEach, describe, expect, it, vi } from "vitest";

import {
  AudioService,
  type AudioContextLike,
  type AudioNodeLike,
  type AudioParamLike,
  type GainNodeLike,
  type OscillatorNodeLike,
  type ScheduledSourceLike,
} from "../../src/services/AudioService";

class FakeAudioParam implements AudioParamLike {
  public value = 1;

  public setValueAtTime(value: number, _startTime: number): void {
    this.value = value;
  }

  public linearRampToValueAtTime(value: number, _endTime: number): void {
    this.value = value;
  }

  public exponentialRampToValueAtTime(value: number, _endTime: number): void {
    this.value = value;
  }

  public cancelScheduledValues(_cancelTime: number): void {}
}

class FakeAudioNode implements AudioNodeLike {
  public readonly connections: AudioNodeLike[] = [];
  public disconnected = false;

  public connect(destination: AudioNodeLike): void {
    this.connections.push(destination);
  }

  public disconnect(): void {
    this.disconnected = true;
  }
}

class FakeGainNode extends FakeAudioNode implements GainNodeLike {
  public readonly gain = new FakeAudioParam();
}

class FakeScheduledSource extends FakeAudioNode implements ScheduledSourceLike {
  public onended: (() => void) | null = null;
  public readonly starts: number[] = [];
  public readonly stops: number[] = [];

  public start(when = 0): void {
    this.starts.push(when);
  }

  public stop(when = 0): void {
    this.stops.push(when);
  }
}

class FakeOscillatorNode extends FakeScheduledSource implements OscillatorNodeLike {
  public readonly frequency = new FakeAudioParam();
  public type: OscillatorType = "sine";
}

class FakeAudioContext implements AudioContextLike {
  public readonly destination = new FakeAudioNode();
  public readonly gains: FakeGainNode[] = [];
  public readonly oscillators: FakeOscillatorNode[] = [];
  public readonly noiseSources: FakeScheduledSource[] = [];
  public currentTime = 0;
  public state: AudioContextState = "suspended";
  public resumeCalls = 0;
  public closeCalls = 0;
  public resumeError: Error | undefined;

  public async resume(): Promise<void> {
    this.resumeCalls += 1;
    if (this.resumeError !== undefined) {
      throw this.resumeError;
    }
    this.state = "running";
  }

  public createGain(): GainNodeLike {
    const gain = new FakeGainNode();
    this.gains.push(gain);
    return gain;
  }

  public createOscillator(): OscillatorNodeLike {
    const oscillator = new FakeOscillatorNode();
    this.oscillators.push(oscillator);
    return oscillator;
  }

  public createNoiseSource(_durationSeconds: number): ScheduledSourceLike {
    const source = new FakeScheduledSource();
    this.noiseSources.push(source);
    return source;
  }

  public async close(): Promise<void> {
    this.closeCalls += 1;
    this.state = "closed";
  }

  public get startedSources(): readonly FakeScheduledSource[] {
    return [...this.oscillators, ...this.noiseSources].filter((source) => source.starts.length > 0);
  }
}

const requiredAt = <Value>(values: readonly Value[], index: number): Value => {
  const value = values[index];
  if (value === undefined) {
    throw new Error(`Missing fake value at index ${index}`);
  }
  return value;
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("AudioService", () => {
  it("starts no music or sound effect source before unlock", () => {
    // Given
    const context = new FakeAudioContext();
    const audio = new AudioService(() => context);

    // When
    audio.playMusic("workshop");
    audio.playSfx("jump");

    // Then
    expect(context.startedSources).toHaveLength(0);
    audio.dispose();
  });

  it("resumes the context and starts requested music on the first successful unlock", async () => {
    // Given
    const context = new FakeAudioContext();
    const audio = new AudioService(() => context);
    audio.playMusic("workshop");

    // When
    const unlocked = await audio.unlock();

    // Then
    expect(unlocked).toBe(true);
    expect(context.resumeCalls).toBe(1);
    expect(context.startedSources.length).toBeGreaterThan(0);
    audio.dispose();
  });

  it("returns false without throwing when context resume fails", async () => {
    // Given
    const context = new FakeAudioContext();
    context.resumeError = new Error("Autoplay denied");
    const audio = new AudioService(() => context);
    audio.playMusic("workshop");
    vi.spyOn(console, "warn").mockImplementation(() => undefined);

    // When
    const unlocked = await audio.unlock();

    // Then
    expect(unlocked).toBe(false);
    expect(context.startedSources).toHaveLength(0);
    audio.dispose();
  });

  it("keeps music and SFX gains independent and clamps invalid values", () => {
    // Given
    const context = new FakeAudioContext();
    const audio = new AudioService(() => context);

    // When
    audio.setMusicVolume(2);
    audio.setSfxVolume(-1);

    // Then
    expect(audio.settings).toEqual({ musicVolume: 1, sfxVolume: 0, muted: false });
    expect(requiredAt(context.gains, 1).gain.value).toBe(1);
    expect(requiredAt(context.gains, 2).gain.value).toBe(0);

    audio.setMusicVolume(Number.NaN);
    audio.setSfxVolume(Number.POSITIVE_INFINITY);
    expect(audio.settings).toEqual({ musicVolume: 0, sfxVolume: 0, muted: false });
    audio.dispose();
  });

  it("mutes through the master gain and restores prior channel settings", () => {
    // Given
    const context = new FakeAudioContext();
    const audio = new AudioService(() => context);
    audio.setMusicVolume(0.4);
    audio.setSfxVolume(0.8);

    // When
    audio.setMuted(true);

    // Then
    expect(requiredAt(context.gains, 0).gain.value).toBe(0);
    expect(requiredAt(context.gains, 1).gain.value).toBe(0.4);
    expect(requiredAt(context.gains, 2).gain.value).toBe(0.8);

    audio.setMuted(false);
    expect(requiredAt(context.gains, 0).gain.value).toBe(1);
    expect(audio.settings).toEqual({ musicVolume: 0.4, sfxVolume: 0.8, muted: false });
    audio.dispose();
  });

  it("applies cooldown to rapid repeats of one cue without blocking other cues", async () => {
    // Given
    const context = new FakeAudioContext();
    const audio = new AudioService(() => context);
    await audio.unlock();

    // When
    audio.playSfx("jump");
    const afterFirstJump = context.startedSources.length;
    audio.playSfx("jump");

    // Then
    expect(context.startedSources).toHaveLength(afterFirstJump);
    audio.playSfx("collect");
    expect(context.startedSources.length).toBeGreaterThan(afterFirstJump);
    audio.dispose();
  });

  it("stops active sources and disconnects created nodes on dispose", async () => {
    // Given
    const context = new FakeAudioContext();
    const audio = new AudioService(() => context);
    audio.playMusic("workshop");
    await audio.unlock();
    audio.playSfx("damage");
    const activeSources = [...context.startedSources];

    // When
    audio.dispose();

    // Then
    expect(activeSources.length).toBeGreaterThan(0);
    expect(activeSources.every((source) => source.stops.length > 0)).toBe(true);
    expect([...context.gains, ...context.oscillators, ...context.noiseSources].every((node) => node.disconnected)).toBe(true);
    expect(context.closeCalls).toBe(1);
  });
});
