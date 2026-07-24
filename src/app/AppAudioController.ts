import { AudioService, type SoundCue } from "../services/AudioService";
import { DisposableBag, type DisposableLike } from "../core/DisposableBag";
import type { GameEvents, TypedEventBus } from "../core/TypedEventBus";
import type { AudioSettings } from "../services/SaveService";
import type { SaveService } from "../services/SaveService";
import type { AudioSettingsPanelOptions } from "../ui/AudioSettingsPanel";
import type { GameSession } from "./GameSession";

export class AppAudioController {
  private readonly audio = new AudioService();
  private listenersAttached = false;

  public constructor(
    private readonly session: GameSession,
    private readonly saves: SaveService,
  ) {
    this.applySettings(session.audioSettings);
  }

  public start(): void {
    if (!this.listenersAttached) {
      this.listenersAttached = true;
      window.addEventListener("pointerdown", this.handleUnlock);
      window.addEventListener("keydown", this.handleUnlock);
    }
    this.audio.playMusic("workshop");
  }

  public settingsPanelOptions(): AudioSettingsPanelOptions {
    return {
      initial: this.session.audioSettings,
      callbacks: {
        change: (settings) => {
          this.session.updateAudioSettings(settings);
          this.applySettings(settings);
        },
        persist: (settings) => this.session.persistAudioSettings(settings),
        clear: () => {
          this.saves.clear();
          const settings = this.session.resetAudioSettings();
          this.applySettings(settings);
          return settings;
        },
      },
    };
  }

  public bindLevel(events: TypedEventBus<GameEvents>): DisposableLike {
    const subscriptions = new DisposableBag();
    subscriptions.add(events.on("playerJumped", () => this.audio.playSfx("jump")));
    subscriptions.add(events.on("collectibleCollected", () => this.audio.playSfx("collect")));
    subscriptions.add(events.on("playerDamaged", () => this.audio.playSfx("damage")));
    subscriptions.add(events.on("enemyDefeated", () => this.audio.playSfx("enemyDefeat")));
    subscriptions.add(events.on("pauseRequested", () => this.audio.setPaused(true)));
    subscriptions.add(events.on("levelCompleted", () => {
      this.audio.playSfx("victory");
      this.audio.stopMusic();
    }));
    subscriptions.add(events.on("playerDied", () => {
      this.audio.playSfx("gameOver");
      this.audio.stopMusic();
    }));
    return subscriptions;
  }

  public playMusic(): void {
    this.audio.playMusic("workshop");
  }

  public stopMusic(): void {
    this.audio.stopMusic();
  }

  public playSfx(cue: SoundCue): void {
    this.audio.playSfx(cue);
  }

  public setPaused(paused: boolean): void {
    this.audio.setPaused(paused);
  }

  public dispose(): void {
    this.removeUnlockListeners();
    this.audio.dispose();
  }

  private readonly handleUnlock = (): void => {
    void this.audio.unlock().then((unlocked) => {
      if (unlocked) this.removeUnlockListeners();
    });
  };

  private removeUnlockListeners(): void {
    if (!this.listenersAttached) return;
    this.listenersAttached = false;
    window.removeEventListener("pointerdown", this.handleUnlock);
    window.removeEventListener("keydown", this.handleUnlock);
  }

  private applySettings(settings: AudioSettings): void {
    this.audio.setMusicVolume(settings.musicVolume);
    this.audio.setSfxVolume(settings.sfxVolume);
    this.audio.setMuted(settings.muted);
  }
}
