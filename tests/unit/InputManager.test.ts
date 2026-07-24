import { describe, expect, it } from "vitest";

import { InputManager, type InputSource } from "../../src/input/InputManager";
import { KeyboardInputSource } from "../../src/input/KeyboardInputSource";
import { TouchInputSource } from "../../src/input/TouchInputSource";

class FakeWindow extends EventTarget {
  public dispatchKey(type: "keydown" | "keyup", code: string, repeat = false): void {
    const event = new Event(type) as KeyboardEvent;
    Object.defineProperties(event, {
      code: { value: code },
      repeat: { value: repeat },
    });
    this.dispatchEvent(event);
  }

  public dispatchPointer(type: "pointerdown" | "pointerup" | "pointercancel", pointerId: number, target: EventTarget): void {
    const event = new Event(type) as PointerEvent;
    Object.defineProperty(event, "pointerId", { value: pointerId });
    target.dispatchEvent(event);
  }
}

class SnapshotSource implements InputSource {
  public constructor(private snapshot: ReturnType<InputSource["sample"]>) {}

  public sample(): ReturnType<InputSource["sample"]> { return this.snapshot; }
  public dispose(): void {}
}

describe("InputManager", () => {
  it("returns an empty snapshot without input", () => {
    const manager = new InputManager();

    expect(manager.sample()).toEqual({
      moveAxis: 0,
      jumpPressed: false,
      jumpHeld: false,
      pausePressed: false,
      restartPressed: false,
    });
  });

  it("uses the most recently activated non-zero direction across keyboard and touch", () => {
    const windowTarget = new FakeWindow();
    const keyboard = new KeyboardInputSource(windowTarget);
    const touchTarget = new EventTarget();
    const touch = new TouchInputSource(touchTarget);
    const manager = new InputManager([keyboard, touch]);

    windowTarget.dispatchKey("keydown", "KeyA");
    windowTarget.dispatchPointer("pointerdown", 8, touch.rightElement);
    expect(manager.sample().moveAxis).toBe(1);

    windowTarget.dispatchKey("keydown", "KeyD");
    expect(manager.sample().moveAxis).toBe(1);

    windowTarget.dispatchPointer("pointerup", 8, touch.rightElement);
    expect(manager.sample().moveAxis).toBe(1);
  });

  it("supports simultaneous touch pointers and consumes edge actions once", () => {
    const windowTarget = new FakeWindow();
    const touchTarget = new EventTarget();
    const touch = new TouchInputSource(touchTarget);
    const manager = new InputManager([touch]);

    windowTarget.dispatchPointer("pointerdown", 1, touch.rightElement);
    windowTarget.dispatchPointer("pointerdown", 2, touch.jumpElement);

    expect(manager.sample()).toMatchObject({ moveAxis: 1, jumpHeld: true, jumpPressed: true });
    expect(manager.sample()).toMatchObject({ moveAxis: 1, jumpHeld: true, jumpPressed: false });
  });

  it("clears held actions when the window loses focus", () => {
    const windowTarget = new FakeWindow();
    const keyboard = new KeyboardInputSource(windowTarget);
    const manager = new InputManager([keyboard]);

    windowTarget.dispatchKey("keydown", "ArrowRight");
    windowTarget.dispatchKey("keydown", "Space");
    windowTarget.dispatchEvent(new Event("blur"));

    expect(manager.sample()).toEqual({
      moveAxis: 0,
      jumpPressed: false,
      jumpHeld: false,
      pausePressed: false,
      restartPressed: false,
    });
  });

  it("clears default touch pointers when the browser window loses focus", () => {
    const windowTarget = new FakeWindow();
    const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: windowTarget,
    });

    try {
      const touch = new TouchInputSource();
      const manager = new InputManager([touch]);
      windowTarget.dispatchPointer("pointerdown", 3, touch.jumpElement);
      windowTarget.dispatchEvent(new Event("blur"));

      expect(manager.sample()).toMatchObject({ jumpHeld: false, jumpPressed: false });
    } finally {
      if (originalWindow === undefined) {
        Reflect.deleteProperty(globalThis, "window");
      } else {
        Object.defineProperty(globalThis, "window", originalWindow);
      }
    }
  });

  it("emits rapid release-and-repress edges on consecutive samples", () => {
    const windowTarget = new FakeWindow();
    const keyboard = new KeyboardInputSource(windowTarget);
    const manager = new InputManager([keyboard]);

    windowTarget.dispatchKey("keydown", "Space");
    expect(manager.sample().jumpPressed).toBe(true);
    windowTarget.dispatchKey("keyup", "Space");
    windowTarget.dispatchKey("keydown", "Space");
    expect(manager.sample().jumpPressed).toBe(true);

    windowTarget.dispatchKey("keydown", "Escape");
    expect(manager.sample().pausePressed).toBe(true);
    windowTarget.dispatchKey("keyup", "Escape");
    windowTarget.dispatchKey("keydown", "Escape");
    expect(manager.sample().pausePressed).toBe(true);
  });

  it("merges sources without mutating their snapshots", () => {
    const source = new SnapshotSource({ moveAxis: -1, jumpPressed: true, jumpHeld: true, pausePressed: false, restartPressed: false });
    const manager = new InputManager([source]);

    expect(manager.sample()).toMatchObject({ moveAxis: -1, jumpPressed: true, jumpHeld: true });
    expect(manager.sample()).toMatchObject({ moveAxis: -1, jumpPressed: false, jumpHeld: true });
  });
});
