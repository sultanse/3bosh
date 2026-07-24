import { NullEngine } from "@babylonjs/core/Engines/nullEngine";
import { Scene } from "@babylonjs/core/scene";
import { describe, expect, it } from "vitest";

import { LevelSession } from "../../src/app/LevelSession";
import { TypedEventBus, type GameEvents } from "../../src/core/TypedEventBus";
import { HealthPickup } from "../../src/gameplay/items/HealthPickup";
import { ShieldPowerUp } from "../../src/gameplay/items/ShieldPowerUp";
import { PlayerHealth } from "../../src/gameplay/player/PlayerHealth";

const spawn = { id: "spawn", position: { x: 0, y: 1, z: 0 } };

const createContext = (health = new PlayerHealth(3, 0)): { readonly scene: Scene; readonly health: PlayerHealth; readonly level: LevelSession } => {
  const scene = new Scene(new NullEngine());
  const events = new TypedEventBus<GameEvents>();
  const playerHealth = health;
  return { scene, health: playerHealth, level: new LevelSession(spawn, events, playerHealth, () => 4) };
};

describe("collectible item effects", () => {
  it("credits a hidden-area crystal exactly once", () => {
    const { level } = createContext();

    expect(level.collect("hidden-area-crystal", { kind: "crystal", score: 50 })).toMatchObject({ collected: true, scoreDelta: 50 });
    expect(level.collect("hidden-area-crystal", { kind: "crystal", score: 50 }).collected).toBe(false);
    expect(level.snapshot).toMatchObject({ score: 50, collectibles: 1 });
  });

  it("leaves a health pickup available at maximum health and consumes it after one healing point", () => {
    const { scene, health, level } = createContext();
    const pickup = new HealthPickup(scene, { id: "health", position: { x: 0, y: 1, z: 0 } });
    const bounds = pickup.bounds;

    expect(pickup.tryCollect(bounds, { level, health, nowSeconds: 4 })).toBe(false);
    expect(pickup.available).toBe(true);
    health.damage(1, "fall", 0);
    expect(pickup.tryCollect(bounds, { level, health, nowSeconds: 4 })).toBe(true);
    expect(health.current).toBe(3);
    expect(pickup.available).toBe(false);
    pickup.dispose();
    scene.dispose();
  });

  it("grants a shield which blocks exactly one contact hit before its duration expires", () => {
    const { scene, health, level } = createContext();
    const pickup = new ShieldPowerUp(scene, { id: "shield", position: { x: 0, y: 1, z: 0 }, durationSeconds: 5 });

    expect(pickup.tryCollect(pickup.bounds, { level, health, nowSeconds: 4 })).toBe(true);
    expect(health.damage(1, "enemy", 5)).toMatchObject({ blockedByShield: true });
    expect(health.damage(1, "enemy", 6)).toMatchObject({ applied: true, health: 2 });
    pickup.dispose();
    scene.dispose();
  });

  it("disposes unique pickup materials and its bounded collection pulse", () => {
    const { scene, health, level } = createContext();
    const pickup = new HealthPickup(scene, { id: "disposal-health", position: { x: 0, y: 1, z: 0 } });
    health.damage(1, "fall", 0);

    expect(scene.materials).toHaveLength(1);
    expect(pickup.tryCollect(pickup.bounds, { level, health, nowSeconds: 4 })).toBe(true);
    expect(scene.materials.some((material) => material.name === "collection-pulse-material-health-disposal-health")).toBe(true);
    for (let index = 0; index < 30; index += 1) pickup.update(1 / 60);
    expect(scene.materials.some((material) => material.name === "collection-pulse-material-health-disposal-health")).toBe(false);
    pickup.dispose();
    expect(scene.materials.some((material) => material.name === "health-material-disposal-health")).toBe(false);
    scene.dispose();
  });
});
