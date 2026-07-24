import { describe, expect, it } from "vitest";
import { LEVEL_ONE } from "../../src/gameplay/level/LevelOne";

describe("LEVEL_ONE", () => {
  it("describes a complete, plane-locked sunset workshop route", () => {
    expect(LEVEL_ONE.id).toBe("sunset-workshop-01");
    expect(LEVEL_ONE.spawn.z).toBe(0);
    expect(LEVEL_ONE.platforms.length).toBeGreaterThanOrEqual(10);
    expect(LEVEL_ONE.movingPlatforms).toHaveLength(1);
    expect(LEVEL_ONE.checkpoints).toHaveLength(1);
    expect(LEVEL_ONE.goals).toHaveLength(1);
    expect(LEVEL_ONE.hiddenAreas).toHaveLength(1);
    expect(LEVEL_ONE.parallaxLayers).toHaveLength(3);

    const allIds = [
      ...LEVEL_ONE.platforms.map((entry) => entry.id),
      ...LEVEL_ONE.movingPlatforms.map((entry) => entry.id),
      ...LEVEL_ONE.hazards.map((entry) => entry.id),
      ...LEVEL_ONE.checkpoints.map((entry) => entry.id),
      ...LEVEL_ONE.goals.map((entry) => entry.id),
      ...LEVEL_ONE.hiddenAreas.map((entry) => entry.id),
      ...LEVEL_ONE.enemySlots.map((entry) => entry.id),
      ...LEVEL_ONE.itemSlots.map((entry) => entry.id),
      ...LEVEL_ONE.tutorialTriggers.map((entry) => entry.id),
    ];
    expect(new Set(allIds).size).toBe(allIds.length);

    const positioned = [
      ...LEVEL_ONE.platforms,
      ...LEVEL_ONE.movingPlatforms,
      ...LEVEL_ONE.hazards,
      ...LEVEL_ONE.checkpoints,
      ...LEVEL_ONE.goals,
      ...LEVEL_ONE.hiddenAreas,
      ...LEVEL_ONE.enemySlots,
      ...LEVEL_ONE.itemSlots,
      ...LEVEL_ONE.tutorialTriggers,
    ];
    for (const entry of positioned) {
      expect(entry.position.z).toBe(0);
      if ("size" in entry && entry.size !== undefined && typeof entry.size === "object") {
        const size = entry.size as { width: number; height: number; depth: number };
        expect(size.width).toBeGreaterThan(0);
        expect(size.height).toBeGreaterThan(0);
        expect(size.depth).toBeGreaterThan(0);
      }
    }
    expect(LEVEL_ONE.cameraBounds.minX).toBeLessThanOrEqual(LEVEL_ONE.spawn.x);
    expect(LEVEL_ONE.cameraBounds.maxX).toBeGreaterThanOrEqual(LEVEL_ONE.spawn.x);
    const goal = LEVEL_ONE.goals.at(0);
    const moving = LEVEL_ONE.movingPlatforms.at(0);
    expect(goal).toBeDefined();
    expect(moving).toBeDefined();
    expect(LEVEL_ONE.cameraBounds.minX).toBeLessThanOrEqual(goal?.position.x ?? 0);
    expect(LEVEL_ONE.cameraBounds.maxX).toBeGreaterThanOrEqual(goal?.position.x ?? 0);
    expect(moving?.position).not.toEqual(moving?.endPosition);
  });
});
