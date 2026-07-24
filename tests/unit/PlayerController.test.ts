import { describe, expect, it } from "vitest";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";

import { GAME_CONFIG } from "../../src/config/GameConfig";
import type { InputSnapshot } from "../../src/input/InputAction";
import { PlayerController } from "../../src/gameplay/player/PlayerController";
import type { CharacterMotionSnapshot } from "../../src/physics/PhysicsCharacterAdapter";

const STEP = GAME_CONFIG.fixedStepSeconds;
const EMPTY_INPUT: InputSnapshot = { moveAxis: 0, jumpPressed: false, jumpHeld: false, pausePressed: false, restartPressed: false };
const RIGHT_HELD: InputSnapshot = { ...EMPTY_INPUT, moveAxis: 1 };
const JUMP_PRESSED: InputSnapshot = { ...EMPTY_INPUT, jumpPressed: true, jumpHeld: true };
const GROUNDED_MOTION: CharacterMotionSnapshot = {
  support: { state: "supported", isDynamic: false, surfaceVelocity: Vector3.Zero() },
  position: Vector3.Zero(),
  velocity: Vector3.Zero(),
};
const AIRBORNE_MOTION: CharacterMotionSnapshot = {
  ...GROUNDED_MOTION,
  support: { state: "unsupported", isDynamic: false, surfaceVelocity: Vector3.Zero() },
  velocity: new Vector3(0, -2, 0),
};

const createController = (doubleJumpEnabled = false): PlayerController =>
  new PlayerController({ doubleJumpEnabled });

describe("PlayerController", () => {
  it("accelerates to a bounded running speed and decelerates without input", () => {
    const controller = createController();
    const running = controller.update(STEP, RIGHT_HELD, GROUNDED_MOTION, 0);
    expect(running.state).toBe("running");
    expect(running.velocityX).toBeGreaterThan(0);
    expect(running.velocityX).toBeLessThanOrEqual(GAME_CONFIG.player.moveSpeed);

    const slowing = controller.update(STEP, EMPTY_INPUT, GROUNDED_MOTION, STEP);
    expect(slowing.velocityX).toBeLessThan(running.velocityX);
    expect(slowing.state).toBe("idle");
  });

  it("accepts a grounded jump once and does not repeat it in the air", () => {
    const controller = createController();
    controller.update(STEP, EMPTY_INPUT, GROUNDED_MOTION, 0);

    const jumping = controller.update(STEP, JUMP_PRESSED, GROUNDED_MOTION, STEP);
    expect(jumping.state).toBe("jumping");
    expect(jumping.overrideVelocityY).toBe(GAME_CONFIG.player.jumpSpeed);
    expect(jumping.acceptedJump).toBe(true);

    const repeated = controller.update(STEP, JUMP_PRESSED, AIRBORNE_MOTION, STEP * 2);
    expect(repeated.overrideVelocityY).toBeNull();
    expect(repeated.acceptedJump).toBe(false);
  });

  it("accepts a buffered jump on landing and coyote jump shortly after leaving support", () => {
    const controller = createController();
    controller.update(STEP, EMPTY_INPUT, GROUNDED_MOTION, 0);
    const coyote = controller.update(STEP, JUMP_PRESSED, AIRBORNE_MOTION, STEP * 2);
    expect(coyote.acceptedJump).toBe(true);

    const buffered = createController();
    buffered.update(STEP, JUMP_PRESSED, AIRBORNE_MOTION, 0);
    const landed = buffered.update(STEP, EMPTY_INPUT, GROUNDED_MOTION, GAME_CONFIG.player.jumpBufferSeconds / 2);
    expect(landed.acceptedJump).toBe(true);
  });

  it("uses the adapter vertical velocity for falling and keeps facing direction", () => {
    const controller = createController();
    const right = controller.update(STEP, RIGHT_HELD, AIRBORNE_MOTION, 0);
    expect(right.facing).toBe(1);
    expect(right.state).toBe("falling");

    const noInput = controller.update(STEP, EMPTY_INPUT, AIRBORNE_MOTION, STEP);
    expect(noInput.facing).toBe(1);
  });

  it("preserves facing through non-running states and reports the accepted jump kind", () => {
    const controller = createController();
    const left = { ...EMPTY_INPUT, moveAxis: -1 as const };

    expect(controller.update(STEP, left, GROUNDED_MOTION, 0).facing).toBe(-1);
    const jumping = controller.update(STEP, JUMP_PRESSED, GROUNDED_MOTION, STEP);
    expect(jumping.facing).toBe(-1);
    expect(jumping.jumpKind).toBe("ground");
    expect(controller.update(STEP, EMPTY_INPUT, AIRBORNE_MOTION, STEP * 2).facing).toBe(-1);
    expect(controller.update(STEP, EMPTY_INPUT, GROUNDED_MOTION, STEP * 3).facing).toBe(-1);
  });

  it("allows one air jump only when configured", () => {
    const disabled = createController(false);
    disabled.update(STEP, EMPTY_INPUT, GROUNDED_MOTION, 0);
    disabled.update(STEP, JUMP_PRESSED, GROUNDED_MOTION, STEP);
    expect(disabled.update(STEP, JUMP_PRESSED, AIRBORNE_MOTION, STEP * 2).acceptedJump).toBe(false);

    const enabled = createController(true);
    enabled.update(STEP, EMPTY_INPUT, GROUNDED_MOTION, 0);
    enabled.update(STEP, JUMP_PRESSED, GROUNDED_MOTION, STEP);
    expect(enabled.update(STEP, JUMP_PRESSED, AIRBORNE_MOTION, STEP * 2).acceptedJump).toBe(true);
  });

  it("emits queued vertical impulses for exactly one adapter step", () => {
    const controller = createController();
    controller.queueVerticalImpulse(7);

    expect(controller.update(STEP, EMPTY_INPUT, AIRBORNE_MOTION, 0).overrideVelocityY).toBe(7);
    expect(controller.update(STEP, EMPTY_INPUT, AIRBORNE_MOTION, STEP).overrideVelocityY).toBeNull();
  });

  it("holds hurt until expiry, makes death terminal, and only resets non-terminal respawns", () => {
    const controller = createController();
    controller.enterHurt(1);
    expect(controller.update(STEP, RIGHT_HELD, GROUNDED_MOTION, 0).state).toBe("hurt");
    expect(controller.update(STEP, RIGHT_HELD, GROUNDED_MOTION, 1).state).toBe("running");

    controller.markDead();
    expect(controller.update(STEP, RIGHT_HELD, GROUNDED_MOTION, 2).state).toBe("dead");
    controller.revive();
    expect(controller.update(STEP, EMPTY_INPUT, GROUNDED_MOTION, 3).state).toBe("dead");

    const respawningController = createController();
    respawningController.enterHurt(10);
    respawningController.revive();
    expect(respawningController.update(STEP, EMPTY_INPUT, GROUNDED_MOTION, 3).state).toBe("idle");
  });

  it("resets all controller-owned motion", () => {
    const controller = createController(true);
    controller.update(STEP, RIGHT_HELD, GROUNDED_MOTION, 0);
    controller.queueVerticalImpulse(5);
    controller.resetMotion();

    const result = controller.update(STEP, EMPTY_INPUT, AIRBORNE_MOTION, 1);
    expect(result.velocityX).toBe(0);
    expect(result.overrideVelocityY).toBeNull();
  });
});
