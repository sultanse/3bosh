export type InputAction = "left" | "right" | "jump" | "pause" | "restart";

export interface InputSnapshot {
  readonly moveAxis: -1 | 0 | 1;
  readonly jumpPressed: boolean;
  readonly jumpHeld: boolean;
  readonly pausePressed: boolean;
  readonly restartPressed: boolean;
}

export const EMPTY_INPUT_SNAPSHOT: InputSnapshot = {
  moveAxis: 0,
  jumpPressed: false,
  jumpHeld: false,
  pausePressed: false,
  restartPressed: false,
};

let activationOrder = 0;

export const nextInputActivationOrder = (): number => {
  activationOrder += 1;
  return activationOrder;
};
