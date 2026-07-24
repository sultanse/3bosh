import {
  CUE_SCORE,
  MUSIC_LOOP_SECONDS,
  WORKSHOP_MUSIC_SCORE,
  type MusicTrack,
  type SoundCue,
  type VoiceRecipe,
} from "./AudioScore";
import type { AudioContextLike, AudioNodeLike, GainNodeLike, ScheduledSourceLike } from "./AudioTypes";

type ToneRecipe = Extract<VoiceRecipe, { readonly kind: "tone" }>;
type NoiseRecipe = Extract<VoiceRecipe, { readonly kind: "noise" }>;

interface ProceduralSynthOptions {
  readonly context: AudioContextLike;
  readonly musicOutput: AudioNodeLike;
  readonly sfxOutput: AudioNodeLike;
  readonly reportFailure: (error: unknown) => void;
}

interface ScoreRequest {
  readonly score: readonly VoiceRecipe[];
  readonly start: number;
  readonly output: AudioNodeLike;
  readonly group?: Set<ScheduledSourceLike>;
}

const CUE_COOLDOWN_SECONDS = 0.08;
const ENVELOPE_FLOOR = 0.0001;

const unreachableVoice = (recipe: never): void => {
  void recipe;
};

export class ProceduralSynth {
  private readonly context: AudioContextLike;
  private readonly musicOutput: AudioNodeLike;
  private readonly sfxOutput: AudioNodeLike;
  private readonly reportFailure: (error: unknown) => void;
  private readonly activeSources = new Set<ScheduledSourceLike>();
  private readonly musicSources = new Set<ScheduledSourceLike>();
  private readonly sourceEnvelopes = new Map<ScheduledSourceLike, GainNodeLike>();
  private readonly connectedNodes = new Set<AudioNodeLike>();
  private readonly cueTimes = new Map<SoundCue, number>();
  private requestedTrack: MusicTrack | undefined;
  private activeTrack: MusicTrack | undefined;
  private musicTimer: ReturnType<typeof setTimeout> | undefined;
  private paused = false;
  private disposed = false;

  public constructor(options: ProceduralSynthOptions) {
    this.context = options.context;
    this.musicOutput = options.musicOutput;
    this.sfxOutput = options.sfxOutput;
    this.reportFailure = options.reportFailure;
  }

  public playMusic(track: MusicTrack): void {
    if (this.disposed) return;
    this.requestedTrack = track;
    if (!this.paused) this.startMusic(track);
  }

  public stopMusic(): void {
    this.requestedTrack = undefined;
    this.stopMusicScheduling();
  }

  public playSfx(cue: SoundCue): void {
    if (this.disposed || this.paused) return;
    const previous = this.cueTimes.get(cue);
    if (previous !== undefined && this.context.currentTime - previous < CUE_COOLDOWN_SECONDS) return;
    this.cueTimes.set(cue, this.context.currentTime);
    this.scheduleScore({
      score: CUE_SCORE[cue],
      start: this.context.currentTime,
      output: this.sfxOutput,
    });
  }

  public setPaused(paused: boolean): void {
    if (this.paused === paused || this.disposed) return;
    this.paused = paused;
    if (paused) this.stopMusicScheduling();
    else if (this.requestedTrack !== undefined) this.startMusic(this.requestedTrack);
  }

  public dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.requestedTrack = undefined;
    this.stopMusicScheduling();
    for (const source of [...this.activeSources]) this.stopSource(source);
    for (const node of this.connectedNodes) this.disconnect(node);
    this.connectedNodes.clear();
  }

  private startMusic(track: MusicTrack): void {
    if (this.activeTrack === track && this.musicSources.size > 0) return;
    this.stopMusicScheduling();
    this.activeTrack = track;
    this.scheduleMusicCycle();
  }

  private scheduleMusicCycle(): void {
    if (this.disposed || this.paused || this.activeTrack === undefined) return;
    this.scheduleScore({
      score: WORKSHOP_MUSIC_SCORE,
      start: this.context.currentTime + 0.03,
      output: this.musicOutput,
      group: this.musicSources,
    });
    this.musicTimer = setTimeout(() => {
      this.musicTimer = undefined;
      this.scheduleMusicCycle();
    }, MUSIC_LOOP_SECONDS * 1_000);
  }

  private scheduleScore(request: ScoreRequest): void {
    for (const recipe of request.score) {
      switch (recipe.kind) {
        case "tone":
          this.scheduleTone(recipe, request);
          break;
        case "noise":
          this.scheduleNoise(recipe, request);
          break;
        default:
          unreachableVoice(recipe);
      }
    }
  }

  private scheduleTone(recipe: ToneRecipe, request: ScoreRequest): void {
    let source: ScheduledSourceLike | undefined;
    try {
      const oscillator = this.context.createOscillator();
      source = oscillator;
      const start = request.start + recipe.offset;
      oscillator.type = recipe.type;
      oscillator.frequency.setValueAtTime(recipe.frequency, start);
      oscillator.frequency.exponentialRampToValueAtTime(recipe.endFrequency, start + recipe.duration);
      this.startVoice(source, recipe, request);
    } catch (error: unknown) {
      this.reportFailure(error);
      if (source !== undefined) this.cleanupSource(source);
    }
  }

  private scheduleNoise(recipe: NoiseRecipe, request: ScoreRequest): void {
    let source: ScheduledSourceLike | undefined;
    try {
      source = this.context.createNoiseSource(recipe.duration);
      this.startVoice(source, recipe, request);
    } catch (error: unknown) {
      this.reportFailure(error);
      if (source !== undefined) this.cleanupSource(source);
    }
  }

  private startVoice(source: ScheduledSourceLike, recipe: VoiceRecipe, request: ScoreRequest): void {
    const start = request.start + recipe.offset;
    const envelope = this.context.createGain();
    envelope.gain.setValueAtTime(ENVELOPE_FLOOR, start);
    envelope.gain.linearRampToValueAtTime(recipe.volume, start + Math.min(0.025, recipe.duration / 3));
    envelope.gain.exponentialRampToValueAtTime(ENVELOPE_FLOOR, start + recipe.duration);
    source.connect(envelope);
    envelope.connect(request.output);
    this.activeSources.add(source);
    request.group?.add(source);
    this.sourceEnvelopes.set(source, envelope);
    this.connectedNodes.add(source);
    this.connectedNodes.add(envelope);
    source.onended = () => this.cleanupSource(source);
    source.start(start);
    source.stop(start + recipe.duration + 0.01);
  }

  private stopMusicScheduling(): void {
    if (this.musicTimer !== undefined) clearTimeout(this.musicTimer);
    this.musicTimer = undefined;
    for (const source of [...this.musicSources]) this.stopSource(source);
    this.activeTrack = undefined;
  }

  private stopSource(source: ScheduledSourceLike): void {
    source.onended = null;
    try {
      source.stop(this.context.currentTime);
    } catch (error: unknown) {
      this.reportFailure(error);
    }
    this.cleanupSource(source);
  }

  private cleanupSource(source: ScheduledSourceLike): void {
    const envelope = this.sourceEnvelopes.get(source);
    this.disconnect(source);
    if (envelope !== undefined) this.disconnect(envelope);
    this.sourceEnvelopes.delete(source);
    this.activeSources.delete(source);
    this.musicSources.delete(source);
  }

  private disconnect(node: AudioNodeLike): void {
    try {
      node.disconnect();
    } catch (error: unknown) {
      this.reportFailure(error);
    }
    this.connectedNodes.delete(node);
  }
}
