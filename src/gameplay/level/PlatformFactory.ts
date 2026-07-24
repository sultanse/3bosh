import { Color3 } from "@babylonjs/core/Maths/math.color";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { PhysicsShapeType } from "@babylonjs/core/Physics/v2/IPhysicsEnginePlugin";
import { PhysicsAggregate } from "@babylonjs/core/Physics/v2/physicsAggregate";
import type { Scene } from "@babylonjs/core/scene";
import { CollisionLayer, CollisionMask } from "../../physics/CollisionLayers";
import type { PlatformDefinition } from "./LevelDefinition";

export interface BuiltPlatform {
  readonly root: ReturnType<typeof MeshBuilder.CreateBox>;
  readonly visual: ReturnType<typeof MeshBuilder.CreateBox>;
  readonly collider: PhysicsAggregate;
  dispose(): void;
}

const paletteColor: Readonly<Record<PlatformDefinition["palette"], Color3>> = {
  grass: new Color3(0.27, 0.56, 0.29),
  stone: new Color3(0.38, 0.39, 0.48),
  wood: new Color3(0.56, 0.31, 0.16),
};

export class PlatformFactory {
  public static create(scene: Scene, definition: PlatformDefinition): BuiltPlatform {
    const { position, size } = definition;
    // The invisible root/collider has no visual material; decoration is a child,
    // keeping render changes isolated from collision dimensions.
    const root = MeshBuilder.CreateBox(`${definition.id}-collider`, size, scene);
    root.position.set(position.x, position.y, position.z);
    root.isVisible = false;
    const collider = new PhysicsAggregate(root, PhysicsShapeType.BOX, { mass: 0 }, scene);
    collider.shape.filterMembershipMask = CollisionLayer.world;
    collider.shape.filterCollideMask = CollisionMask.world;

    const visual = MeshBuilder.CreateBox(`${definition.id}-visual`, size, scene);
    visual.parent = root;
    const material = new StandardMaterial(`${definition.id}-material`, scene);
    material.diffuseColor = paletteColor[definition.palette];
    material.specularColor = Color3.Black();
    visual.material = material;

    return {
      root,
      visual,
      collider,
      dispose: () => {
        collider.dispose();
        root.dispose(false, true);
      },
    };
  }
}
