import { Color3 } from "@babylonjs/core/Maths/math.color";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import "@babylonjs/core/Meshes/instancedMesh";
import type { Scene } from "@babylonjs/core/scene";

import type { ItemDefinition } from "../level/LevelDefinition";
import { CrystalCollectible, type CollectibleItem } from "./Collectible";
import { HealthPickup } from "./HealthPickup";
import { ShieldPowerUp } from "./ShieldPowerUp";

/** Owns one crystal source mesh and lightweight mesh instances for repeated crystals. */
export class ItemFactory {
  private readonly crystalSource;

  public constructor(private readonly scene: Scene) {
    this.crystalSource = MeshBuilder.CreatePolyhedron("crystal-source", { type: 1, size: 0.42 }, scene);
    const material = new StandardMaterial("crystal-material", scene);
    material.diffuseColor = new Color3(0.3, 0.9, 1);
    material.emissiveColor = new Color3(0.03, 0.16, 0.22);
    this.crystalSource.material = material;
    this.crystalSource.isVisible = false;
  }

  public create(definition: ItemDefinition): CollectibleItem {
    if (definition.kind === "crystal") {
      const instance = this.crystalSource.createInstance(`crystal-${definition.id}`);
      instance.position.copyFromFloats(definition.position.x, definition.position.y, definition.position.z);
      return new CrystalCollectible(instance, definition);
    }
    if (definition.kind === "health") return new HealthPickup(this.scene, definition);
    return new ShieldPowerUp(this.scene, definition);
  }

  public dispose(): void { this.crystalSource.dispose(false, true); }
}
