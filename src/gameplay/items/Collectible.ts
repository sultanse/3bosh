import type { BoundingInfo } from "@babylonjs/core/Culling/boundingInfo";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import type { Material } from "@babylonjs/core/Materials/material";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
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

/** A short-lived world-space pulse with explicit mesh and material ownership. */
class CollectionPulse {
  private elapsedSeconds = 0;

  private constructor(
    private readonly mesh: ReturnType<typeof MeshBuilder.CreateTorus>,
    private readonly material: StandardMaterial,
    private readonly lifetimeSeconds: number,
  ) {}

  public static create(source: AbstractMesh): CollectionPulse {
    const scene = source.getScene();
    const mesh = MeshBuilder.CreateTorus(`collection-pulse-${source.name}`, {
      diameter: 0.9,
      thickness: 0.06,
      tessellation: 16,
    }, scene);
    mesh.position.copyFrom(source.getAbsolutePosition());
    mesh.rotation.x = Math.PI / 2;
    const material = new StandardMaterial(`collection-pulse-material-${source.name}`, scene);
    material.emissiveColor = new Color3(0.95, 0.82, 0.28);
    material.alpha = 0.85;
    mesh.material = material;
    return new CollectionPulse(mesh, material, 0.35);
  }

  /** Returns true when the bounded effect has released all of its resources. */
  public update(stepSeconds: number): boolean {
    this.elapsedSeconds += Math.max(0, stepSeconds);
    const progress = Math.min(1, this.elapsedSeconds / this.lifetimeSeconds);
    this.mesh.scaling.setAll(1 + progress * 1.5);
    this.material.alpha = (1 - progress) * 0.85;
    if (progress < 1) return false;
    this.dispose();
    return true;
  }

  public dispose(): void {
    this.mesh.dispose(false, false);
    this.material.dispose();
  }
}

/** Shared visual/trigger lifecycle for manually-polled item overlaps. */
export abstract class BaseCollectible implements CollectibleItem {
  private elapsedSeconds = 0;
  private isAvailable = true;
  private feedback: CollectionPulse | undefined;

  protected constructor(
    public readonly id: string,
    protected readonly mesh: AbstractMesh,
    private readonly ownedMaterial?: Material,
  ) {}

  public get bounds(): BoundingInfo { return this.mesh.getBoundingInfo(); }
  public get available(): boolean { return this.isAvailable; }

  public tryCollect(playerBounds: BoundingInfo, context: CollectionContext): boolean {
    if (!this.isAvailable || !boundsOverlap(playerBounds, this.bounds)) return false;
    if (!this.collect(context)) return false;
    this.feedback = CollectionPulse.create(this.mesh);
    this.isAvailable = false;
    this.mesh.isVisible = false;
    this.mesh.setEnabled(false);
    return true;
  }

  public update(stepSeconds: number): void {
    if (this.feedback?.update(stepSeconds) === true) this.feedback = undefined;
    if (!this.isAvailable || stepSeconds <= 0) return;
    this.elapsedSeconds += stepSeconds;
    this.mesh.rotation.y = this.elapsedSeconds * 2.4;
    this.mesh.position.y += Math.sin(this.elapsedSeconds * 3.2) * 0.002;
  }

  public dispose(): void {
    this.feedback?.dispose();
    this.feedback = undefined;
    this.mesh.dispose(false, false);
    this.ownedMaterial?.dispose();
  }

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
