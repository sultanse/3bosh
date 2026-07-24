import { describe, expect, it } from "vitest";

import {
  CanvasTouchAdapter,
  type PointerSurface,
  type VisibilityTarget,
} from "../../src/input/CanvasTouchAdapter";
import { TouchInputSource } from "../../src/input/TouchInputSource";
import type { TouchZone, TouchZoneProvider } from "../../src/ui/MobileControls";

interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

class FakeCanvas extends EventTarget implements PointerSurface {
  public rect: Rect;

  public constructor(rect: Rect) {
    super();
    this.rect = rect;
  }

  public getBoundingClientRect(): Readonly<Rect> {
    return { ...this.rect };
  }

  public dispatchPointer(
    type: "pointerdown" | "pointermove" | "pointerup" | "pointercancel",
    pointerId: number,
    clientX: number,
    clientY: number,
  ): void {
    const event = new Event(type, { cancelable: true });
    Object.defineProperties(event, {
      pointerId: { value: pointerId },
      clientX: { value: clientX },
      clientY: { value: clientY },
    });
    this.dispatchEvent(event);
  }
}

class FakeVisibility extends EventTarget implements VisibilityTarget {
  public visibilityState: DocumentVisibilityState = "visible";

  public hide(): void {
    this.visibilityState = "hidden";
    this.dispatchEvent(new Event("visibilitychange"));
  }
}

const ZONES: readonly TouchZone[] = [
  { id: "moveLeft", action: "left", bounds: { x: 0, y: 260, width: 100, height: 100 } },
  { id: "jump", action: "jump", bounds: { x: 130, y: 260, width: 100, height: 100 } },
  { id: "moveRight", action: "right", bounds: { x: 260, y: 260, width: 100, height: 100 } },
];

const centerOf = (id: TouchZone["id"]): { x: number; y: number } => {
  const zone = ZONES.find((entry) => entry.id === id);
  if (!zone) throw new Error(`missing zone ${id}`);
  return { x: zone.bounds.x + zone.bounds.width / 2, y: zone.bounds.y + zone.bounds.height / 2 };
};

const provider = (renderSize: { width: number; height: number } = { width: 360, height: 360 }): TouchZoneProvider => ({
  zones: () => ZONES,
  renderSize: () => renderSize,
});

interface Harness {
  readonly adapter: CanvasTouchAdapter;
  readonly canvas: FakeCanvas;
  readonly touch: TouchInputSource;
  readonly blur: EventTarget;
  readonly visibility: FakeVisibility;
}

const setup = (rect: Rect = { left: 0, top: 0, width: 360, height: 360 }): Harness => {
  const canvas = new FakeCanvas(rect);
  const touch = new TouchInputSource(new EventTarget());
  const blur = new EventTarget();
  const visibility = new FakeVisibility();
  const adapter = new CanvasTouchAdapter(canvas, provider(), touch, {
    blurTarget: blur,
    visibilityTarget: visibility,
  });
  return { adapter, canvas, touch, blur, visibility };
};

