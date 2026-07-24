import type { PlayerController } from "./PlayerController";

export type DamageSource = "enemy" | "projectile" | "fall";

export interface DamageResult {
  readonly applied: boolean;
  readonly health: number;
  readonly died: boolean;
  readonly blockedByShield?: boolean;
}

export interface PlayerHealthEvents {
  readonly healthChanged: (health: number, maxHealth: number) => void;
  readonly shieldChanged: (active: boolean, expiresAtSeconds: number | null) => void;
  readonly damaged: (amount: number, source: DamageSource, health: number) => void;
  readonly died: () => void;
}

export interface PlayerHealthOptions {
  readonly controller?: Pick<PlayerController, "enterHurt" | "markDead" | "revive">;
  readonly events?: Partial<PlayerHealthEvents>;
}

const isContactDamage = (source: DamageSource): source is "enemy" | "projectile" =>
  source === "enemy" || source === "projectile";

export class PlayerHealth {
  private health: number;
  private contactInvulnerableUntil = Number.NEGATIVE_INFINITY;
  private shieldExpiresAt: number | null = null;

  public constructor(
    private readonly maxHealth: number,
    private readonly contactInvulnerabilitySeconds: number,
    private readonly options: PlayerHealthOptions = {},
  ) {
    if (maxHealth <= 0 || contactInvulnerabilitySeconds < 0) {
      throw new Error("Player health settings must be non-negative and have positive maximum health.");
    }
    this.health = maxHealth;
  }

  public damage(amount: number, source: DamageSource, nowSeconds: number): DamageResult {
    if (amount <= 0) {
      return { applied: false, health: this.health, died: this.health === 0 };
    }

    if (isContactDamage(source)) {
      if (this.isShieldActive(nowSeconds)) {
        this.shieldExpiresAt = null;
        this.options.events?.shieldChanged?.(false, null);
        return {
          applied: false,
          health: this.health,
          died: this.health === 0,
          blockedByShield: true,
        };
      }
      if (nowSeconds < this.contactInvulnerableUntil) {
        return { applied: false, health: this.health, died: this.health === 0 };
      }
      this.contactInvulnerableUntil = nowSeconds + this.contactInvulnerabilitySeconds;
    }

    this.health = Math.max(0, this.health - amount);
    const died = this.health === 0;
    this.options.events?.damaged?.(amount, source, this.health);
    this.options.events?.healthChanged?.(this.health, this.maxHealth);
    if (died) {
      this.options.controller?.markDead();
      this.options.events?.died?.();
    } else if (isContactDamage(source)) {
      this.options.controller?.enterHurt(this.contactInvulnerableUntil);
    }
    return { applied: true, health: this.health, died };
  }

  public heal(amount: number): number {
    if (amount <= 0) {
      return this.health;
    }
    const previous = this.health;
    this.health = Math.min(this.maxHealth, this.health + amount);
    if (this.health !== previous) {
      this.options.events?.healthChanged?.(this.health, this.maxHealth);
    }
    return this.health;
  }

  public grantShield(durationSeconds: number, nowSeconds: number): void {
    if (durationSeconds <= 0) {
      this.shieldExpiresAt = null;
      this.options.events?.shieldChanged?.(false, null);
      return;
    }
    this.shieldExpiresAt = nowSeconds + durationSeconds;
    this.options.events?.shieldChanged?.(true, this.shieldExpiresAt);
  }

  public grantInvulnerability(durationSeconds: number, nowSeconds: number): void {
    this.contactInvulnerableUntil = Math.max(
      this.contactInvulnerableUntil,
      nowSeconds + Math.max(0, durationSeconds),
    );
  }

  public revive(): void {
    this.health = this.maxHealth;
    this.contactInvulnerableUntil = Number.NEGATIVE_INFINITY;
    this.options.controller?.revive();
    this.options.events?.healthChanged?.(this.health, this.maxHealth);
  }

  public get current(): number {
    return this.health;
  }

  public get maximum(): number {
    return this.maxHealth;
  }

  private isShieldActive(nowSeconds: number): boolean {
    if (this.shieldExpiresAt === null) {
      return false;
    }
    if (nowSeconds < this.shieldExpiresAt) {
      return true;
    }
    this.shieldExpiresAt = null;
    this.options.events?.shieldChanged?.(false, null);
    return false;
  }
}
