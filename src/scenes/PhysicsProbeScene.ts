import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import {
  PhysicsEventType,
  PhysicsMotionType,
  PhysicsPrestepType,
  PhysicsShapeType,
} from "@babylonjs/core/Physics/v2/IPhysicsEnginePlugin";
import { PhysicsAggregate } from "@babylonjs/core/Physics/v2/physicsAggregate";
import type { Observer } from "@babylonjs/core/Misc/observable";
import type { Scene } from "@babylonjs/core/scene";
import { GAME_CONFIG } from "../config/GameConfig";
import { CollisionLayer, CollisionMask } from "../physics/CollisionLayers";
import { HavokWorld } from "../physics/HavokWorld";
import {
  type CharacterMotionSnapshot,
  PhysicsCharacterAdapter,
} from "../physics/PhysicsCharacterAdapter";

export interface PhysicsProbeDiagnostics {
  supported: boolean;
  grounded: boolean;
  zDriftWithinTolerance: boolean;
  movingPlatformCarry: boolean;
  platformRideTicks: number;
  platformRelativeOffsetWithinTolerance: boolean;
  enemyTriggerEntered: boolean;
  enemyTriggerExited: boolean;
  duplicateTriggerEvents: boolean;
}

const applyFilter = (
  aggregate: PhysicsAggregate,
  membership: number,
  collide: number,
): void => {
  aggregate.shape.filterMembershipMask = membership;
  aggregate.shape.filterCollideMask = collide;
};

export class PhysicsProbeScene {
  private readonly diagnostics: PhysicsProbeDiagnostics = {
    supported: false,
    grounded: false,
    zDriftWithinTolerance: false,
    movingPlatformCarry: false,
    platformRideTicks: 0,
    platformRelativeOffsetWithinTolerance: false,
    enemyTriggerEntered: false,
    enemyTriggerExited: false,
    duplicateTriggerEvents: false,
  };
  private readonly adapter: PhysicsCharacterAdapter;
  private readonly platform: PhysicsAggregate;
  private readonly trigger: PhysicsAggregate;
  private fixedTicks = 0;
  private zLockTicks = 0;
  private platformTicks = 0;
  private platformRideOffsetX: number | undefined;
  private groundedPositionY: number | undefined;
  private triggerEnterCount = 0;
  private triggerExitCount = 0;
  private platformPhase = 0;
  private disposed = false;
  private beforeStepObserver: Observer<Scene> | undefined;
  private afterStepObserver: Observer<Scene> | undefined;
  private sceneDisposeObserver: Observer<Scene> | undefined;

  private constructor(
    private readonly scene: Scene,
    private readonly world: HavokWorld,
    platform: PhysicsAggregate,
    trigger: PhysicsAggregate,
    adapter: PhysicsCharacterAdapter,
  ) {
    this.platform = platform;
    this.trigger = trigger;
    this.adapter = adapter;
    this.configureScene();
  }

  public static async create(scene: Scene): Promise<PhysicsProbeScene> {
    const world = await HavokWorld.create(scene);
    PhysicsProbeScene.createEnvironment(scene);

    const platformMesh = MeshBuilder.CreateBox(
      "probe-platform",
      { width: 2.4, height: 0.5, depth: 1 },
      scene,
    );
    platformMesh.position.set(5, 1.25, GAME_CONFIG.gameplayZ);
    const platform = new PhysicsAggregate(
      platformMesh,
      PhysicsShapeType.BOX,
      { mass: 0 },
      scene,
    );
    platform.body.setMotionType(PhysicsMotionType.ANIMATED);
    platform.body.setPrestepType(PhysicsPrestepType.TELEPORT);
    applyFilter(platform, CollisionLayer.world, CollisionMask.world);

    const triggerMesh = MeshBuilder.CreateBox(
      "probe-enemy-trigger",
      { width: 1, height: 2, depth: 1 },
      scene,
    );
    triggerMesh.isVisible = false;
    triggerMesh.position.set(0, 1, GAME_CONFIG.gameplayZ);
    const trigger = new PhysicsAggregate(
      triggerMesh,
      PhysicsShapeType.BOX,
      { mass: 0, isTriggerShape: true },
      scene,
    );
    applyFilter(trigger, CollisionLayer.trigger, CollisionMask.trigger);

    const adapter = PhysicsCharacterAdapter.create(scene, new Vector3(0, 3, 0));
    return new PhysicsProbeScene(scene, world, platform, trigger, adapter);
  }

  public dispose(): void {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    if (this.beforeStepObserver) {
      this.scene.onBeforeStepObservable.remove(this.beforeStepObserver);
    }
    if (this.afterStepObserver) {
      this.scene.onAfterStepObservable.remove(this.afterStepObserver);
    }
    if (this.sceneDisposeObserver) {
      this.scene.onDisposeObservable.remove(this.sceneDisposeObserver);
    }
    this.adapter.dispose();
  }

  private static createEnvironment(scene: Scene): void {
    const ground = MeshBuilder.CreateBox(
      "probe-ground",
      { width: 24, height: 1, depth: 2 },
      scene,
    );
    ground.position.set(0, -0.5, GAME_CONFIG.gameplayZ);
    const groundPhysics = new PhysicsAggregate(
      ground,
      PhysicsShapeType.BOX,
      { mass: 0 },
      scene,
    );
    applyFilter(groundPhysics, CollisionLayer.world, CollisionMask.world);

    for (const z of [-1.5, 1.5]) {
      const wall = MeshBuilder.CreateBox(
        `probe-depth-wall-${z}`,
        { width: 24, height: 12, depth: 0.1 },
        scene,
      );
      wall.isVisible = false;
      wall.position.set(0, 5, z);
      const wallPhysics = new PhysicsAggregate(
        wall,
        PhysicsShapeType.BOX,
        { mass: 0 },
        scene,
      );
      applyFilter(wallPhysics, CollisionLayer.world, CollisionMask.world);
    }
  }

