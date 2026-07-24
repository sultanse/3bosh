import { Color3 } from "@babylonjs/core/Maths/math.color";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import type { Scene } from "@babylonjs/core/scene";

import { BaseCollectible, type CollectionContext, type ItemPlacement } from "./Collectible";

export interface ShieldPlacement extends ItemPlacement {
  readonly durationSeconds: number;
}

export class ShieldPowerUp extends BaseCollectible {
  public constructor(scene: Scene, private readonly placement: ShieldPlacement) {
    const mesh = MeshBuilder.CreatePolyhedron(`shield-${placement.id}`, { type: 1, size: 0.48 }, scene);
    mesh.position.copyFromFloats(placement.position.x, placement.position.y, placement.position.z);
    const material = new StandardMaterial(`shield-material-${placement.id}`, scene);
    material.diffuseColor = new Color3(0.15, 0.7, 0.95);
    material.emissiveColor = new Color3(0.02, 0.15, 0.28);
    mesh.material = material;
    super(placement.id, mesh, material);
  }

  protected collect(context: CollectionContext): boolean {
    return context.level.collect(this.id, { kind: "shield", durationSeconds: this.placement.durationSeconds }).collected;
  }
}
