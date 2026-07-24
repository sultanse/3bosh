import { describe, expect, it } from "vitest";

import { LevelSession, type Checkpoint } from "../../src/app/LevelSession";
import type { DisposableLike } from "../../src/core/DisposableBag";
import { TypedEventBus, type GameEvents } from "../../src/core/TypedEventBus";

const spawn: Checkpoint = {
  id: "spawn",
  position: { x: 10, y: 2, z: 0 },
};

describe("LevelSession", () => {
  it("delivers an event to a listener snapshot even when another listener disposes", () => {
    const events = new TypedEventBus<GameEvents>();
    const received: string[] = [];
    let second: DisposableLike;
    events.on("playerJumped", () => {
      received.push("first");
      second.dispose();
    });
    second = events.on("playerJumped", () => received.push("second"));

    events.emit("playerJumped", { kind: "ground" });
    events.emit("playerJumped", { kind: "double" });
    events.dispose();
    events.emit("playerJumped", { kind: "coyote" });

    expect(received).toEqual(["first", "second", "first"]);
  });

  it("starts each attempt at its spawn with no score or collectibles", () => {
    const level = new LevelSession(spawn, new TypedEventBus<GameEvents>());

    expect(level.snapshot).toMatchObject({
      score: 0,
      collectibles: 0,
      activeCheckpointId: "spawn",
      activeCheckpointPosition: { x: 10, y: 2, z: 0 },
      goalReached: false,
    });
    expect(level.snapshot.collectedItemIds.size).toBe(0);
    expect("health" in level.snapshot).toBe(false);
  });

  it("activates a checkpoint only once and announces the activation", () => {
    const events = new TypedEventBus<GameEvents>();
    const activated: string[] = [];
    events.on("checkpointActivated", ({ checkpointId }) => activated.push(checkpointId));
    const level = new LevelSession(spawn, events);
    const checkpoint: Checkpoint = {
      id: "bridge",
      position: { x: 20, y: 4, z: 0 },
    };

    expect(level.activateCheckpoint(checkpoint)).toBe(true);
    expect(level.activateCheckpoint(checkpoint)).toBe(false);
    expect(level.snapshot.activeCheckpointId).toBe("bridge");
    expect(activated).toEqual(["bridge"]);
  });

  it("rejects duplicate collected item IDs while crediting a new collectible once", () => {
    const events = new TypedEventBus<GameEvents>();
    const collected: Array<{ kind: string; scoreDelta: number }> = [];
    events.on("collectibleCollected", (event) => collected.push(event));
    const level = new LevelSession(spawn, events);

    expect(level.collect("crystal-1", "crystal", 50)).toBe(true);
    expect(level.collect("crystal-1", "crystal", 50)).toBe(false);
    expect(level.snapshot).toMatchObject({ score: 50, collectibles: 1 });
    expect([...level.snapshot.collectedItemIds]).toEqual(["crystal-1"]);
    expect(collected).toEqual([{ kind: "crystal", scoreDelta: 50 }]);
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, 1.5, -1])(
    "rejects an invalid collectible score delta of %s without mutating or publishing",
    (scoreDelta) => {
      const events = new TypedEventBus<GameEvents>();
      const collected: Array<{ kind: string; scoreDelta: number }> = [];
      events.on("collectibleCollected", (event) => collected.push(event));
      const level = new LevelSession(spawn, events);

      expect(level.collect("invalid-crystal", "crystal", scoreDelta)).toBe(false);
      expect(level.snapshot).toMatchObject({ score: 0, collectibles: 0 });
      expect(level.snapshot.collectedItemIds.size).toBe(0);
      expect(collected).toEqual([]);
    },
  );

  it("allows a zero-score health collectible", () => {
    const level = new LevelSession(spawn, new TypedEventBus<GameEvents>());

    expect(level.collect("health-1", "health", 0)).toBe(true);
    expect(level.snapshot).toMatchObject({ score: 0, collectibles: 1 });
  });

  it("completes the goal only once and reports the final progress", () => {
    const events = new TypedEventBus<GameEvents>();
    const completed: Array<{ score: number; collectibles: number }> = [];
    events.on("levelCompleted", (event) => completed.push(event));
    const level = new LevelSession(spawn, events);
    level.collect("crystal-1", "crystal", 50);

    expect(level.completeGoal()).toBe(true);
    expect(level.completeGoal()).toBe(false);
    expect(level.snapshot.goalReached).toBe(true);
    expect(completed).toEqual([{ score: 50, collectibles: 1 }]);
  });
});
