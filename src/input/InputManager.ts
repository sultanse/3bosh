import {
  EMPTY_INPUT_SNAPSHOT,
  type InputSnapshot,
} from "./InputAction";

export interface InputSource {
  sample(): InputSnapshot;
  dispose(): void;
  /** Monotonic order of the source's currently held horizontal direction. */
  getLastMoveActivation?(): number;
}

export class InputManager {
  private readonly sources: InputSource[];
  private readonly previousEdges = new WeakMap<InputSource, Pick<InputSnapshot, "jumpPressed" | "pausePressed" | "restartPressed">>();

  public constructor(sources: readonly InputSource[] = []) {
    this.sources = [...sources];
  }

  public addSource(source: InputSource): void {
    this.sources.push(source);
  }

  public sample(): InputSnapshot {
    let moveAxis: -1 | 0 | 1 = EMPTY_INPUT_SNAPSHOT.moveAxis;
    let latestMoveActivation = Number.NEGATIVE_INFINITY;
    let jumpPressed = false;
    let jumpHeld = false;
    let pausePressed = false;
    let restartPressed = false;

    for (const source of this.sources) {
      const snapshot = source.sample();
      const previous = this.previousEdges.get(source) ?? {
        jumpPressed: false,
        pausePressed: false,
        restartPressed: false,
      };
      if (snapshot.moveAxis !== 0) {
        const activation = source.getLastMoveActivation?.() ?? 0;
        if (activation >= latestMoveActivation) {
          moveAxis = snapshot.moveAxis;
          latestMoveActivation = activation;
        }
      }
      jumpPressed ||= snapshot.jumpPressed && !previous.jumpPressed;
      jumpHeld ||= snapshot.jumpHeld;
      pausePressed ||= snapshot.pausePressed && !previous.pausePressed;
      restartPressed ||= snapshot.restartPressed && !previous.restartPressed;
      this.previousEdges.set(source, {
        jumpPressed: snapshot.jumpPressed,
        pausePressed: snapshot.pausePressed,
        restartPressed: snapshot.restartPressed,
      });
    }

    return { moveAxis, jumpPressed, jumpHeld, pausePressed, restartPressed };
  }

  public dispose(): void {
    for (const source of this.sources) {
      source.dispose();
    }
    this.sources.length = 0;
  }
}
