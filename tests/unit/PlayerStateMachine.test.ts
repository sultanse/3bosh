import { describe, expect, it } from "vitest";

import { PlayerStateMachine } from "../../src/gameplay/player/PlayerStateMachine";

describe("PlayerStateMachine", () => {
  it("derives locomotion states from support, movement, and vertical velocity", () => {
    const machine = new PlayerStateMachine();

    expect(machine.selectLocomotion({ grounded: true, moving: false, velocityY: 0 })).toBe("idle");
    expect(machine.selectLocomotion({ grounded: true, moving: true, velocityY: 0 })).toBe("running");
    expect(machine.selectLocomotion({ grounded: false, moving: false, velocityY: 2 })).toBe("jumping");
    expect(machine.selectLocomotion({ grounded: false, moving: false, velocityY: -2 })).toBe("falling");
  });

  it("emits a typed callback only when its state changes", () => {
    const machine = new PlayerStateMachine();
    const states: string[] = [];
    const subscription = machine.onStateChanged((state) => states.push(state));

    machine.set("running");
    machine.set("running");
    machine.set("jumping");
    subscription.dispose();
    machine.set("falling");

    expect(states).toEqual(["running", "jumping"]);
  });

  it("keeps hurt and dead states over locomotion selections", () => {
    const machine = new PlayerStateMachine();

    machine.set("hurt");
    expect(machine.resolve("running")).toBe("hurt");
    machine.set("dead");
    expect(machine.resolve("idle")).toBe("dead");
    machine.set("running");
    expect(machine.state).toBe("dead");
  });
});
