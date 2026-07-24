import type { BoundingInfo } from "@babylonjs/core/Culling/boundingInfo";
import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import type { Vector3 } from "@babylonjs/core/Maths/math.vector";

import type { LevelSession } from "../../app/LevelSession";
import type { PlayerHealth } from "../player/PlayerHealth";

export interface ItemPlacement {
  readonly id: string;
  readonly position: Readonly<Vector3> | Readonly<{ x: number; y: number; z: number }>;
}

export interface CollectionContext {
  readonly level: LevelSession;
  readonly health: PlayerHealth;
  readonly nowSeconds: number;
}

export interface CollectibleItem {
  readonly id: string;
  tryCollect(playerBounds: BoundingInfo, context: CollectionContext): boolean;
  update(stepSeconds: number): void;
  dispose(): void;
}

export const boundsOverlap = (first: BoundingInfo, second: BoundingInfo): boolean => {
  const a = first.boundingBox;
  const b = second.boundingBox;
  return a.minimumWorld.x <= b.maximumWorld.x && a.maximumWorld.x >= b.minimumWorld.x &&
    a.minimumWorld.y <= b.maximumWorld.y && a.maximumWorld.y >= b.minimumWorld.y &&
    a.minimumWorld.z <= b.maximumWorld.z && a.maximumWorld.z >= b.minimumWorld.z;
};

/** Shared visual/trigger lifecycle for manually-polled item overlaps. */
export abstract class BaseCollectible implements CollectibleItem {
  private elapsedSeconds = 0;
  private isAvailable = true;

  protected constructor(public readonly id: string, protected readonly mesh: AbstractMesh) {}

  public get bounds(): BoundingInfo { return this.mesh.getBoundingInfo(); }
  public get available(): boolean { return this.isAvailable; }

  public tryCollect(playerBounds: BoundingInfo, context: CollectionContext): boolean {
    if (!this.isAvailable || !boundsOverlap(playerBounds, this.bounds)) return false;
    if (!this.collect(context)) return false;
    this.isAvailable = false;
    this.mesh.isVisible = false;
    this.mesh.setEnabled(false);
    return true;
  }

  public update(stepSeconds: number): void {
    if (!this.isAvailable || stepSeconds <= 0) return;
    this.elapsedSeconds += stepSeconds;
    this.mesh.rotation.y = this.elapsedSeconds * 2.4;
    this.mesh.position.y += Math.sin(this.elapsedSeconds * 3.2) * 0.002;
  }

  public dispose(): void { this.mesh.dispose(false, false); }

  protected abstract collect(context: CollectionContext): boolean;
}

export interface CrystalPlacement extends ItemPlacement {
  readonly score: number;
}

export class CrystalCollectible extends BaseCollectible {
  public constructor(mesh: AbstractMesh, private readonly placement: CrystalPlacement) {
    super(placement.id, mesh);
  }

  protected collect(context: CollectionContext): boolean {
    return context.level.collect(this.id, { kind: "crystal", score: this.placement.score }).collected;
  }
}
