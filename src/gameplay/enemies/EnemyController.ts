import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import type { DisposableLike } from "../../core/DisposableBag";

export type EnemyKind = "patrol" | "shooter";
export type EnemyDamageSource = "stomp";

export interface EnemyDamageResult {
  readonly defeated: boolean;
  readonly ignored: boolean;
}

export interface EnemyWorldQueries {
  readonly isBlockedAhead: (enemy: EnemyController) => boolean;
  readonly hasGroundAhead: (enemy: EnemyController) => boolean;
}

export interface EnemyUpdateContext {
  readonly stepSeconds: number;
  readonly playerPosition: Readonly<Vector3>;
  readonly worldQueries: EnemyWorldQueries;
  readonly gameplayActive?: boolean;
}

export interface EnemyDefeatedEvent {
  readonly enemyId: string;
  readonly score: number;
}

export abstract class EnemyController implements DisposableLike {
  private readonly defeatedListeners = new Set<(event: EnemyDefeatedEvent) => void>();
  private defeatedState = false;

  protected constructor(
    public readonly id: string,
    public readonly kind: EnemyKind,
    initialPosition: Readonly<Vector3>,
    public readonly score: number,
  ) {
    this.position = initialPosition.clone();
  }

  public readonly position: Vector3;
  public readonly velocity = Vector3.Zero();

  public get defeated(): boolean {
    return this.defeatedState;
  }

  public onDefeated(listener: (event: EnemyDefeatedEvent) => void): DisposableLike {
    this.defeatedListeners.add(listener);
    return { dispose: () => this.defeatedListeners.delete(listener) };
  }

  public takeDamage(amount: number, source: EnemyDamageSource): EnemyDamageResult {
    if (amount <= 0 || source !== "stomp" || this.defeatedState) {
      return { defeated: false, ignored: true };
    }
    this.defeatedState = true;
    this.onDefeatedState();
    const event = { enemyId: this.id, score: this.score };
    for (const listener of [...this.defeatedListeners]) listener(event);
    return { defeated: true, ignored: false };
  }

  public abstract update(context: EnemyUpdateContext): void;

  public dispose(): void {
    this.defeatedListeners.clear();
  }

  protected onDefeatedState(): void {}
}
