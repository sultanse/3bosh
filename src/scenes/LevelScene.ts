import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import type { Observer } from "@babylonjs/core/Misc/observable";
import {
  PhysicsAggregate,
} from "@babylonjs/core/Physics/v2/physicsAggregate";
import { PhysicsShapeType } from "@babylonjs/core/Physics/v2/IPhysicsEnginePlugin";
import type { Scene } from "@babylonjs/core/scene";
import { ShadowGenerator } from "@babylonjs/core/Lights/Shadows/shadowGenerator";
import { GAME_CONFIG } from "../config/GameConfig";
import {
  GameTestInputSource,
  type GameTestTarget,
  type PlayerDiagnostic,
} from "../dev/GameTestHarness";
import { TypedEventBus, type GameEvents } from "../core/TypedEventBus";
import { SideCameraController } from "../gameplay/camera/SideCameraController";
import {
  PlayerController,
  type PlayerMotorCommand,
} from "../gameplay/player/PlayerController";
import { PlayerHealth } from "../gameplay/player/PlayerHealth";
import { PlayerView } from "../gameplay/player/PlayerView";
import type { InputSnapshot } from "../input/InputAction";
import { InputManager } from "../input/InputManager";
import { KeyboardInputSource } from "../input/KeyboardInputSource";
import { CollisionLayer, CollisionMask } from "../physics/CollisionLayers";
import { HavokWorld } from "../physics/HavokWorld";
import {
  type CharacterMotionSnapshot,
  PhysicsCharacterAdapter,
} from "../physics/PhysicsCharacterAdapter";

export interface LevelSceneOptions {
  readonly testMode: boolean;
}

const LEVEL_BOUNDS = { minX: -14, maxX: 30, minY: -2, maxY: 12 } as const;

const applyWorldFilter = (aggregate: PhysicsAggregate): void => {
  aggregate.shape.filterMembershipMask = CollisionLayer.world;
  aggregate.shape.filterCollideMask = CollisionMask.world;
};

export class LevelScene implements GameTestTarget {
  private readonly controller = new PlayerController();
  private readonly adapter: PhysicsCharacterAdapter;
  private readonly playerView: PlayerView;
  private readonly input: InputManager;
  private readonly camera: SideCameraController;
  private readonly health: PlayerHealth;
  private readonly events = new TypedEventBus<GameEvents>();
  private readonly testInput: GameTestInputSource | undefined;
  private readonly beforeStepObserver: Observer<Scene>;
  private readonly afterStepObserver: Observer<Scene>;
  private readonly disposeObserver: Observer<Scene>;
  private lastMotion: CharacterMotionSnapshot | undefined;
  private fixedSteps = 0;
  private elapsedSeconds = 0;
  private jumpApexY = Number.NEGATIVE_INFINITY;
  private fixedStep180: { readonly x: number; readonly jumpApexY: number } | undefined;
  private scheduledJumpAtStep: number | undefined;
  private playerFacing: -1 | 1 = 1;
  private queuedJumpKind: PlayerMotorCommand["jumpKind"] = null;
  private previousAspect = 0;
  private disposed = false;