describe("CanvasTouchAdapter", () => {
  it("presses and releases a single zone", () => {
    const { canvas, touch } = setup();
    const right = centerOf("moveRight");

    canvas.dispatchPointer("pointerdown", 1, right.x, right.y);
    expect(touch.sample().moveAxis).toBe(1);

    canvas.dispatchPointer("pointerup", 1, right.x, right.y);
    expect(touch.sample().moveAxis).toBe(0);
  });

  it("holds two simultaneous pointers and keeps the survivor when one releases", () => {
    const { canvas, touch } = setup();
    const right = centerOf("moveRight");
    const jump = centerOf("jump");

    canvas.dispatchPointer("pointerdown", 1, right.x, right.y);
    canvas.dispatchPointer("pointerdown", 2, jump.x, jump.y);
    expect(touch.sample()).toMatchObject({ moveAxis: 1, jumpHeld: true });

    canvas.dispatchPointer("pointerup", 2, jump.x, jump.y);
    expect(touch.sample()).toMatchObject({ moveAxis: 1, jumpHeld: false });
  });

  it("flips the action when a held pointer moves into a different zone", () => {
    const { canvas, touch } = setup();
    const right = centerOf("moveRight");
    const left = centerOf("moveLeft");

    canvas.dispatchPointer("pointerdown", 1, right.x, right.y);
    expect(touch.sample().moveAxis).toBe(1);

    canvas.dispatchPointer("pointermove", 1, left.x, left.y);
    expect(touch.sample().moveAxis).toBe(-1);
  });

  it("releases the action when a held pointer moves out of all zones", () => {
    const { canvas, touch } = setup();
    const right = centerOf("moveRight");

    canvas.dispatchPointer("pointerdown", 1, right.x, right.y);
    expect(touch.sample().moveAxis).toBe(1);

    canvas.dispatchPointer("pointermove", 1, 10, 10);
    expect(touch.sample().moveAxis).toBe(0);
  });

  it("treats pointercancel like a release", () => {
    const { canvas, touch } = setup();
    const right = centerOf("moveRight");

    canvas.dispatchPointer("pointerdown", 1, right.x, right.y);
    expect(touch.sample().moveAxis).toBe(1);

    canvas.dispatchPointer("pointercancel", 1, right.x, right.y);
    expect(touch.sample().moveAxis).toBe(0);
  });

  it("cancels every held pointer on window blur", () => {
    const { canvas, touch, blur } = setup();
    const right = centerOf("moveRight");
    const jump = centerOf("jump");

    canvas.dispatchPointer("pointerdown", 1, right.x, right.y);
    canvas.dispatchPointer("pointerdown", 2, jump.x, jump.y);
    blur.dispatchEvent(new Event("blur"));

    expect(touch.sample()).toMatchObject({ moveAxis: 0, jumpHeld: false });
  });

  it("cancels every held pointer when the document becomes hidden", () => {
    const { canvas, touch, visibility } = setup();
    const right = centerOf("moveRight");
    const jump = centerOf("jump");

    canvas.dispatchPointer("pointerdown", 1, right.x, right.y);
    canvas.dispatchPointer("pointerdown", 2, jump.x, jump.y);
    visibility.hide();

    expect(touch.sample()).toMatchObject({ moveAxis: 0, jumpHeld: false });
  });

  it("removes every listener on dispose and is idempotent", () => {
    const { adapter, canvas, touch } = setup();
    const right = centerOf("moveRight");

    adapter.dispose();
    expect(() => adapter.dispose()).not.toThrow();

    canvas.dispatchPointer("pointerdown", 1, right.x, right.y);
    expect(touch.sample().moveAxis).toBe(0);
  });

  it("stops reacting to blur and visibility events after dispose", () => {
    const { adapter, canvas, touch, blur, visibility } = setup();
    const right = centerOf("moveRight");

    canvas.dispatchPointer("pointerdown", 1, right.x, right.y);
    adapter.dispose();

    blur.dispatchEvent(new Event("blur"));
    visibility.hide();
    canvas.dispatchPointer("pointerup", 1, right.x, right.y);
    expect(touch.sample().moveAxis).toBe(0);
  });

  it("ignores a press that lands outside every zone", () => {
    const { canvas, touch } = setup();

    canvas.dispatchPointer("pointerdown", 1, 10, 10);
    expect(touch.sample()).toMatchObject({ moveAxis: 0, jumpHeld: false });
  });

  it("maps client coordinates to texture space when the canvas is scaled", () => {
    const canvas = new FakeCanvas({ left: 0, top: 0, width: 360, height: 360 });
    const touch = new TouchInputSource(new EventTarget());
    new CanvasTouchAdapter(canvas, provider({ width: 720, height: 720 }), touch, {
      blurTarget: new EventTarget(),
      visibilityTarget: new FakeVisibility(),
    });

    const right = centerOf("moveRight");
    const scale = 360 / 720;

    canvas.dispatchPointer("pointerdown", 1, right.x * scale, right.y * scale);
    expect(touch.sample().moveAxis).toBe(1);
  });
});
