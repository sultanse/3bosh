import { describe, expect, it } from "vitest";

import { DEFAULT_SAVE_DATA, SaveService } from "../../src/services/SaveService";

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();

  public get length(): number {
    return this.values.size;
  }

  public clear(): void {
    this.values.clear();
  }

  public getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  public key(index: number): string | null {
    return [...this.values.keys()][index] ?? null;
  }

  public removeItem(key: string): void {
    this.values.delete(key);
  }

  public setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

class ThrowingStorage implements Storage {
  public get length(): number { return 0; }
  public clear(): void {}
  public getItem(_key: string): string | null { throw new Error("SecurityError"); }
  public key(_index: number): string | null { return null; }
  public removeItem(_key: string): void { throw new Error("SecurityError"); }
  public setItem(_key: string, _value: string): void { throw new Error("SecurityError"); }
}

describe("SaveService", () => {
  it("falls back to defaults for malformed saved JSON", () => {
    const storage = new MemoryStorage();
    const service = new SaveService(storage);
    storage.setItem("3bosh.save", "{broken");

    expect(service.load()).toEqual(DEFAULT_SAVE_DATA);
  });

  it("persists audio settings and a high score", () => {
    const storage = new MemoryStorage();
    const service = new SaveService(storage);

    service.saveAudio({ musicVolume: 0.4, sfxVolume: 0.8, muted: true });
    service.saveHighScore(250);

    expect(service.load()).toMatchObject({ highScore: 250, muted: true });
  });

  it("keeps the best high score", () => {
    const service = new SaveService(new MemoryStorage());

    service.saveHighScore(250);
    service.saveHighScore(100);

    expect(service.load().highScore).toBe(250);
  });

  it("removes the saved data when cleared", () => {
    const storage = new MemoryStorage();
    const service = new SaveService(storage);
    service.saveHighScore(250);

    service.clear();

    expect(storage.getItem("3bosh.save")).toBeNull();
  });

  it("clamps finite audio volumes and discards invalid persisted data", () => {
    const storage = new MemoryStorage();
    const service = new SaveService(storage);

    service.saveAudio({ musicVolume: -0.5, sfxVolume: 4, muted: false });
    expect(service.load()).toMatchObject({ musicVolume: 0, sfxVolume: 1 });

    storage.setItem(
      "3bosh.save",
      JSON.stringify({ ...DEFAULT_SAVE_DATA, highScore: 1.5 }),
    );
    expect(service.load()).toEqual(DEFAULT_SAVE_DATA);
  });

  it("normalizes non-finite audio volumes before persisting them", () => {
    const service = new SaveService(new MemoryStorage());

    service.saveAudio({ musicVolume: Number.NaN, sfxVolume: Number.POSITIVE_INFINITY, muted: true });

    expect(service.load()).toMatchObject({ musicVolume: 0, sfxVolume: 0, muted: true });
  });

  it("returns safe defaults and does not throw when browser storage is unavailable", () => {
    const service = new SaveService(new ThrowingStorage());

    expect(service.load()).toEqual(DEFAULT_SAVE_DATA);
    expect(() => {
      service.saveAudio({ musicVolume: 0.4, sfxVolume: 0.8, muted: true });
      service.saveHighScore(250);
      service.clear();
    }).not.toThrow();
  });
});