  private constructor(
    private readonly scene: Scene,
    private readonly world: HavokWorld,
    options: LevelSceneOptions,
  ) {
    // Keep the Havok owner alive for the full scene lifetime.
    void this.world.plugin;
    this.testInput = options.testMode ? new GameTestInputSource() : undefined;
    const keyboard = new KeyboardInputSource();
    this.input = new InputManager(this.testInput ? [keyboard, this.testInput] : [keyboard]);
    this.createEnvironment();
    this.adapter = PhysicsCharacterAdapter.create(scene, new Vector3(0, 1, GAME_CONFIG.gameplayZ));
    this.playerView = new PlayerView(scene);
    this.health = new PlayerHealth(
      GAME_CONFIG.player.maxHealth,
      GAME_CONFIG.player.invulnerabilitySeconds,
      {
        controller: this.controller,
        events: {
          healthChanged: (health, maxHealth) => this.events.emit("healthChanged", { health, maxHealth }),
          shieldChanged: (active, expiresAtSeconds) => this.events.emit("shieldChanged", { active, expiresAtSeconds }),
          damaged: (amount, source, health) => this.events.emit("playerDamaged", { amount, source, health }),
          died: () => this.events.emit("playerDied", undefined),
        },
      },
    );
    const cameraCenter = new Vector3(0, 3, -20);
    const visualCamera = SideCameraController.createCamera(scene, "level-camera", cameraCenter, GAME_CONFIG.camera.verticalSize);
    const aspect = scene.getEngine().getRenderWidth() / Math.max(1, scene.getEngine().getRenderHeight());
    this.previousAspect = aspect;
    this.camera = new SideCameraController({
      bounds: LEVEL_BOUNDS,
      center: cameraCenter,
      halfWidth: (GAME_CONFIG.camera.verticalSize / 2) * aspect,
      halfHeight: GAME_CONFIG.camera.verticalSize / 2,
      deadZoneWidth: GAME_CONFIG.camera.deadZoneWidth,
      deadZoneHeight: GAME_CONFIG.camera.deadZoneHeight,
      damping: GAME_CONFIG.camera.damping,
      camera: visualCamera,
    });
    this.beforeStepObserver = scene.onBeforeStepObservable.add(() => this.beforeFixedStep());
    this.afterStepObserver = scene.onAfterStepObservable.add(() => this.afterFixedStep());
    this.disposeObserver = scene.onDisposeObservable.add(() => this.dispose());
  }

  public static async create(scene: Scene, options: LevelSceneOptions): Promise<LevelScene> {
    const world = await HavokWorld.create(scene);
    return new LevelScene(scene, world, options);
  }

  public get diagnostics(): () => PlayerDiagnostic {
    return () => {
      const motion = this.lastMotion;
      return {
        x: motion?.position.x ?? 0,
        y: motion?.position.y ?? 0,
        z: motion?.position.z ?? GAME_CONFIG.gameplayZ,
        grounded: motion?.support.state === "supported",
        airJumpCount: this.controller.airJumpCount,
        fixedSteps: this.fixedSteps,
        jumpApexY: Number.isFinite(this.jumpApexY) ? this.jumpApexY : 0,
        ...(this.fixedStep180 ? { fixedStep180: this.fixedStep180 } : {}),
      };
    };
  }

  public setInput(input: Partial<InputSnapshot>): void {
    this.testInput?.set(input);
  }

  public teleportPlayer(x: number, y: number): void {
    this.adapter.setPosition(new Vector3(x, y, GAME_CONFIG.gameplayZ));
    this.adapter.resetVelocity();
  }

  public forceFall(): void {
    this.health.damage(1, "fall", this.elapsedSeconds);
    this.adapter.setPosition(new Vector3(0, GAME_CONFIG.fallThresholdY - 1, GAME_CONFIG.gameplayZ));
    this.adapter.resetVelocity();
  }

  public activateCheckpoint(): void {}

  public defeatEnemy(): void {}

  public collectItem(): void {}

  public reachGoal(): void {}

  public startFixedMovementScenario(): void {
    this.fixedSteps = 0;
    this.jumpApexY = Number.NEGATIVE_INFINITY;
    this.fixedStep180 = undefined;
    this.scheduledJumpAtStep = 30;
    this.adapter.setPosition(new Vector3(0, 1, GAME_CONFIG.gameplayZ));
    this.adapter.resetVelocity();
    this.controller.resetMotion();
    this.testInput?.set({ moveAxis: 1 });
  }

  public dispose(): void {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    this.scene.onBeforeStepObservable.remove(this.beforeStepObserver);
    this.scene.onAfterStepObservable.remove(this.afterStepObserver);
    this.scene.onDisposeObservable.remove(this.disposeObserver);
    this.input.dispose();
    this.events.dispose();
    this.playerView.dispose();
    this.adapter.dispose();
  }

