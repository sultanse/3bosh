import { describe, expect, it, vi } from "vitest";

import { SceneRouter, type ManagedScene, type SceneFactory } from "../../src/app/SceneRouter";

const managed = (name: string): ManagedScene => ({
  name,
  dispose: vi.fn(),
});

const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
};

describe("SceneRouter", () => {
  it("only activates the latest overlapping navigation and aborts the previous factory", async () => {
    const menu = managed("menu");
    const level = managed("level");
    const levelCreation = deferred<ManagedScene>();
    let levelSignal: AbortSignal | undefined;
    const router = new SceneRouter({
      menu: { create: vi.fn(async () => menu) },
      loading: { create: vi.fn(async () => managed("loading")) },
      level: {
        create: vi.fn((signal) => {
          levelSignal = signal;
          return levelCreation.promise;
        }),
      },
    });

    const first = router.goTo("level");
    const second = router.goTo("menu");
    levelCreation.resolve(level);
    await Promise.all([first, second]);

    expect(levelSignal?.aborted).toBe(true);
    expect(router.current?.name).toBe("menu");
    expect(level.dispose).toHaveBeenCalledOnce();
    expect(menu.dispose).not.toHaveBeenCalled();
  });

  it("disposes the previous scene exactly once after its replacement is ready", async () => {
    const first = managed("first");
    const second = managed("second");
    const factories: Readonly<Record<"menu" | "loading" | "level", SceneFactory>> = {
      menu: { create: vi.fn(async () => first) },
      loading: { create: vi.fn(async () => managed("loading")) },
      level: { create: vi.fn(async () => second) },
    };
    const router = new SceneRouter(factories);

    await router.goTo("menu");
    await router.goTo("level");
    router.dispose();

    expect(first.dispose).toHaveBeenCalledOnce();
    expect(second.dispose).toHaveBeenCalledOnce();
  });

  it("keeps the existing scene and exposes a recoverable error when a destination fails", async () => {
    const menu = managed("menu");
    const router = new SceneRouter({
      menu: { create: vi.fn(async () => menu) },
      loading: { create: vi.fn(async () => managed("loading")) },
      level: { create: vi.fn(async () => { throw new Error("Havok unavailable"); }) },
    });
    await router.goTo("menu");

    await expect(router.goTo("level")).rejects.toThrow("Havok unavailable");

    expect(router.current).toBe(menu);
    expect(router.error?.message).toBe("Havok unavailable");
    expect(menu.dispose).not.toHaveBeenCalled();
  });
});
