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
  readonly player?: {
    readonly x: number;
    readonly y: number;
    readonly z: number;
    readonly grounded: boolean;
    readonly airJumpCount: number;
    readonly fixedSteps: number;
    readonly jumpApexY: number;
    readonly fixedStep180?: { readonly x: number; readonly jumpApexY: number };
    readonly health?: number;
    readonly score?: number;
    readonly collectibles?: number;
    readonly defeatedEnemies?: number;
    readonly activeProjectiles?: number;
    readonly projectilesFired?: number;
    readonly stompBounceCount?: number;
    readonly verticalVelocity?: number;
    readonly cameraShakeSamples?: number;
    readonly patrolPhysicsX?: number;
    readonly inactiveReservedProjectiles?: number;
    readonly lastProjectileContactReason?: "world" | "player";
    readonly lastProjectileContactAtSeconds?: number;
    readonly lastProjectileReleasedAtSeconds?: number;
    readonly projectileFireTimesSeconds?: readonly number[];
    readonly lastProjectileDisabledAndReserved?: boolean;
    readonly activeCheckpointId?: string | null;
    readonly respawnProtected?: boolean;
    readonly flowState?: import("./app/GameFlowMachine").GameFlowState;
    readonly lastRespawn?: { readonly x: number; readonly y: number; readonly velocityX: number; readonly velocityY: number };
  };
}

interface GameTestHarness {
  setInput(input: Partial<import("./input/InputAction").InputSnapshot>): void;
  teleportPlayer(x: number, y: number): void;
  forceFall(): void;
  activateCheckpoint(): void;
  defeatEnemy(): void;
  fireProjectileAt(x: number, y: number, velocityX: number): void;
  collectItem(): void;
  reachGoal(): void;
  startFixedMovementScenario(): void;
}

interface Window {
  __GAME_DIAGNOSTICS__?: GameDiagnostics;
  __GAME_TEST_HARNESS__?: GameTestHarness;
}