  private createEnvironment(): void {
    const sunlight = new DirectionalLight("level-sun", new Vector3(-0.4, -1, 0.35), this.scene);
    sunlight.position.set(4, 9, -6);
    sunlight.intensity = 1.2;
    new HemisphericLight("level-fill", Vector3.Up(), this.scene).intensity = 0.55;
    new ShadowGenerator(512, sunlight);

    this.createStaticBox("level-ground", 40, 1, 2, 8, -0.5);
    this.createStaticBox("level-platform-one", 4, 0.5, 2, 7, 2.2);
    this.createStaticBox("level-platform-two", 3.5, 0.5, 2, 13, 4.4);
    this.createStaticBox("level-platform-three", 4.5, 0.5, 2, 20, 2.8);
    for (const z of [-1.5, 1.5]) {
      const wall = this.createStaticBox(`level-depth-wall-${z}`, 48, 14, 0.1, 8, 5, z);
      wall.isVisible = false;
    }
  }

  private createStaticBox(
    name: string,
    width: number,
    height: number,
    depth: number,
    x: number,
    y: number,
    z: number = GAME_CONFIG.gameplayZ,
  ) {
    const mesh = MeshBuilder.CreateBox(name, { width, height, depth }, this.scene);
    mesh.position.set(x, y, z);
    applyWorldFilter(new PhysicsAggregate(mesh, PhysicsShapeType.BOX, { mass: 0 }, this.scene));
    return mesh;
  }

  private beforeFixedStep(): void {
    this.fixedSteps += 1;
    this.elapsedSeconds += GAME_CONFIG.fixedStepSeconds;
    if (this.fixedSteps === this.scheduledJumpAtStep) {
      this.testInput?.set({ jumpPressed: true });
      this.scheduledJumpAtStep = undefined;
    }
    const input = this.input.sample();
    const motion = this.adapter.readMotion(GAME_CONFIG.fixedStepSeconds);
    const motor = this.controller.update(
      GAME_CONFIG.fixedStepSeconds,
      input,
      motion,
      this.elapsedSeconds,
    );
    this.playerFacing = motor.facing;
    this.queuedJumpKind = motor.jumpKind;
    this.lastMotion = this.adapter.step({
      stepSeconds: GAME_CONFIG.fixedStepSeconds,
      velocityX: motor.velocityX,
      overrideVelocityY: motor.overrideVelocityY,
      applyGravity: true,
    });
  }

  private afterFixedStep(): void {
    const jumpKind = this.queuedJumpKind;
    this.queuedJumpKind = null;
    if (jumpKind !== null) {
      this.events.emit("playerJumped", { kind: jumpKind });
    }
    this.lastMotion = this.adapter.readMotion(GAME_CONFIG.fixedStepSeconds);
    const motion = this.lastMotion;
    this.jumpApexY = Math.max(this.jumpApexY, motion.position.y);
    if (this.fixedSteps === 180) {
      this.fixedStep180 = { x: motion.position.x, jumpApexY: this.jumpApexY };
    }
    this.playerView.setPosition(motion.position);
    this.playerView.setFacing(this.playerFacing === -1 ? "left" : "right");
    this.playerView.setState(this.controller.stateMachine.state);
    this.playerView.update(GAME_CONFIG.fixedStepSeconds);
    const aspect = this.scene.getEngine().getRenderWidth() / Math.max(1, this.scene.getEngine().getRenderHeight());
    if (Math.abs(aspect - this.previousAspect) > Number.EPSILON) {
      this.previousAspect = aspect;
      this.camera.resize(aspect, GAME_CONFIG.camera.verticalSize);
    }
    this.camera.update(motion.position, GAME_CONFIG.fixedStepSeconds);
  }
}