  private configureScene(): void {
    const camera = new ArcRotateCamera(
      "probe-camera",
      -Math.PI / 2,
      Math.PI / 2,
      14,
      new Vector3(2.5, 1.5, GAME_CONFIG.gameplayZ),
      this.scene,
    );
    camera.mode = ArcRotateCamera.ORTHOGRAPHIC_CAMERA;
    camera.orthoTop = 7;
    camera.orthoBottom = -3;
    camera.orthoLeft = -6;
    camera.orthoRight = 11;
    new HemisphericLight("probe-light", Vector3.Up(), this.scene);

    this.world.plugin.onTriggerCollisionObservable.add((event) => {
      const touchesProbeTrigger =
        event.collider === this.trigger.body ||
        event.collidedAgainst === this.trigger.body;
      if (!touchesProbeTrigger) {
        return;
      }
      if (event.type === PhysicsEventType.TRIGGER_ENTERED) {
        this.triggerEnterCount += 1;
      }
      if (event.type === PhysicsEventType.TRIGGER_EXITED) {
        this.triggerExitCount += 1;
      }
      this.diagnostics.enemyTriggerEntered = this.triggerEnterCount > 0;
      this.diagnostics.enemyTriggerExited = this.triggerExitCount > 0;
      this.diagnostics.duplicateTriggerEvents =
        this.triggerEnterCount > 1 || this.triggerExitCount > 1;
    });

    this.beforeStepObserver = this.scene.onBeforeStepObservable.add(() =>
      this.onFixedStep(),
    );
    this.afterStepObserver = this.scene.onAfterStepObservable.add(() =>
      this.publishDiagnostics(),
    );
    this.sceneDisposeObserver = this.scene.onDisposeObservable.add(() =>
      this.dispose(),
    );
  }

  private onFixedStep(): void {
    this.fixedTicks += 1;
    const platformDeltaX = this.movePlatform();

    if (this.fixedTicks === 151) {
      this.platformPhase = 0;
      this.platform.transformNode.position.x = 5;
      this.adapter.setPosition(
        new Vector3(
          this.platform.transformNode.position.x,
          2.4,
          GAME_CONFIG.gameplayZ,
        ),
      );
      this.adapter.resetVelocity();
    }
    if (this.fixedTicks === 221) {
      this.adapter.setPosition(new Vector3(-2, 1.1, GAME_CONFIG.gameplayZ));
      this.adapter.resetVelocity();
    }
    const velocityX = this.fixedTicks >= 221 && this.fixedTicks <= 255 ? 8 : 0;
    let motion: CharacterMotionSnapshot;
    if (this.fixedTicks >= 256) {
      this.adapter.setPosition(
        new Vector3(3, this.groundedPositionY ?? 1.1, GAME_CONFIG.gameplayZ),
      );
      this.adapter.resetVelocity();
      motion = this.adapter.readMotion(GAME_CONFIG.fixedStepSeconds);
    } else {
      motion = this.adapter.step({
        stepSeconds: GAME_CONFIG.fixedStepSeconds,
        velocityX,
        overrideVelocityY: null,
      });
    }

    this.diagnostics.supported = motion.support.state === "supported";
    if (this.diagnostics.supported) {
      this.diagnostics.grounded = true;
      this.groundedPositionY ??= motion.position.y;
    }
    if (this.diagnostics.grounded) {
      this.zLockTicks =
        Math.abs(motion.position.z - GAME_CONFIG.gameplayZ) <= GAME_CONFIG.zLockEpsilon
          ? this.zLockTicks + 1
          : 0;
    }
    this.diagnostics.zDriftWithinTolerance = this.zLockTicks >= 120;

    if (this.fixedTicks >= 161 && this.fixedTicks <= 220) {
      const hasPlatformSupport = motion.support.state === "supported";
      const havokCarriesPlatform = hasPlatformSupport && motion.support.isDynamic;
      if (hasPlatformSupport && !havokCarriesPlatform) {
        this.adapter.applyPlatformFallbackDelta(platformDeltaX);
        motion = this.adapter.readMotion(GAME_CONFIG.fixedStepSeconds);
      }
      if (hasPlatformSupport && Math.abs(platformDeltaX) > Number.EPSILON) {
        const relativeOffsetX =
          motion.position.x - this.platform.transformNode.position.x;
        if (this.platformRideOffsetX === undefined) {
          this.platformRideOffsetX = relativeOffsetX;
        }
        this.diagnostics.platformRelativeOffsetWithinTolerance =
          Math.abs(relativeOffsetX - this.platformRideOffsetX) <= 0.05;
        this.platformTicks = this.diagnostics.platformRelativeOffsetWithinTolerance
          ? this.platformTicks + 1
          : 0;
      } else {
        this.platformTicks = 0;
      }
    }
    this.diagnostics.platformRideTicks = this.platformTicks;
    this.diagnostics.movingPlatformCarry = this.platformTicks >= 60;
  }

  private movePlatform(): number {
    if (this.fixedTicks >= 151 && this.fixedTicks <= 160) {
      return 0;
    }
    const previousX = this.platform.transformNode.position.x;
    this.platformPhase += GAME_CONFIG.fixedStepSeconds;
    const x = 5 + 2 * Math.sin(this.platformPhase * Math.PI * 0.5);
    this.platform.transformNode.position.x = x;
    return x - previousX;
  }

  private publishDiagnostics(): void {
    if (import.meta.env.DEV || import.meta.env.MODE === "test") {
      window.__GAME_DIAGNOSTICS__ = { physicsProbe: { ...this.diagnostics } };
    }
  }
}
