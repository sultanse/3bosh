import type { BoundingInfo } from "@babylonjs/core/Culling/boundingInfo";
import type { GoalDefinition } from "./LevelDefinition";
import type { LevelTrigger } from "./Hazard";

export class Goal implements LevelTrigger {
  private completed = false;
  public constructor(private readonly definition: GoalDefinition) {}
  public get id(): string { return this.definition.id; }
  public update(playerBounds: BoundingInfo): boolean {
    const center = playerBounds.boundingBox.centerWorld;
    const extent = playerBounds.boundingBox.extendSizeWorld;
    const { position, size } = this.definition;
    const inside = Math.abs(center.x - position.x) <= extent.x + size.width / 2
      && Math.abs(center.y - position.y) <= extent.y + size.height / 2
      && Math.abs(center.z - position.z) <= extent.z + size.depth / 2;
    if (!inside || this.completed) return false;
    this.completed = true;
    return true;
  }
  public reset(): void {}
  public dispose(): void {}
}
