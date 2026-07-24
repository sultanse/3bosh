import { Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector";
import { PhysicsMotionType, PhysicsPrestepType } from "@babylonjs/core/Physics/v2/IPhysicsEnginePlugin";
import type { Scene } from "@babylonjs/core/scene";
import { PlatformFactory, type BuiltPlatform } from "./PlatformFactory";
import type { MovingPlatformDefinition } from "./LevelDefinition";

export interface PlatformMotion {
  readonly position: Readonly<Vector3>;
  readonly deltaX: number;
}

export class MovingPlatform {
  private elapsedSeconds = 0;
  private readonly platform: BuiltPlatform;
  private previousPosition: Vector3;

  public constructor(
    scene: Scene,
    private readonly definition: MovingPlatformDefinition,
  ) {
    this.platform = PlatformFactory.create(scene, definition);
    this.platform.collider.body.setMotionType(PhysicsMotionType.ANIMATED);
    this.platform.collider.body.setPrestepType(PhysicsPrestepType.TELEPORT);
    this.previousPosition = this.platform.root.position.clone();
  }

  public update(elapsedSeconds: number): PlatformMotion {
    this.elapsedSeconds += Math.max(0, elapsedSeconds);
    const travel = this.definition.travelSeconds;
    const pause = this.definition.pauseSeconds;
    const cycle = travel * 2 + pause * 2;
    const phase = this.elapsedSeconds % cycle;
    const t = phase < travel
      ? phase / travel
      : phase < travel + pause
        ? 1
        : phase < travel * 2 + pause
          ? 1 - (phase - travel - pause) / travel
          : 0;
    const start = this.definition.position;
    const end = this.definition.endPosition;
    const next = new Vector3(
      start.x + (end.x - start.x) * t,
      start.y + (end.y - start.y) * t,
      start.z + (end.z - start.z) * t,
    );
    const deltaX = next.x - this.previousPosition.x;
    this.platform.root.position.copyFrom(next);
    this.platform.collider.body.setTargetTransform(next, Quaternion.Identity());
    this.previousPosition = next;
    return { position: next, deltaX };
  }

  public get root(): BuiltPlatform["root"] {
    return this.platform.root;
  }

  public dispose(): void {
    this.platform.dispose();
  }
}
