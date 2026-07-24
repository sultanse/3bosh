import { GAME_CONFIG } from "../../config/GameConfig";
import type { DisposableLike } from "../../core/DisposableBag";
import type { InputSnapshot } from "../../input/InputAction";
import type { CharacterMotionSnapshot } from "../../physics/PhysicsCharacterAdapter";
import {
  PlayerStateMachine,
  type PlayerState,
  type PlayerStateListener,
} from "./PlayerStateMachine";

export interface PlayerControllerOptions {
  readonly doubleJumpEnabled?: boolean;
}

export interface PlayerMotorCommand {
  readonly velocityX: number;
  readonly overrideVelocityY: number | null;
  readonly state: PlayerState;
  readonly facing: -1 | 1;
  readonly acceptedJump: boolean;
}

const moveTowards = (current: number, target: number, maximumDelta: number): number => {
  if (Math.abs(target - current) <= maximumDelta) {
    return target;
  }
  return current + Math.sign(target - current) * maximumDelta;
};

export class PlayerController {
  public readonly stateMachine = new PlayerStateMachine();

  private readonly doubleJumpEnabled: boolean;
  private horizontalVelocity = 0;
  private lastSupportedAtSeconds = Number.NEGATIVE_INFINITY;
  private bufferedJumpAtSeconds: number | null = null;
  private usedAirJumps = 0;
  private queuedVerticalImpulse: number | null = null;
  private hurtUntilSeconds: number | null = null;
  private dead = false;
  private facingDirection: -1 | 1 = 1;

  public constructor(options: PlayerControllerOptions = {}) {
    this.doubleJumpEnabled = options.doubleJumpEnabled ?? GAME_CONFIG.player.doubleJumpEnabled;
  }

  public onStateChanged(listener: PlayerStateListener): DisposableLike {
    return this.stateMachine.onStateChanged(listener);
  }

  public update(
    stepSeconds: number,
    input: InputSnapshot,
    motion: CharacterMotionSnapshot,
    nowSeconds: number,
  ): PlayerMotorCommand {
    const grounded = motion.support.state === "supported";
    if (grounded) {
      this.lastSupportedAtSeconds = nowSeconds;
      this.usedAirJumps = 0;
    }
    if (input.jumpPressed) {
      this.bufferedJumpAtSeconds = nowSeconds;
    }

    this.updateHorizontalVelocity(stepSeconds, input.moveAxis, grounded);
    if (input.moveAxis !== 0) {
      this.facingDirection = input.moveAxis;
    }

    let acceptedJump = false;
    let overrideVelocityY = this.consumeQueuedVerticalImpulse();
    if (overrideVelocityY === null && !this.isConditionBlocking(nowSeconds) && this.hasBufferedJump(nowSeconds)) {
      const jumpKind = this.consumeJump(grounded, nowSeconds);
      if (jumpKind !== null) {
        acceptedJump = true;
        overrideVelocityY = GAME_CONFIG.player.jumpSpeed;
        // A jump launched from support must not make the following airborne
        // frame look like an unrelated coyote-time departure.
        this.lastSupportedAtSeconds = Number.NEGATIVE_INFINITY;
      }
    }

    const locomotion = acceptedJump
      ? "jumping"
      : this.stateMachine.selectLocomotion({
          grounded,
          moving: Math.abs(this.horizontalVelocity) > Number.EPSILON,
          velocityY: motion.velocity.y,
        });
    const state = this.resolveState(locomotion, nowSeconds);
    this.stateMachine.set(state);

    return {
      velocityX: this.horizontalVelocity,
      overrideVelocityY,
      state,
      facing: this.facingDirection,
      acceptedJump,
    };
  }

  public resetMotion(): void {
    this.horizontalVelocity = 0;
    this.lastSupportedAtSeconds = Number.NEGATIVE_INFINITY;
    this.bufferedJumpAtSeconds = null;
    this.usedAirJumps = 0;
    this.queuedVerticalImpulse = null;
  }

  public queueVerticalImpulse(value: number): void {
    this.queuedVerticalImpulse = value;
  }

  public enterHurt(untilSeconds: number): void {
    this.hurtUntilSeconds = untilSeconds;
    if (!this.dead) {
      this.stateMachine.set("hurt");
    }
  }

  public markDead(): void {
    this.dead = true;
    this.hurtUntilSeconds = null;
    this.stateMachine.set("dead");
  }

  public revive(): void {
    if (this.dead) {
      return;
    }
    this.dead = false;
    this.hurtUntilSeconds = null;
    this.resetMotion();
    this.stateMachine.set("idle");
  }

  private updateHorizontalVelocity(stepSeconds: number, moveAxis: -1 | 0 | 1, grounded: boolean): void {
    const targetVelocity = moveAxis * GAME_CONFIG.player.moveSpeed;
    const acceleration = moveAxis === 0
      ? GAME_CONFIG.player.groundDeceleration
      : grounded
        ? GAME_CONFIG.player.groundAcceleration
        : GAME_CONFIG.player.airAcceleration;
    this.horizontalVelocity = moveTowards(
      this.horizontalVelocity,
      targetVelocity,
      acceleration * stepSeconds,
    );
  }

  private hasBufferedJump(nowSeconds: number): boolean {
    return this.bufferedJumpAtSeconds !== null
      && nowSeconds - this.bufferedJumpAtSeconds <= GAME_CONFIG.player.jumpBufferSeconds;
  }

  private consumeJump(grounded: boolean, nowSeconds: number): "ground" | "coyote" | "double" | null {
    if (grounded) {
      this.bufferedJumpAtSeconds = null;
      return "ground";
    }
    if (nowSeconds - this.lastSupportedAtSeconds <= GAME_CONFIG.player.coyoteSeconds) {
      this.bufferedJumpAtSeconds = null;
      return "coyote";
    }
    if (this.doubleJumpEnabled && this.usedAirJumps === 0) {
      this.usedAirJumps += 1;
      this.bufferedJumpAtSeconds = null;
      return "double";
    }
    return null;
  }

  private consumeQueuedVerticalImpulse(): number | null {
    const impulse = this.queuedVerticalImpulse;
    this.queuedVerticalImpulse = null;
    return impulse;
  }

  private isConditionBlocking(nowSeconds: number): boolean {
    return this.dead || (this.hurtUntilSeconds !== null && nowSeconds < this.hurtUntilSeconds);
  }

  private resolveState(locomotion: PlayerState, nowSeconds: number): PlayerState {
    if (this.dead) {
      return "dead";
    }
    if (this.hurtUntilSeconds !== null) {
      if (nowSeconds < this.hurtUntilSeconds) {
        return "hurt";
      }
      this.hurtUntilSeconds = null;
    }
    return locomotion;
  }
}
