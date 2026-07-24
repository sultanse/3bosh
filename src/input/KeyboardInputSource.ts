import {
  nextInputActivationOrder,
  type InputAction,
  type InputSnapshot,
} from "./InputAction";
import type { InputSource } from "./InputManager";

const keyActions: Readonly<Record<string, InputAction>> = {
  KeyA: "left",
  ArrowLeft: "left",
  KeyD: "right",
  ArrowRight: "right",
  Space: "jump",
  KeyW: "jump",
  ArrowUp: "jump",
  Escape: "pause",
  KeyR: "restart",
};

export class KeyboardInputSource implements InputSource {
  private readonly heldKeys = new Set<string>();
  private readonly directionActivations = new Map<"left" | "right", number>();
  private jumpPressed = false;
  private pausePressed = false;
  private restartPressed = false;

  private readonly keyDownListener = (event: Event): void => {
    const keyboardEvent = event as KeyboardEvent;
    const action = keyActions[keyboardEvent.code];
    if (action === undefined || keyboardEvent.repeat || this.heldKeys.has(keyboardEvent.code)) {
      return;
    }

    const wasHeld = this.isActionHeld(action);
    this.heldKeys.add(keyboardEvent.code);
    if (!wasHeld) {
      this.activate(action);
    }
  };

  private readonly keyUpListener = (event: Event): void => {
    const keyboardEvent = event as KeyboardEvent;
    this.heldKeys.delete(keyboardEvent.code);
  };

  private readonly blurListener = (): void => this.clear();

  public constructor(private readonly eventTarget: EventTarget = window) {
    this.eventTarget.addEventListener("keydown", this.keyDownListener);
    this.eventTarget.addEventListener("keyup", this.keyUpListener);
    this.eventTarget.addEventListener("blur", this.blurListener);
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
    if (axis === -1) {
      return this.directionActivations.get("left") ?? 0;
    }
    if (axis === 1) {
      return this.directionActivations.get("right") ?? 0;
    }
    return 0;
  }

  public clear(): void {
    this.heldKeys.clear();
    this.directionActivations.clear();
    this.jumpPressed = false;
    this.pausePressed = false;
    this.restartPressed = false;
  }

  public dispose(): void {
    this.eventTarget.removeEventListener("keydown", this.keyDownListener);
    this.eventTarget.removeEventListener("keyup", this.keyUpListener);
    this.eventTarget.removeEventListener("blur", this.blurListener);
    this.clear();
  }

  private activate(action: InputAction): void {
    switch (action) {
      case "left":
      case "right":
        this.directionActivations.set(action, nextInputActivationOrder());
        break;
      case "jump":
        this.jumpPressed = true;
        break;
      case "pause":
        this.pausePressed = true;
        break;
      case "restart":
        this.restartPressed = true;
        break;
    }
  }

  private isActionHeld(action: InputAction): boolean {
    for (const code of this.heldKeys) {
      if (keyActions[code] === action) {
        return true;
      }
    }
    return false;
  }

  private resolveMoveAxis(): -1 | 0 | 1 {
    const leftOrder = this.isActionHeld("left")
      ? (this.directionActivations.get("left") ?? 0)
      : 0;
    const rightOrder = this.isActionHeld("right")
      ? (this.directionActivations.get("right") ?? 0)
      : 0;
    if (leftOrder === rightOrder) {
      return 0;
    }
    return leftOrder > rightOrder ? -1 : 1;
  }
}
