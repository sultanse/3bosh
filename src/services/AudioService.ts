import type { MusicTrack, SoundCue } from "./AudioScore";
import { createBrowserAudioContext } from "./BrowserAudioContext";
import { ProceduralSynth } from "./ProceduralSynth";
import type {
  AudioContextFactory,
  AudioContextLike,
  AudioNodeLike,
  AudioSettingsSnapshot,
  GainNodeLike,
} from "./AudioTypes";

export type { MusicTrack, SoundCue } from "./AudioScore";
export type {
  AudioContextFactory,
  AudioContextLike,
  AudioNodeLike,
  AudioParamLike,
  AudioSettingsSnapshot,
  GainNodeLike,
  OscillatorNodeLike,
  ScheduledSourceLike,
} from "./AudioTypes";

const clampVolume = (value: number): number =>
  Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;

export class AudioService {
  private readonly context: AudioContextLike | undefined;
  private readonly masterGain: GainNodeLike | undefined;
  private readonly musicGain: GainNodeLike | undefined;
  private readonly sfxGain: GainNodeLike | undefined;
  private readonly synth: ProceduralSynth | undefined;
  private musicVolume = 0.7;
  private sfxVolume = 0.7;
  private muted = false;
  private unlocked = false;
  private disposed = false;
  private failureReported = false;
  private requestedTrack: MusicTrack | undefined;

  public constructor(contextFactory: AudioContextFactory = createBrowserAudioContext) {
    let context: AudioContextLike | undefined;
    let masterGain: GainNodeLike | undefined;
    let musicGain: GainNodeLike | undefined;
    let sfxGain: GainNodeLike | undefined;
    let synth: ProceduralSynth | undefined;
    try {
      context = contextFactory();
      masterGain = context.createGain();
      musicGain = context.createGain();
      sfxGain = context.createGain();
      musicGain.connect(masterGain);
      sfxGain.connect(masterGain);
      masterGain.connect(context.destination);
      synth = new ProceduralSynth({
        context,
        musicOutput: musicGain,
        sfxOutput: sfxGain,
        reportFailure: (error) => this.reportFailure(error),
      });
    } catch (error: unknown) {
      this.reportFailure(error);
    }
    this.context = context;
    this.masterGain = masterGain;
    this.musicGain = musicGain;
    this.sfxGain = sfxGain;
    this.synth = synth;
    this.applyGain(masterGain, 1);
    this.applyGain(musicGain, this.musicVolume);
    this.applyGain(sfxGain, this.sfxVolume);
  }

  public get settings(): AudioSettingsSnapshot {
    return { musicVolume: this.musicVolume, sfxVolume: this.sfxVolume, muted: this.muted };
  }

  public async unlock(): Promise<boolean> {
    if (this.disposed || this.context === undefined) return false;
    if (this.unlocked) return true;
    try {
      await this.context.resume();
      this.unlocked = true;
      if (this.requestedTrack !== undefined) this.synth?.playMusic(this.requestedTrack);
      return true;
    } catch (error: unknown) {
      this.reportFailure(error);
      return false;
    }
  }

  public playMusic(track: MusicTrack): void {
    if (this.disposed) return;
    this.requestedTrack = track;
    if (this.unlocked) this.synth?.playMusic(track);
  }

  public stopMusic(): void {
    this.requestedTrack = undefined;
    this.synth?.stopMusic();
  }

  public playSfx(cue: SoundCue): void {
    if (this.unlocked && !this.disposed) this.synth?.playSfx(cue);
  }

  public setMusicVolume(value: number): void {
    this.musicVolume = clampVolume(value);
    this.applyGain(this.musicGain, this.musicVolume);
  }

  public setSfxVolume(value: number): void {
    this.sfxVolume = clampVolume(value);
    this.applyGain(this.sfxGain, this.sfxVolume);
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
    this.applyGain(this.masterGain, muted ? 0 : 1);
  }

  public setPaused(paused: boolean): void {
    this.synth?.setPaused(paused);
  }

  public dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.requestedTrack = undefined;
    this.synth?.dispose();
    this.disconnect(this.musicGain);
    this.disconnect(this.sfxGain);
    this.disconnect(this.masterGain);
    const close = this.context?.close();
    if (close !== undefined) void close.catch((error: unknown) => this.reportFailure(error));
  }

  private applyGain(node: GainNodeLike | undefined, value: number): void {
    if (node === undefined) return;
    const now = this.context?.currentTime ?? 0;
    node.gain.cancelScheduledValues(now);
    node.gain.setValueAtTime(value, now);
  }

  private disconnect(node: AudioNodeLike | undefined): void {
    if (node === undefined) return;
    try {
      node.disconnect();
    } catch (error: unknown) {
      this.reportFailure(error);
    }
  }

  private reportFailure(error: unknown): void {
    if (this.failureReported) return;
    this.failureReported = true;
    console.warn("Audio unavailable; continuing silently.", error);
  }
}
