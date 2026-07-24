import { describe, expect, it } from "vitest";

import { TouchInputSource } from "../../src/input/TouchInputSource";

const create = (): TouchInputSource => new TouchInputSource(new EventTarget());

describe("TouchInputSource multi-touch API", () => {
  it("holds right and jump from two independent pointers", () => {
    const touch = create();

    touch.press(1, "right");
    touch.press(2, "jump");

    expect(touch.sample()).toMatchObject({
      moveAxis: 1,
      jumpPressed: true,
      jumpHeld: true,
    });
  });

  it("releasing the jump pointer keeps the held move direction but drops the jump", () => {
    const touch = create();

    touch.press(1, "right");
    touch.press(2, "jump");
    touch.sample();

    touch.release(2);

    expect(touch.sample()).toMatchObject({ moveAxis: 1, jumpHeld: false });
  });

  it("cancelAll clears every held pointer", () => {
    const touch = create();

    touch.press(1, "right");
    touch.press(2, "jump");
    touch.sample();

    touch.cancelAll();

    expect(touch.sample().moveAxis).toBe(0);
  });

  it("keeps an action held while another pointer still holds it", () => {
    const touch = create();

    touch.press(1, "right");
    touch.press(2, "right");
    touch.sample();

    touch.release(1);

    expect(touch.sample().moveAxis).toBe(1);
  });

  it("resolves opposing directions by most-recent activation", () => {
    const touch = create();

    touch.press(1, "left");
    touch.press(2, "right");

    expect(touch.sample().moveAxis).toBe(1);

    touch.release(2);

    expect(touch.sample().moveAxis).toBe(-1);
  });
});
