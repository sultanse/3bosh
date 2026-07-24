import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { EnemyController, type EnemyUpdateContext } from "./EnemyController";

export interface PatrolEnemyOptions {
  readonly id: string;
  readonly position: Readonly<Vector3>;
  readonly patrolMinX: number;
  readonly patrolMaxX: number;
  readonly speed: number;
  readonly score: number;
}

export class PatrolEnemy extends EnemyController {
  private directionValue: -1 | 1 = 1;

  public constructor(private readonly options: PatrolEnemyOptions) {
    super(options.id, "patrol", options.position, options.score);
  }

  public get direction(): -1 | 1 {
    return this.directionValue;
  }

  public update(context: EnemyUpdateContext): void {
    if (this.defeated) {
      this.velocity.setAll(0);
      return;
    }
    const nextX = this.position.x + this.directionValue * this.options.speed * context.stepSeconds;
    const reachesBound = nextX <= this.options.patrolMinX || nextX >= this.options.patrolMaxX;
    if (reachesBound || context.worldQueries.isBlockedAhead(this) || !context.worldQueries.hasGroundAhead(this)) {
      if (reachesBound) {
        this.position.x = Math.min(this.options.patrolMaxX, Math.max(this.options.patrolMinX, nextX));
      }
      this.directionValue = this.directionValue === 1 ? -1 : 1;
      this.velocity.setAll(0);
      return;
    }
    this.position.x = nextX;
    this.velocity.set(this.directionValue * this.options.speed, 0, 0);
  }
}
