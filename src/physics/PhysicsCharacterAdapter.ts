import {
  CharacterSupportedState,
  type CharacterSurfaceInfo,
  PhysicsCharacterController,
} from "@babylonjs/core/Physics/v2/characterController";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import type { Scene } from "@babylonjs/core/scene";
import { GAME_CONFIG } from "../config/GameConfig";
import { CollisionLayer, CollisionMask } from "./CollisionLayers";

export type CharacterSupportState = "unsupported" | "sliding" | "supported";

export interface CharacterSupport {
  readonly state: CharacterSupportState;
  readonly isDynamic: boolean;
  readonly surfaceVelocity: Readonly<Vector3>;
}

export interface CharacterMotionSnapshot {
  readonly support: CharacterSupport;
  readonly position: Readonly<Vector3>;
  readonly velocity: Readonly<Vector3>;
}

export interface CharacterStepCommand {
  readonly stepSeconds: number;
  readonly velocityX: number;
  readonly overrideVelocityY: number | null;
}

export interface CharacterStepResult extends CharacterMotionSnapshot {}

const mapSupportState = (supportedState: CharacterSupportedState): CharacterSupportState => {
  switch (supportedState) {
    case CharacterSupportedState.SUPPORTED:
      return "supported";
    case CharacterSupportedState.SLIDING:
      return "sliding";
    case CharacterSupportedState.UNSUPPORTED:
      return "unsupported";
  }
};

const toCharacterSupport = (support: CharacterSurfaceInfo): CharacterSupport => ({
  state: mapSupportState(support.supportedState),
  isDynamic: support.isSurfaceDynamic,
  surfaceVelocity: support.averageSurfaceVelocity.clone(),
});

export class PhysicsCharacterAdapter {
  private lastSupport: CharacterSupport;

  public constructor(private readonly controller: PhysicsCharacterController) {
    this.lastSupport = {
      state: "unsupported",
      isDynamic: false,
      surfaceVelocity: Vector3.Zero(),
    };
  }

  public static create(scene: Scene, position: Vector3): PhysicsCharacterAdapter {
    const controller = new PhysicsCharacterController(
      position,
      {
        capsuleHeight: GAME_CONFIG.player.height,
        capsuleRadius: GAME_CONFIG.player.radius,
      },
      scene,
    );
    controller.shape.filterMembershipMask = CollisionLayer.player;
    controller.shape.filterCollideMask = CollisionMask.player;
    return new PhysicsCharacterAdapter(controller);
  }

  public readMotion(stepSeconds: number): CharacterMotionSnapshot {
    const support = this.controller.checkSupport(stepSeconds, Vector3.Down());
    this.lastSupport = toCharacterSupport(support);
    return {
      support: this.lastSupport,
      position: this.controller.getPosition().clone(),
      velocity: this.controller.getVelocity().clone(),
    };
  }

  public step(command: CharacterStepCommand): CharacterStepResult {
    const support = this.controller.checkSupport(command.stepSeconds, Vector3.Down());
    this.lastSupport = toCharacterSupport(support);
    const currentVelocity = this.controller.getVelocity();
    const velocityY =
      command.overrideVelocityY === null
        ? currentVelocity.y
        : command.overrideVelocityY;
    this.controller.setVelocity(new Vector3(command.velocityX, velocityY, 0));
    this.controller.integrate(
      command.stepSeconds,
      support,
      new Vector3(0, GAME_CONFIG.gravity, 0),
    );

    const position = this.controller.getPosition();
    if (Math.abs(position.z - GAME_CONFIG.gameplayZ) > GAME_CONFIG.zLockEpsilon) {
      this.controller.setPosition(
        new Vector3(position.x, position.y, GAME_CONFIG.gameplayZ),
      );
    }

    return this.readMotion(command.stepSeconds);
  }

  public setPosition(position: Vector3): void {
    this.controller.setPosition(
      new Vector3(position.x, position.y, GAME_CONFIG.gameplayZ),
    );
  }

  public resetVelocity(): void {
    this.controller.setVelocity(Vector3.Zero());
  }

  /**
   * Carries a character on an animated platform only when Havok did not report
   * a dynamic support velocity. Keeping this guard here prevents callers from
   * adding a platform delta on top of Havok's own surface carry.
   */
  public applyPlatformFallbackDelta(deltaX: number): void {
    if (
      this.lastSupport.isDynamic ||
      Math.abs(this.lastSupport.surfaceVelocity.x) > Number.EPSILON
    ) {
      throw new Error(
        "Cannot apply a platform fallback while Havok surface velocity is active.",
      );
    }
    const position = this.controller.getPosition();
    this.setPosition(new Vector3(position.x + deltaX, position.y, position.z));
  }

  public dispose(): void {
    this.controller.dispose();
  }
}
