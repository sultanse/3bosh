export interface SaveData {
  readonly version: 1;
  readonly highScore: number;
  readonly musicVolume: number;
  readonly sfxVolume: number;
  readonly muted: boolean;
  readonly locale: "ar" | "en";
}

export interface AudioSettings {
  readonly musicVolume: number;
  readonly sfxVolume: number;
  readonly muted: boolean;
}

export const DEFAULT_SAVE_DATA: SaveData = {
  version: 1,
  highScore: 0,
  musicVolume: 0.7,
  sfxVolume: 0.7,
  muted: false,
  locale: "ar",
};

const SAVE_KEY = "3bosh.save";

const clampVolume = (value: number): number =>
  Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;

const isSaveData = (value: unknown): value is SaveData => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const data = value as Record<string, unknown>;
  return (
    data.version === 1 &&
    typeof data.highScore === "number" &&
    Number.isFinite(data.highScore) &&
    Number.isInteger(data.highScore) &&
    data.highScore >= 0 &&
    typeof data.musicVolume === "number" &&
    Number.isFinite(data.musicVolume) &&
    typeof data.sfxVolume === "number" &&
    Number.isFinite(data.sfxVolume) &&
    typeof data.muted === "boolean" &&
    (data.locale === "ar" || data.locale === "en")
  );
};

export class SaveService {
  public constructor(private readonly storage: Storage) {}

  public load(): SaveData {
    const serialized = this.storage.getItem(SAVE_KEY);
    if (serialized === null) {
      return DEFAULT_SAVE_DATA;
    }

    try {
      const parsed: unknown = JSON.parse(serialized);
      if (!isSaveData(parsed)) {
        return DEFAULT_SAVE_DATA;
      }

      return {
        ...parsed,
        musicVolume: clampVolume(parsed.musicVolume),
        sfxVolume: clampVolume(parsed.sfxVolume),
      };
    } catch {
      return DEFAULT_SAVE_DATA;
    }
  }

  public saveAudio(settings: AudioSettings): void {
    const save = this.load();
    this.persist({
      ...save,
      musicVolume: clampVolume(settings.musicVolume),
      sfxVolume: clampVolume(settings.sfxVolume),
      muted: settings.muted,
    });
  }

  public saveHighScore(score: number): void {
    if (!Number.isFinite(score) || !Number.isInteger(score) || score < 0) {
      return;
    }

    const save = this.load();
    this.persist({ ...save, highScore: Math.max(save.highScore, score) });
  }

  public clear(): void {
    this.storage.removeItem(SAVE_KEY);
  }

  private persist(data: SaveData): void {
    this.storage.setItem(SAVE_KEY, JSON.stringify(data));
  }
}
