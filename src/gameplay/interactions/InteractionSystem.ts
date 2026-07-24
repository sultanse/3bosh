import { Vector3 } from "@babylonjs/core/Maths/math.vector";

export interface BoundsSnapshot {
  readonly minX: number;
  readonly maxX: number;
  readonly feetY: number;
  readonly topY: number;
}

export interface PlayerEnemyContact {
  readonly enemyId: string;
  readonly previousPlayerBounds: BoundsSnapshot;
  readonly currentPlayerBounds: BoundsSnapshot;
  readonly enemyBounds: BoundsSnapshot;
  readonly relativeVelocity: Readonly<Vector3>;
  readonly enemyDefeated: boolean;
}

export type PlayerEnemyInteraction = "stomp" | "side" | "none";

export interface InteractionSystemOptions {
  readonly stompMinDownSpeed: number;
  readonly stompTolerance: number;
}

const horizontalOverlap = (left: BoundsSnapshot, right: BoundsSnapshot): boolean =>
  left.minX <= right.maxX && left.maxX >= right.minX;

const verticalOverlap = (left: BoundsSnapshot, right: BoundsSnapshot): boolean =>
  left.feetY <= right.topY && left.topY >= right.feetY;

export class InteractionSystem {
  public constructor(private readonly options: InteractionSystemOptions) {}

  public classify(contact: PlayerEnemyContact): PlayerEnemyInteraction {
    if (contact.enemyDefeated || !horizontalOverlap(contact.currentPlayerBounds, contact.enemyBounds)) {
      return "none";
    }
    const enemyTopY = contact.enemyBounds.topY;
    const stomping =
      contact.relativeVelocity.y < -this.options.stompMinDownSpeed &&
      contact.previousPlayerBounds.feetY >= enemyTopY - this.options.stompTolerance &&
      contact.currentPlayerBounds.feetY <= enemyTopY + this.options.stompTolerance;
    if (stomping) return "stomp";
    return verticalOverlap(contact.currentPlayerBounds, contact.enemyBounds) ? "side" : "none";
  }
}
