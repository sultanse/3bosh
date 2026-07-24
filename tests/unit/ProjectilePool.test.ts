import { describe, expect, it } from "vitest";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { ProjectilePool, type ProjectileFactory } from "../../src/gameplay/projectiles/ProjectilePool";

describe("ProjectilePool", () => {
  it("has fixed capacity, reuses inactive projectiles, and never allocates after warmup", () => {
    let allocations = 0;
    const factory: ProjectileFactory = () => ({
      setActive: () => undefined,
      setPosition: () => undefined,
      setVelocity: () => undefined,
      setCollisionEnabled: () => undefined,
      dispose: () => undefined,
      get position() { return Vector3.Zero(); },
    });
    const pool = new ProjectilePool(2, () => {
      allocations += 1;
      return factory();
    });

    const first = pool.acquire();
    const second = pool.acquire();
    expect(first).toBeDefined();
    expect(second).toBeDefined();
    expect(pool.acquire()).toBeUndefined();
    pool.release(first!);
    expect(pool.acquire()).toBe(first);
    expect(allocations).toBe(2);
  });

  it("makes release idempotent and returns an expired projectile after the invisible grace period", () => {
    const pool = new ProjectilePool(1, () => ({
      setActive: () => undefined,
      setPosition: () => undefined,
      setVelocity: () => undefined,
      setCollisionEnabled: () => undefined,
      dispose: () => undefined,
      get position() { return Vector3.Zero(); },
    }));
    const projectile = pool.acquire();
    expect(projectile).toBeDefined();
    projectile!.launch(new Vector3(0, 0, 0), new Vector3(2, 0, 0), 0.1);

    pool.update(0.1, () => false);
    expect(projectile!.active).toBe(false);
    expect(pool.activeCount).toBe(1);
    pool.update(0.19, () => false);
    expect(pool.activeCount).toBe(1);
    pool.update(0.01, () => false);
    expect(pool.activeCount).toBe(0);
    pool.release(projectile!);
    expect(pool.activeCount).toBe(0);
  });
});
