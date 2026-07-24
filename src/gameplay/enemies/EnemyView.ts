import { Color3 } from "@babylonjs/core/Maths/math.color";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import {
  PhysicsMotionType,
  PhysicsPrestepType,
  PhysicsShapeType,
} from "@babylonjs/core/Physics/v2/IPhysicsEnginePlugin";
import { PhysicsAggregate } from "@babylonjs/core/Physics/v2/physicsAggregate";
import type { PhysicsBody } from "@babylonjs/core/Physics/v2/physicsBody";
import type { Scene } from "@babylonjs/core/scene";
import { CollisionLayer, CollisionMask } from "../../physics/CollisionLayers";
import type { BoundsSnapshot } from "../interactions/InteractionSystem";
import type { EnemyKind } from "./EnemyController";

export interface EnemyViewOptions {
  readonly id: string;
  readonly kind: EnemyKind;
  readonly position: Readonly<Vector3>;
  readonly width: number;
  readonly height: number;
  readonly depth: number;
}

const colorFor = (kind: EnemyKind): Color3 =>
  kind === "patrol" ? new Color3(0.78, 0.26, 0.25) : new Color3(0.53, 0.25, 0.78);

export class EnemyView {
  private readonly root: ReturnType<typeof MeshBuilder.CreateBox>;
  private readonly aggregate: PhysicsAggregate;

  public constructor(scene: Scene, private readonly options: EnemyViewOptions) {
    this.root = MeshBuilder.CreateBox(
      `${options.id}-enemy`,
      { width: options.width, height: options.height, depth: options.depth },
      scene,
    );
    this.root.position.copyFrom(options.position);
    this.aggregate = new PhysicsAggregate(
      this.root,
      PhysicsShapeType.BOX,
      { mass: 0, isTriggerShape: true },
      scene,
    );
    this.aggregate.body.setMotionType(PhysicsMotionType.ANIMATED);
    this.aggregate.body.setPrestepType(PhysicsPrestepType.TELEPORT);
    this.aggregate.body.setTargetTransform(options.position, Quaternion.Identity());
    const material = new StandardMaterial(`${options.id}-enemy-material`, scene);
    material.diffuseColor = colorFor(options.kind);
    material.specularColor = Color3.Black();
    this.root.material = material;
    this.aggregate.shape.filterMembershipMask = CollisionLayer.trigger;
    this.aggregate.shape.filterCollideMask = CollisionMask.trigger;
  }

  public get triggerBody(): PhysicsBody {
    return this.aggregate.body;
  }

  public setPosition(position: Readonly<Vector3>): void {
    this.root.position.copyFrom(position);
    this.aggregate.body.setTargetTransform(this.root.position, Quaternion.Identity());
  }

  public setFacing(direction: -1 | 1): void {
    this.root.scaling.x = direction;
  }

  public setDefeated(): void {
    this.root.isVisible = false;
    this.aggregate.shape.filterCollideMask = 0;
  }

  public bounds(): BoundsSnapshot {
    const x = this.root.position.x;
    const halfWidth = this.options.width / 2;
    const halfHeight = this.options.height / 2;
    return {
      minX: x - halfWidth,
      maxX: x + halfWidth,
      feetY: this.root.position.y - halfHeight,
      topY: this.root.position.y + halfHeight,
    };
  }

  public get physicsPositionX(): number {
    return this.aggregate.body.getBoundingBox().centerWorld.x;
  }

  public dispose(): void {
    this.aggregate.dispose();
    this.root.dispose(false, true);
  }
}
