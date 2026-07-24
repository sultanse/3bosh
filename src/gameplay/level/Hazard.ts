import type { BoundingInfo } from "@babylonjs/core/Culling/boundingInfo";
import type { HazardDefinition } from "./LevelDefinition";

export interface LevelTrigger {
  readonly id: string;
  update(playerBounds: BoundingInfo): boolean;
  reset(): void;
  dispose(): void;
}

const overlaps = (definition: HazardDefinition, playerBounds: BoundingInfo): boolean => {
  const center = playerBounds.boundingBox.centerWorld;
  const extents = playerBounds.boundingBox.extendSizeWorld;
  const half = definition.size;
  return Math.abs(center.x - definition.position.x) <= extents.x + half.width / 2
    && Math.abs(center.y - definition.position.y) <= extents.y + half.height / 2
    && Math.abs(center.z - definition.position.z) <= extents.z + half.depth / 2;
};

/** A bounded-overlap trigger; it avoids exposing physics trigger event details to scenes. */
export class Hazard implements LevelTrigger {
  private occupied = false;

  public constructor(private readonly definition: HazardDefinition) {}

  public get id(): string {
    return this.definition.id;
  }

  public update(playerBounds: BoundingInfo): boolean {
    const entered = overlaps(this.definition, playerBounds) && !this.occupied;
    this.occupied = overlaps(this.definition, playerBounds);
    return entered;
  }

  public reset(): void {
    this.occupied = false;
  }

  public dispose(): void {}
}
