import { Color3 } from "@babylonjs/core/Maths/math.color";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import type { Scene } from "@babylonjs/core/scene";

import { BaseCollectible, type CollectionContext, type ItemPlacement } from "./Collectible";

export class HealthPickup extends BaseCollectible {
  public constructor(scene: Scene, placement: ItemPlacement) {
    const mesh = MeshBuilder.CreateSphere(`health-${placement.id}`, { diameter: 0.62 }, scene);
    mesh.position.copyFromFloats(placement.position.x, placement.position.y, placement.position.z);
    const material = new StandardMaterial(`health-material-${placement.id}`, scene);
    material.diffuseColor = new Color3(0.95, 0.2, 0.32);
    material.emissiveColor = new Color3(0.28, 0.025, 0.04);
    mesh.material = material;
    super(placement.id, mesh, material);
  }

  protected collect(context: CollectionContext): boolean {
    return context.level.collect(this.id, { kind: "health", healAmount: 1 }).collected;
  }
}
