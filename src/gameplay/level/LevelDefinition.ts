export interface Vec3Data {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface Size3Data {
  readonly width: number;
  readonly height: number;
  readonly depth: number;
}

export interface PlatformDefinition {
  readonly id: string;
  readonly position: Vec3Data;
  readonly size: Size3Data;
  readonly palette: "grass" | "stone" | "wood";
}

export interface MovingPlatformDefinition extends PlatformDefinition {
  readonly endPosition: Vec3Data;
  readonly travelSeconds: number;
  readonly pauseSeconds: number;
}

export interface TriggerDefinition {
  readonly id: string;
  readonly position: Vec3Data;
  readonly size: Size3Data;
}

export interface HazardDefinition extends TriggerDefinition {
  readonly kind: "spikes" | "void";
}

export interface CheckpointDefinition extends TriggerDefinition {
  readonly respawnPosition: Vec3Data;
}

export interface GoalDefinition extends TriggerDefinition {}

export interface SlotDefinition {
  readonly id: string;
  readonly position: Vec3Data;
}

export interface ParallaxLayerDefinition {
  readonly id: string;
  readonly factor: number;
  readonly y: number;
  readonly color: string;
}

export interface CameraBounds {
  readonly minX: number;
  readonly maxX: number;
  readonly minY: number;
  readonly maxY: number;
}

export interface LevelDefinition {
  readonly id: string;
  readonly spawn: Vec3Data;
  readonly fallThresholdY: number;
  readonly cameraBounds: CameraBounds;
  readonly platforms: readonly PlatformDefinition[];
  readonly movingPlatforms: readonly MovingPlatformDefinition[];
  readonly hazards: readonly HazardDefinition[];
  readonly checkpoints: readonly CheckpointDefinition[];
  readonly goals: readonly GoalDefinition[];
  readonly hiddenAreas: readonly TriggerDefinition[];
  readonly enemySlots: readonly SlotDefinition[];
  readonly itemSlots: readonly SlotDefinition[];
  readonly tutorialTriggers: readonly TriggerDefinition[];
  readonly parallaxLayers: readonly ParallaxLayerDefinition[];
}
