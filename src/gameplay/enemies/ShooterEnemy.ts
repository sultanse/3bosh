import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { EnemyController, type EnemyUpdateContext } from "./EnemyController";

export interface ShooterEnemyOptions {
  readonly id: string;
  readonly position: Readonly<Vector3>;
  readonly activationDistanceX: number;
  readonly fireIntervalSeconds: number;
  readonly projectileSpeed: number;
  readonly score: number;
  readonly fire: (position: Readonly<Vector3>, velocity: Readonly<Vector3>) => void;
}

export class ShooterEnemy extends EnemyController {
  private cooldownSeconds = 0;

  public constructor(private readonly options: ShooterEnemyOptions) {
    super(options.id, "shooter", options.position, options.score);
  }

  public update(context: EnemyUpdateContext): void {
    this.velocity.setAll(0);
    if (this.defeated || context.gameplayActive === false) return;
    if (Math.abs(context.playerPosition.x - this.position.x) > this.options.activationDistanceX) return;
    this.cooldownSeconds -= context.stepSeconds;
    if (this.cooldownSeconds > 0) return;
    const direction = context.playerPosition.x >= this.position.x ? 1 : -1;
    this.options.fire(this.position, new Vector3(direction * this.options.projectileSpeed, 0, 0));
    this.cooldownSeconds += this.options.fireIntervalSeconds;
  }
}
