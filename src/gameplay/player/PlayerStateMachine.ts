import type { DisposableLike } from "../../core/DisposableBag";

export type PlayerState =
  | "idle"
  | "running"
  | "jumping"
  | "falling"
  | "hurt"
  | "dead";

export interface PlayerLocomotionSnapshot {
  readonly grounded: boolean;
  readonly moving: boolean;
  readonly velocityY: number;
}

export type PlayerStateListener = (state: PlayerState) => void;

export class PlayerStateMachine {
  private readonly listeners = new Set<PlayerStateListener>();
  private currentState: PlayerState = "idle";

  public get state(): PlayerState {
    return this.currentState;
  }

  public onStateChanged(listener: PlayerStateListener): DisposableLike {
    this.listeners.add(listener);
    return { dispose: () => this.listeners.delete(listener) };
  }

  public set(state: PlayerState): void {
    if (state === this.currentState || this.currentState === "dead") {
      return;
    }
    this.currentState = state;
    for (const listener of [...this.listeners]) {
      listener(state);
    }
  }

  public resolve(locomotion: PlayerState): PlayerState {
    return this.currentState === "hurt" || this.currentState === "dead"
      ? this.currentState
      : locomotion;
  }

  public selectLocomotion(snapshot: PlayerLocomotionSnapshot): PlayerState {
    if (snapshot.grounded) {
      return snapshot.moving ? "running" : "idle";
    }
    return snapshot.velocityY > 0 ? "jumping" : "falling";
  }
}
