import { Vector3 } from "@babylonjs/core/Maths/math.vector";

export interface ProjectileVisual {
  readonly position: Readonly<Vector3>;
  setActive(active: boolean): void;
  setPosition(position: Readonly<Vector3>): void;
  setVelocity(velocity: Readonly<Vector3>): void;
  setCollisionEnabled(enabled: boolean): void;
  dispose(): void;
}

export class Projectile {
  private activeState = false;
  private heldForReuse = false;
  private remainingLifetimeSeconds = 0;
  private invisibleGraceSeconds = 0;
  private readonly velocityValue = Vector3.Zero();

  public constructor(private readonly visual: ProjectileVisual) {}

  public get active(): boolean {
    return this.activeState;
  }

  public get reserved(): boolean {
    return this.heldForReuse;
  }

  public get position(): Readonly<Vector3> {
    return this.visual.position;
  }

  public reserve(): void {
    this.heldForReuse = true;
    this.activeState = false;
    this.remainingLifetimeSeconds = 0;
    this.invisibleGraceSeconds = 0;
    this.visual.setCollisionEnabled(false);
    this.visual.setActive(false);
  }

  public launch(position: Readonly<Vector3>, velocity: Readonly<Vector3>, lifetimeSeconds: number): void {
    this.heldForReuse = true;
    this.activeState = true;
    this.remainingLifetimeSeconds = Math.max(0, lifetimeSeconds);
    this.invisibleGraceSeconds = 0;
    this.velocityValue.copyFrom(velocity);
    this.visual.setPosition(position);
    this.visual.setVelocity(velocity);
    this.visual.setCollisionEnabled(true);
    this.visual.setActive(true);
  }

  public update(stepSeconds: number, isWithinBounds: (position: Readonly<Vector3>) => boolean): void {
    if (this.activeState) {
      const next = this.position.add(this.velocityValue.scale(stepSeconds));
      this.visual.setPosition(next);
      this.remainingLifetimeSeconds -= stepSeconds;
      if (this.remainingLifetimeSeconds <= 0 || !isWithinBounds(next)) this.deactivateWithGrace();
      return;
    }
    if (this.heldForReuse) {
      this.invisibleGraceSeconds = Math.max(0, this.invisibleGraceSeconds - stepSeconds);
      if (this.invisibleGraceSeconds < Number.EPSILON) this.invisibleGraceSeconds = 0;
    }
  }

  public deactivateWithGrace(): void {
    if (!this.activeState) return;
    this.activeState = false;
    this.invisibleGraceSeconds = 0.2;
    this.visual.setCollisionEnabled(false);
    this.visual.setActive(false);
  }

  public readyForRelease(): boolean {
    return this.heldForReuse && !this.activeState && this.invisibleGraceSeconds <= 0;
  }

  public release(): boolean {
    if (!this.heldForReuse) return false;
    this.activeState = false;
    this.heldForReuse = false;
    this.remainingLifetimeSeconds = 0;
    this.invisibleGraceSeconds = 0;
    this.velocityValue.setAll(0);
    this.visual.setCollisionEnabled(false);
    this.visual.setActive(false);
    return true;
  }

  public dispose(): void {
    this.visual.dispose();
  }
}
