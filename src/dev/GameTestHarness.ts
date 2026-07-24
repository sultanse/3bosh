import type { InputSnapshot } from "../input/InputAction";
import type { InputEdgeRevisions, InputSource } from "../input/InputManager";

export interface PlayerDiagnostic {
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
  readonly flowState?: import("../app/GameFlowMachine").GameFlowState;
  readonly lastRespawn?: { readonly x: number; readonly y: number; readonly velocityX: number; readonly velocityY: number };
}

export interface GameTestTarget {
  readonly diagnostics: () => PlayerDiagnostic;
  setInput(input: Partial<InputSnapshot>): void;
  teleportPlayer(x: number, y: number): void;
  forceFall(): void;
  activateCheckpoint(): void;
  defeatEnemy(): void;
  fireProjectileAt(x: number, y: number, velocityX: number): void;
  collectItem(): void;
  reachGoal(): void;
  startFixedMovementScenario(): void;
}

export class GameTestInputSource implements InputSource {
  private snapshot: InputSnapshot = {
    moveAxis: 0,
    jumpPressed: false,
    jumpHeld: false,
    pausePressed: false,
    restartPressed: false,
  };
  private jumpRevision = 0;

  public set(input: Partial<InputSnapshot>): void {
    const jumpPressed = input.jumpPressed ?? false;
    if (jumpPressed) {
      this.jumpRevision += 1;
    }
    this.snapshot = { ...this.snapshot, ...input, jumpPressed };
  }

  public sample(): InputSnapshot {
    const snapshot = this.snapshot;
    this.snapshot = { ...this.snapshot, jumpPressed: false, pausePressed: false, restartPressed: false };
    return snapshot;
  }

  public getEdgeRevisions(): InputEdgeRevisions {
    return { jumpPressed: this.jumpRevision, pausePressed: 0, restartPressed: 0 };
  }

  public dispose(): void {
    this.snapshot = { moveAxis: 0, jumpPressed: false, jumpHeld: false, pausePressed: false, restartPressed: false };
  }
}

export class GameTestHarness {
  public constructor(private readonly target: GameTestTarget) {}

  public publish(): void {
    window.__GAME_DIAGNOSTICS__ = { player: this.target.diagnostics() };
  }

  public setInput(input: Partial<InputSnapshot>): void {
    this.target.setInput(input);
  }

  public teleportPlayer(x: number, y: number): void {
    this.target.teleportPlayer(x, y);
  }

  public forceFall(): void {
    this.target.forceFall();
  }

  public activateCheckpoint(): void {
    this.target.activateCheckpoint();
  }

  public defeatEnemy(): void {
    this.target.defeatEnemy();
  }

  public fireProjectileAt(x: number, y: number, velocityX: number): void {
    this.target.fireProjectileAt(x, y, velocityX);
  }

  public collectItem(): void {
    this.target.collectItem();
  }

  public reachGoal(): void {
    this.target.reachGoal();
  }

  public startFixedMovementScenario(): void {
    this.target.startFixedMovementScenario();
  }
}
