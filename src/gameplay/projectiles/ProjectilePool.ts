import type { ProjectileVisual } from "./Projectile";
import { Projectile } from "./Projectile";

export type ProjectileFactory = () => ProjectileVisual;

export class ProjectilePool {
  private readonly projectiles: Projectile[];

  public constructor(capacity: number, factory: ProjectileFactory) {
    if (!Number.isInteger(capacity) || capacity <= 0) throw new Error("Projectile pool capacity must be positive.");
    this.projectiles = Array.from({ length: capacity }, () => new Projectile(factory()));
  }

  public acquire(): Projectile | undefined {
    const projectile = this.projectiles.find((entry) => !entry.reserved);
    if (!projectile) return undefined;
    projectile.reserve();
    return projectile;
  }

  public release(projectile: Projectile): void {
    if (!this.projectiles.includes(projectile)) return;
    projectile.release();
  }

  public update(stepSeconds: number, isWithinBounds: (position: Readonly<import("@babylonjs/core/Maths/math.vector").Vector3>) => boolean): void {
    for (const projectile of this.projectiles) {
      projectile.update(stepSeconds, isWithinBounds);
      if (projectile.readyForRelease()) projectile.release();
    }
  }

  public get activeCount(): number {
    return this.projectiles.filter((entry) => entry.reserved).length;
  }

  public get activeProjectiles(): readonly Projectile[] {
    return this.projectiles.filter((entry) => entry.active);
  }

  public dispose(): void {
    for (const projectile of this.projectiles) projectile.dispose();
  }
}
