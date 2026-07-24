import { describe, expect, it } from "vitest";

import { GameFlowMachine } from "../../src/app/GameFlowMachine";
import { GameSession } from "../../src/app/GameSession";
import { TypedEventBus, type GameEvents } from "../../src/core/TypedEventBus";
import { SaveService } from "../../src/services/SaveService";

const spawn = { id: "spawn", position: { x: 0, y: 1, z: 0 } };

const createStorage = (): Storage => {
  const values = new Map<string, string>();
  return {
    get length() { return values.size; },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => { values.delete(key); },
    setItem: (key, value) => { values.set(key, value); },
  };
};

describe("GameSession", () => {
  it("keeps a completed attempt's high score while a fresh level resets collected IDs", () => {
    const saves = new SaveService(createStorage());
    const flow = new GameFlowMachine("loadingLevel");
    const session = new GameSession(flow, saves, new TypedEventBus<GameEvents>());
    const firstAttempt = session.startLevel(spawn);

    expect(firstAttempt.collect("hidden-crystal", { kind: "crystal", score: 75 }).collected).toBe(true);
    flow.transition("playing");
    session.transition("victory");

    expect(session.saveData.highScore).toBe(75);
    const secondAttempt = session.startLevel(spawn);
    expect(secondAttempt.snapshot.collectedItemIds.size).toBe(0);
    expect(secondAttempt.snapshot.score).toBe(0);
    expect(session.saveData.highScore).toBe(75);
  });
});
