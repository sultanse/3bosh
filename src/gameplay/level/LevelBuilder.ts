import type { Scene } from "@babylonjs/core/scene";
import type { LevelDefinition } from "./LevelDefinition";
import type { EnemyDefinition } from "./LevelDefinition";
import { PlatformFactory, type BuiltPlatform } from "./PlatformFactory";
import { MovingPlatform } from "./MovingPlatform";
import { Hazard, type LevelTrigger } from "./Hazard";
import { Checkpoint } from "./Checkpoint";
import { Goal } from "./Goal";
import { ParallaxBackground } from "./ParallaxBackground";

export interface BuiltLevel {
  readonly platforms: readonly BuiltPlatform[];
  readonly movingPlatforms: readonly MovingPlatform[];
  readonly hazards: readonly Hazard[];
  readonly checkpoints: readonly Checkpoint[];
  readonly goals: readonly Goal[];
  readonly triggers: readonly LevelTrigger[];
  readonly parallax: ParallaxBackground;
  readonly enemies: readonly EnemyDefinition[];
  updateMovingPlatforms(stepSeconds: number): void;
  dispose(): void;
}

export class LevelBuilder {
  public static build(scene: Scene, definition: LevelDefinition): BuiltLevel {
    const platforms = definition.platforms.map((entry) => PlatformFactory.create(scene, entry));
    const movingPlatforms = definition.movingPlatforms.map((entry) => new MovingPlatform(scene, entry));
    const hazards = definition.hazards.map((entry) => new Hazard(entry));
    const checkpoints = definition.checkpoints.map((entry) => new Checkpoint(entry));
    const goals = definition.goals.map((entry) => new Goal(entry));
    const parallax = new ParallaxBackground(scene, definition.parallaxLayers);
    const triggers: readonly LevelTrigger[] = [...hazards, ...checkpoints, ...goals];
    return {
      platforms,
      movingPlatforms,
      hazards,
      checkpoints,
      goals,
      triggers,
      parallax,
      enemies: definition.enemies,
      updateMovingPlatforms: (stepSeconds) => {
        for (const platform of movingPlatforms) platform.update(stepSeconds);
      },
      dispose: () => {
        for (const platform of movingPlatforms) platform.dispose();
        for (const platform of platforms) platform.dispose();
        for (const trigger of triggers) trigger.dispose();
        parallax.dispose();
      },
    };
  }
}
