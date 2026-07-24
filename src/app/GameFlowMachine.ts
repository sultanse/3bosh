export type GameFlowState =
  | "boot"
  | "menu"
  | "loadingLevel"
  | "playing"
  | "paused"
  | "victory"
  | "gameOver";

const transitions: Readonly<Record<GameFlowState, readonly GameFlowState[]>> = {
  boot: ["menu"],
  menu: ["loadingLevel"],
  loadingLevel: ["playing", "menu"],
  playing: ["paused", "victory", "gameOver"],
  paused: ["playing", "menu"],
  victory: ["menu"],
  gameOver: ["loadingLevel", "menu"],
};

export class GameFlowMachine {
  private currentState: GameFlowState;

  public constructor(initialState: GameFlowState) {
    this.currentState = initialState;
  }

  public get state(): GameFlowState {
    return this.currentState;
  }

  public transition(next: GameFlowState): void {
    if (!transitions[this.currentState].includes(next)) {
      throw new Error(`Illegal game flow transition: ${this.currentState} -> ${next}`);
    }

    this.currentState = next;
  }
}
