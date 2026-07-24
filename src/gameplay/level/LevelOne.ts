import type { LevelDefinition } from "./LevelDefinition";

/** Static authored data for the original "Sunset Workshop" tutorial level. */
export const LEVEL_ONE: LevelDefinition = {
  id: "sunset-workshop-01",
  spawn: { x: 3, y: 1.5, z: 0 },
  fallThresholdY: -8,
  cameraBounds: { minX: -2, maxX: 124, minY: -3, maxY: 14 },
  platforms: [
    { id: "ground-tutorial", position: { x: 7, y: -0.5, z: 0 }, size: { width: 14, height: 1, depth: 2 }, palette: "grass" },
    { id: "arena-approach", position: { x: 22, y: -0.5, z: 0 }, size: { width: 6, height: 1, depth: 2 }, palette: "stone" },
    { id: "patrol-arena", position: { x: 31, y: -0.5, z: 0 }, size: { width: 12, height: 1, depth: 2 }, palette: "stone" },
    { id: "crossing-left", position: { x: 43, y: 1.5, z: 0 }, size: { width: 4, height: 0.7, depth: 2 }, palette: "wood" },
    { id: "crossing-right", position: { x: 55, y: 1.5, z: 0 }, size: { width: 4, height: 0.7, depth: 2 }, palette: "wood" },
    { id: "alcove-ledge", position: { x: 58, y: -3, z: 0 }, size: { width: 7, height: 0.7, depth: 2 }, palette: "stone" },
    { id: "checkpoint-deck", position: { x: 65, y: -0.5, z: 0 }, size: { width: 12, height: 1, depth: 2 }, palette: "grass" },
    { id: "shooter-arena", position: { x: 80, y: -0.5, z: 0 }, size: { width: 16, height: 1, depth: 2 }, palette: "stone" },
    { id: "final-step-one", position: { x: 94, y: 1, z: 0 }, size: { width: 4, height: 0.7, depth: 2 }, palette: "wood" },
    { id: "final-step-two", position: { x: 101, y: 3, z: 0 }, size: { width: 4, height: 0.7, depth: 2 }, palette: "wood" },
    { id: "final-run", position: { x: 110, y: -0.5, z: 0 }, size: { width: 13, height: 1, depth: 2 }, palette: "grass" },
    { id: "goal-plinth", position: { x: 116, y: 1, z: 0 }, size: { width: 4, height: 0.7, depth: 2 }, palette: "stone" },
  ],
  movingPlatforms: [
    { id: "workshop-lift", position: { x: 47, y: 1.5, z: 0 }, endPosition: { x: 52, y: 3.5, z: 0 }, size: { width: 3, height: 0.6, depth: 2 }, palette: "wood", travelSeconds: 2.5, pauseSeconds: 0.4 },
  ],
  hazards: [
    { id: "tutorial-gap-void", kind: "void", position: { x: 17, y: -5, z: 0 }, size: { width: 4, height: 6, depth: 2 } },
    { id: "final-spikes", kind: "spikes", position: { x: 106, y: 0.25, z: 0 }, size: { width: 2, height: 0.6, depth: 2 } },
  ],
  checkpoints: [
    { id: "checkpoint-workshop-gate", position: { x: 64, y: 1, z: 0 }, size: { width: 1.5, height: 3, depth: 2 }, respawnPosition: { x: 65, y: 1.5, z: 0 } },
  ],
  goals: [
    { id: "goal-sunset-portal", position: { x: 116, y: 2.5, z: 0 }, size: { width: 2, height: 3, depth: 2 } },
  ],
  hiddenAreas: [
    { id: "hidden-lower-alcove", position: { x: 58, y: -2, z: 0 }, size: { width: 5, height: 2, depth: 2 } },
  ],
  enemySlots: [
    { id: "patrol-slot-a", position: { x: 29, y: 1, z: 0 } },
    { id: "shooter-slot-a", position: { x: 80, y: 1, z: 0 } },
  ],
  enemies: [
    { id: "patrol-a", kind: "patrol", position: { x: 31, y: 1, z: 0 }, size: { width: 1.1, height: 1.6, depth: 1.2 }, score: 100, patrolMinX: 27, patrolMaxX: 35, speed: 1.7 },
    { id: "shooter-a", kind: "shooter", position: { x: 81, y: 1, z: 0 }, size: { width: 1.1, height: 1.7, depth: 1.2 }, score: 150, activationDistanceX: 13, fireIntervalSeconds: 1.1, projectileSpeed: 7 },
  ],
  itemSlots: [
    { id: "alcove-crystal-slot", kind: "crystal", score: 75, position: { x: 58, y: -1.5, z: 0 } },
    { id: "approach-health-slot", kind: "health", position: { x: 72, y: 1, z: 0 } },
    { id: "workshop-shield-slot", kind: "shield", durationSeconds: 8, position: { x: 86, y: 1, z: 0 } },
    { id: "goal-crystal-slot", kind: "crystal", score: 50, position: { x: 111, y: 1, z: 0 } },
  ],
  tutorialTriggers: [
    { id: "tutorial-move", position: { x: 5, y: 2, z: 0 }, size: { width: 4, height: 3, depth: 2 } },
    { id: "tutorial-jump", position: { x: 13, y: 2, z: 0 }, size: { width: 2, height: 3, depth: 2 } },
  ],
  parallaxLayers: [
    { id: "sunset-sky", factor: 0.05, y: 6, color: "#f7a35c" },
    { id: "distant-cranes", factor: 0.18, y: 3, color: "#795071" },
    { id: "near-workshop", factor: 0.35, y: 1, color: "#34435f" },
  ],
};
