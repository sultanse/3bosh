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
  public state: GameFlowState;

  public constructor(initialState: GameFlowState) {
    this.state = initialState;
  }

  public transition(next: GameFlowState): void {
    if (!transitions[this.state].includes(next)) {
      throw new Error(`Illegal game flow transition: ${this.state} -> ${next}`);
    }

    this.state = next;
  }
}
