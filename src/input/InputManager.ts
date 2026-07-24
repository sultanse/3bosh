import {
  EMPTY_INPUT_SNAPSHOT,
  type InputSnapshot,
} from "./InputAction";

export interface InputSource {
  sample(): InputSnapshot;
  dispose(): void;
  /** Monotonic order of the source's currently held horizontal direction. */
  getLastMoveActivation?(): number;
  /**
   * Monotonic activation revisions for sources that consume edge flags in
   * sample(). They let the manager distinguish a fresh press from a stale
   * true value even when a release and re-press happen between polls.
   */
  getEdgeRevisions?(): InputEdgeRevisions;
}

export interface InputEdgeRevisions {
  readonly jumpPressed: number;
  readonly pausePressed: number;
  readonly restartPressed: number;
}

type InputEdgeName = keyof InputEdgeRevisions;

interface EdgeState {
  readonly active: boolean;
  readonly revision: number | undefined;
}

export class InputManager {
  private readonly sources: InputSource[];
  private readonly edgeStates = new WeakMap<InputSource, Map<InputEdgeName, EdgeState>>();

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
      const revisions = source.getEdgeRevisions?.();
      if (snapshot.moveAxis !== 0) {
        const activation = source.getLastMoveActivation?.() ?? 0;
        if (activation >= latestMoveActivation) {
          moveAxis = snapshot.moveAxis;
          latestMoveActivation = activation;
        }
      }
      const sourceJumpPressed = this.consumeEdge(
        source,
        "jumpPressed",
        snapshot.jumpPressed,
        revisions,
      );
      const sourcePausePressed = this.consumeEdge(
        source,
        "pausePressed",
        snapshot.pausePressed,
        revisions,
      );
      const sourceRestartPressed = this.consumeEdge(
        source,
        "restartPressed",
        snapshot.restartPressed,
        revisions,
      );
      jumpPressed ||= sourceJumpPressed;
      jumpHeld ||= snapshot.jumpHeld;
      pausePressed ||= sourcePausePressed;
      restartPressed ||= sourceRestartPressed;
    }

    return { moveAxis, jumpPressed, jumpHeld, pausePressed, restartPressed };
  }

  public dispose(): void {
    for (const source of this.sources) {
      source.dispose();
    }
    this.sources.length = 0;
  }

  private consumeEdge(
    source: InputSource,
    edge: InputEdgeName,
    active: boolean,
    revisions: InputEdgeRevisions | undefined,
  ): boolean {
    const states = this.edgeStates.get(source) ?? new Map<InputEdgeName, EdgeState>();
    this.edgeStates.set(source, states);
    const previous = states.get(edge) ?? { active: false, revision: undefined };
    const revision = revisions?.[edge];
    const emitted = active && (revision === undefined
      ? !previous.active
      : revision !== previous.revision);
    states.set(edge, { active, revision: revision ?? previous.revision });
    return emitted;
  }
}
