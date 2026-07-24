/// <reference types="vite/client" />

interface PhysicsProbeDiagnostics {
  readonly supported: boolean;
  readonly grounded: boolean;
  readonly zDriftWithinTolerance: boolean;
  readonly movingPlatformCarry: boolean;
  readonly platformRideTicks: number;
  readonly platformRelativeOffsetWithinTolerance: boolean;
  readonly enemyTriggerEntered: boolean;
  readonly enemyTriggerExited: boolean;
  readonly duplicateTriggerEvents: boolean;
}

interface GameDiagnostics {
  readonly physicsProbe?: PhysicsProbeDiagnostics;
}

interface Window {
  __GAME_DIAGNOSTICS__?: GameDiagnostics;
}
