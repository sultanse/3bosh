import type { GameEvents } from "../core/TypedEventBus";
import { TypedEventBus } from "../core/TypedEventBus";
import {
  DEFAULT_SAVE_DATA,
  SaveService,
  type AudioSettings,
  type SaveData,
} from "../services/SaveService";
import { GameFlowMachine, type GameFlowState } from "./GameFlowMachine";
import { LevelSession, type Checkpoint } from "./LevelSession";

export class GameSession {
  public currentLevel: LevelSession | null = null;
  private audioSettingsState: AudioSettings;

  public constructor(
    private readonly flow: GameFlowMachine,
    private readonly saves: SaveService,
    private readonly events: TypedEventBus<GameEvents>,
  ) {
    const save = saves.load();
    this.audioSettingsState = {
      musicVolume: save.musicVolume,
      sfxVolume: save.sfxVolume,
      muted: save.muted,
    };
  }

  public get saveData(): SaveData {
    return this.saves.load();
  }

  public get audioSettings(): AudioSettings {
    return { ...this.audioSettingsState };
  }

  public updateAudioSettings(settings: AudioSettings): void {
    this.audioSettingsState = { ...settings };
  }

  public persistAudioSettings(settings: AudioSettings): void {
    this.updateAudioSettings(settings);
    this.saves.saveAudio(settings);
  }

  public resetAudioSettings(): AudioSettings {
    this.audioSettingsState = {
      musicVolume: DEFAULT_SAVE_DATA.musicVolume,
      sfxVolume: DEFAULT_SAVE_DATA.sfxVolume,
      muted: DEFAULT_SAVE_DATA.muted,
    };
    return this.audioSettings;
  }

  public startLevel(spawnCheckpoint: Checkpoint): LevelSession {
    this.currentLevel = new LevelSession(spawnCheckpoint, this.events);
    return this.currentLevel;
  }

  public transition(next: GameFlowState): void {
    this.flow.transition(next);
    if (next === "victory" || next === "gameOver") {
      this.finalizeHighScore();
    }
  }

  private finalizeHighScore(): void {
    if (this.currentLevel !== null) {
      this.saves.saveHighScore(this.currentLevel.snapshot.score);
    }
  }
}
