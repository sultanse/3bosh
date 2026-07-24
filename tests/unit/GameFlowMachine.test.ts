import { describe, expect, it } from "vitest";

import { GameSession } from "../../src/app/GameSession";
import { GameFlowMachine } from "../../src/app/GameFlowMachine";
import { TypedEventBus, type GameEvents } from "../../src/core/TypedEventBus";
import { SaveService } from "../../src/services/SaveService";

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();

  public get length(): number { return this.values.size; }
  public clear(): void { this.values.clear(); }
  public getItem(key: string): string | null { return this.values.get(key) ?? null; }
  public key(index: number): string | null { return [...this.values.keys()][index] ?? null; }
  public removeItem(key: string): void { this.values.delete(key); }
  public setItem(key: string, value: string): void { this.values.set(key, value); }
}

describe("GameFlowMachine", () => {
  it("allows the level lifecycle and rejects transitions outside the state graph", () => {
    const flow = new GameFlowMachine("boot");

    flow.transition("menu");
    flow.transition("loadingLevel");
    flow.transition("playing");
    flow.transition("paused");
    flow.transition("playing");
    flow.transition("victory");

    expect(flow.state).toBe("victory");
    expect(() => flow.transition("paused")).toThrow("Illegal game flow transition");
  });

  it("does not allow callers to bypass the transition graph by assigning state", () => {
    const flow = new GameFlowMachine("boot");

    expect(Reflect.set(flow, "state", "victory")).toBe(false);
    expect(flow.state).toBe("boot");
  });

  it("finalizes a level score when the session reaches game over", () => {
    const flow = new GameFlowMachine("playing");
    const session = new GameSession(flow, new SaveService(new MemoryStorage()), new TypedEventBus<GameEvents>());
    const level = session.startLevel({ id: "spawn", position: { x: 0, y: 0, z: 0 } });
    level.addScore(180);

    session.transition("gameOver");

    expect(session.saveData.highScore).toBe(180);
  });

  it("pins the victory result so later level events cannot change the saved score", () => {
    const flow = new GameFlowMachine("playing");
    const session = new GameSession(flow, new SaveService(new MemoryStorage()), new TypedEventBus<GameEvents>());
    const level = session.startLevel({ id: "spawn", position: { x: 0, y: 0, z: 0 } });
    level.addScore(180);

    session.transition("victory");
    level.addScore(500);

    expect(session.saveData.highScore).toBe(180);
  });
});
