import {
  nextInputActivationOrder,
  type InputAction,
  type InputSnapshot,
} from "./InputAction";
import type { InputEdgeRevisions, InputSource } from "./InputManager";

type TouchAction = InputAction;

const defaultBlurTarget = (): EventTarget | undefined =>
  typeof window === "undefined" ? undefined : window;

/**
 * Input source for touch controls. Consumers can replace the exposed targets
 * with their GUI buttons through bind(); no browser globals are required.
 */
export class TouchInputSource implements InputSource {
  public readonly leftElement: EventTarget = new EventTarget();
  public readonly rightElement: EventTarget = new EventTarget();
  public readonly jumpElement: EventTarget = new EventTarget();
  public readonly pauseElement: EventTarget = new EventTarget();
  public readonly restartElement: EventTarget = new EventTarget();

  private readonly pointers = new Map<number, TouchAction>();
  private readonly directionActivations = new Map<"left" | "right", number>();
  private readonly bindings: Array<{ readonly target: EventTarget; readonly action: TouchAction }> = [];
  private jumpPressed = false;
  private pausePressed = false;
  private restartPressed = false;
  private jumpPressedRevision = 0;
  private pausePressedRevision = 0;
  private restartPressedRevision = 0;

  private readonly pointerDownListener = (event: Event): void => {
    const pointerEvent = event as PointerEvent;
    const target = event.currentTarget;
    const binding = this.bindings.find((candidate) => candidate.target === target);
    if (binding === undefined) {
      return;
    }
    this.press(pointerEvent.pointerId, binding.action);
  };

  private readonly pointerUpListener = (event: Event): void => {
    const pointerEvent = event as PointerEvent;
    this.release(pointerEvent.pointerId);
  };

  private readonly blurListener = (): void => this.clear();

  public constructor(private readonly blurTarget: EventTarget | undefined = defaultBlurTarget()) {
    this.bind("left", this.leftElement);
    this.bind("right", this.rightElement);
    this.bind("jump", this.jumpElement);
    this.bind("pause", this.pauseElement);
    this.bind("restart", this.restartElement);
    this.blurTarget?.addEventListener("blur", this.blurListener);
  }

  public bind(action: TouchAction, target: EventTarget): void {
    target.addEventListener("pointerdown", this.pointerDownListener);
    target.addEventListener("pointerup", this.pointerUpListener);
    target.addEventListener("pointercancel", this.pointerUpListener);
    this.bindings.push({ action, target });
  }

  /**
   * Begin tracking a pointer for an action. Shares the pointer/activation
   * bookkeeping with the EventTarget path; an already-tracked id is ignored.
   */
  public press(pointerId: number, action: TouchAction): void {
    if (this.pointers.has(pointerId)) {
      return;
    }
    const wasHeld = this.isActionHeld(action);
    this.pointers.set(pointerId, action);
    if (!wasHeld) {
      this.activate(action);
    }
  }

  public release(pointerId: number): void {
    this.pointers.delete(pointerId);
  }

  public cancelAll(): void {
    this.clear();
  }

  public sample(): InputSnapshot {
    const snapshot: InputSnapshot = {
      moveAxis: this.resolveMoveAxis(),
      jumpPressed: this.jumpPressed,
      jumpHeld: this.isActionHeld("jump"),
      pausePressed: this.pausePressed,
      restartPressed: this.restartPressed,
    };
    this.jumpPressed = false;
    this.pausePressed = false;
    this.restartPressed = false;
    return snapshot;
  }

  public getLastMoveActivation(): number {
    const axis = this.resolveMoveAxis();
    return axis === -1
      ? (this.directionActivations.get("left") ?? 0)
      : axis === 1
        ? (this.directionActivations.get("right") ?? 0)
        : 0;
  }

  public getEdgeRevisions(): InputEdgeRevisions {
    return {
      jumpPressed: this.jumpPressedRevision,
      pausePressed: this.pausePressedRevision,
      restartPressed: this.restartPressedRevision,
    };
  }

  public clear(): void {
    this.pointers.clear();
    this.directionActivations.clear();
    this.jumpPressed = false;
    this.pausePressed = false;
    this.restartPressed = false;
  }

  public dispose(): void {
    for (const binding of this.bindings) {
      binding.target.removeEventListener("pointerdown", this.pointerDownListener);
      binding.target.removeEventListener("pointerup", this.pointerUpListener);
      binding.target.removeEventListener("pointercancel", this.pointerUpListener);
    }
    this.bindings.length = 0;
    this.blurTarget?.removeEventListener("blur", this.blurListener);
    this.clear();
  }

  private activate(action: TouchAction): void {
    switch (action) {
      case "left":
      case "right":
        this.directionActivations.set(action, nextInputActivationOrder());
        break;
      case "jump":
        this.jumpPressed = true;
        this.jumpPressedRevision = nextInputActivationOrder();
        break;
      case "pause":
        this.pausePressed = true;
        this.pausePressedRevision = nextInputActivationOrder();
        break;
      case "restart":
        this.restartPressed = true;
        this.restartPressedRevision = nextInputActivationOrder();
        break;
    }
  }

  private isActionHeld(action: TouchAction): boolean {
    return [...this.pointers.values()].some((pointerAction) => pointerAction === action);
  }

  private resolveMoveAxis(): -1 | 0 | 1 {
    const leftOrder = this.isActionHeld("left") ? (this.directionActivations.get("left") ?? 0) : 0;
    const rightOrder = this.isActionHeld("right") ? (this.directionActivations.get("right") ?? 0) : 0;
    if (leftOrder === rightOrder) {
      return 0;
    }
    return leftOrder > rightOrder ? -1 : 1;
  }
}
