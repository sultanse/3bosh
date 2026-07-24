import { Color3 } from "@babylonjs/core/Maths/math.color";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import type { Scene } from "@babylonjs/core/scene";
import type { ParallaxLayerDefinition } from "./LevelDefinition";

interface LayerMesh {
  readonly mesh: ReturnType<typeof MeshBuilder.CreatePlane>;
  readonly factor: number;
}

export class ParallaxBackground {
  private readonly layers: readonly LayerMesh[];

  public constructor(scene: Scene, definitions: readonly ParallaxLayerDefinition[]) {
    this.layers = definitions.map((definition, index) => {
      const mesh = MeshBuilder.CreatePlane(definition.id, { width: 180, height: 14 }, scene);
      mesh.position.set(0, definition.y, 2 + index);
      const material = new StandardMaterial(`${definition.id}-material`, scene);
      material.diffuseColor = Color3.FromHexString(definition.color);
      material.emissiveColor = material.diffuseColor.scale(0.35);
      material.disableLighting = true;
      mesh.material = material;
      return { mesh, factor: definition.factor };
    });
  }

  public update(cameraX: number): void {
    for (const layer of this.layers) {
      layer.mesh.position.x = cameraX * layer.factor;
    }
  }

  public dispose(): void {
    for (const layer of this.layers) layer.mesh.dispose(false, true);
  }
}
