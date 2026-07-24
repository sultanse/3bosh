import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
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
import { GameFlowMachine } from "../app/GameFlowMachine";
import { LevelSession } from "../app/LevelSession";
import {
  GameTestInputSource,
  type GameTestTarget,
  type PlayerDiagnostic,
} from "../dev/GameTestHarness";
import { TypedEventBus, type GameEvents } from "../core/TypedEventBus";
import type { DisposableLike } from "../core/DisposableBag";
import { SideCameraController } from "../gameplay/camera/SideCameraController";
import {
  PlayerController,
  type PlayerMotorCommand,
} from "../gameplay/player/PlayerController";
import { PlayerHealth } from "../gameplay/player/PlayerHealth";
import { PlayerView } from "../gameplay/player/PlayerView";
import { EnemyView } from "../gameplay/enemies/EnemyView";
import { EnemyController } from "../gameplay/enemies/EnemyController";
import { PatrolEnemy } from "../gameplay/enemies/PatrolEnemy";
import { ShooterEnemy } from "../gameplay/enemies/ShooterEnemy";
import { InteractionSystem } from "../gameplay/interactions/InteractionSystem";
import type { ProjectileVisual } from "../gameplay/projectiles/Projectile";
import { ProjectilePool } from "../gameplay/projectiles/ProjectilePool";
import { LevelBuilder, type BuiltLevel } from "../gameplay/level/LevelBuilder";
import { LEVEL_ONE } from "../gameplay/level/LevelOne";
import type { InputSnapshot } from "../input/InputAction";
import { InputManager } from "../input/InputManager";
import { KeyboardInputSource } from "../input/KeyboardInputSource";
import { CollisionLayer, CollisionMask } from "../physics/CollisionLayers";
import { HavokWorld } from "../physics/HavokWorld";
import {
  type CharacterMotionSnapshot,
  PhysicsCharacterAdapter,
} from "../physics/PhysicsCharacterAdapter";
import { PhysicsContactAdapter } from "../physics/PhysicsContactAdapter";

const createProjectileVisual = (scene: Scene, index: number): ProjectileVisual => {
  const mesh = MeshBuilder.CreateSphere(`enemy-projectile-${index}`, { diameter: 0.34 }, scene);
  const material = new StandardMaterial(`enemy-projectile-material-${index}`, scene);
  material.diffuseColor = new Color3(1, 0.67, 0.16);
  material.specularColor = Color3.Black();
  mesh.material = material;
  mesh.isVisible = false;
  const aggregate = new PhysicsAggregate(
    mesh,
    PhysicsShapeType.SPHERE,
    { mass: 0, isTriggerShape: true },
    scene,
  );
  aggregate.shape.filterMembershipMask = CollisionLayer.trigger;
  aggregate.shape.filterCollideMask = 0;
  return {
    get position() { return mesh.position; },
    setActive: (active) => { mesh.isVisible = active; },
    setPosition: (position) => { mesh.position.copyFrom(position); },
    setVelocity: () => undefined,
    setCollisionEnabled: (enabled) => { aggregate.shape.filterCollideMask = enabled ? CollisionMask.trigger : 0; },
    dispose: () => { aggregate.dispose(); mesh.dispose(false, true); },
  };
};

export interface LevelSceneOptions {
  readonly testMode: boolean;
}

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
  private readonly levelSession: LevelSession;
  private readonly level: BuiltLevel;
  private readonly contactAdapter: PhysicsContactAdapter;
  private readonly interactions = new InteractionSystem({
    stompMinDownSpeed: GAME_CONFIG.enemies.stompMinDownSpeed,
    stompTolerance: GAME_CONFIG.enemies.stompTolerance,
  });
  private readonly enemies = new Map<string, EnemyController>();
  private readonly enemyViews = new Map<string, EnemyView>();
  private readonly projectilePool: ProjectilePool;
  private readonly flow = new GameFlowMachine("loadingLevel");
  private readonly playerBoundsProxy: ReturnType<typeof MeshBuilder.CreateBox>;
  private readonly testInput: GameTestInputSource | undefined;
  private readonly beforeStepObserver: Observer<Scene>;
  private readonly afterStepObserver: Observer<Scene>;
  private readonly disposeObserver: Observer<Scene>;
  private lastMotion: CharacterMotionSnapshot | undefined;
  private previousStepMotion: CharacterMotionSnapshot | undefined;
  private fixedSteps = 0;
  private elapsedSeconds = 0;
  private jumpApexY = Number.NEGATIVE_INFINITY;
  private fixedStep180: { readonly x: number; readonly jumpApexY: number } | undefined;
  private scheduledJumpAtStep: number | undefined;
  private projectilesFired = 0;
  private readonly projectileFireTimes: number[] = [];
  private readonly seenTutorialIds = new Set<string>();
  private lastProjectileContactReason: "world" | "player" | undefined;
  private lastProjectileContactAtSeconds: number | undefined;
  private lastProjectileReleasedAtSeconds: number | undefined;
  private lastProjectileDisabledAndReserved: boolean | undefined;
  private stompBounceCount = 0;
  private playerFacing: -1 | 1 = 1;
  private queuedJumpKind: PlayerMotorCommand["jumpKind"] = null;
  private previousAspect = 0;
  private lastRespawn: { readonly x: number; readonly y: number; readonly velocityX: number; readonly velocityY: number } | undefined;
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
    this.level = LevelBuilder.build(scene, LEVEL_ONE);
    this.adapter = PhysicsCharacterAdapter.create(
      scene,
      new Vector3(LEVEL_ONE.spawn.x, LEVEL_ONE.spawn.y, LEVEL_ONE.spawn.z),
    );
    this.contactAdapter = new PhysicsContactAdapter(this.world.plugin);
    let projectileIndex = 0;
    this.projectilePool = new ProjectilePool(
      GAME_CONFIG.enemies.projectileCapacity,
      () => createProjectileVisual(scene, projectileIndex++),
    );
    this.playerBoundsProxy = MeshBuilder.CreateBox(
      "player-trigger-proxy",
      { width: GAME_CONFIG.player.radius * 2, height: GAME_CONFIG.player.height, depth: GAME_CONFIG.player.radius * 2 },
      scene,
    );
    this.playerBoundsProxy.isVisible = false;
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
    this.levelSession = new LevelSession(
      { id: "spawn-sunset-workshop", position: LEVEL_ONE.spawn },
      this.events,
      this.health,
      () => this.elapsedSeconds,
    );
    this.flow.transition("playing");
    const cameraCenter = new Vector3(0, 3, -20);
    const visualCamera = SideCameraController.createCamera(scene, "level-camera", cameraCenter, GAME_CONFIG.camera.verticalSize);
    const aspect = scene.getEngine().getRenderWidth() / Math.max(1, scene.getEngine().getRenderHeight());
    this.previousAspect = aspect;
    this.camera = new SideCameraController({
      bounds: LEVEL_ONE.cameraBounds,
      center: cameraCenter,
      halfWidth: (GAME_CONFIG.camera.verticalSize / 2) * aspect,
      halfHeight: GAME_CONFIG.camera.verticalSize / 2,
      deadZoneWidth: GAME_CONFIG.camera.deadZoneWidth,
      deadZoneHeight: GAME_CONFIG.camera.deadZoneHeight,
      damping: GAME_CONFIG.camera.damping,
      camera: visualCamera,
    });
    this.createEnemies();
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
        health: this.health.current,
        score: this.levelSession.snapshot.score,
        collectibles: this.levelSession.snapshot.collectibles,
        defeatedEnemies: [...this.enemies.values()].filter((enemy) => enemy.defeated).length,
        activeProjectiles: this.projectilePool.activeCount,
        inactiveReservedProjectiles: this.projectilePool.inactiveReservedCount,
        projectilesFired: this.projectilesFired,
        projectileFireTimesSeconds: [...this.projectileFireTimes],
        stompBounceCount: this.stompBounceCount,
        verticalVelocity: motion?.velocity.y ?? 0,
        cameraShakeSamples: this.camera.shakeSamples,
        ...(this.enemyViews.has("patrol-a")
          ? { patrolPhysicsX: this.enemyViews.get("patrol-a")?.physicsPositionX ?? 0 }
          : {}),
        ...(this.lastProjectileContactReason !== undefined
          ? { lastProjectileContactReason: this.lastProjectileContactReason }
          : {}),
        ...(this.lastProjectileContactAtSeconds !== undefined
          ? { lastProjectileContactAtSeconds: this.lastProjectileContactAtSeconds }
          : {}),
        ...(this.lastProjectileReleasedAtSeconds !== undefined
          ? { lastProjectileReleasedAtSeconds: this.lastProjectileReleasedAtSeconds }
          : {}),
        ...(this.lastProjectileDisabledAndReserved !== undefined
          ? { lastProjectileDisabledAndReserved: this.lastProjectileDisabledAndReserved }
          : {}),
        activeCheckpointId: this.levelSession.snapshot.activeCheckpointId,
        respawnProtected: this.elapsedSeconds < this.respawnProtectionUntil,
        flowState: this.flow.state,
        ...(this.lastRespawn ? { lastRespawn: this.lastRespawn } : {}),
      };
    };
  }

  public get flowState(): GameFlowMachine["state"] {
    return this.flow.state;
  }

  public get gameEvents(): TypedEventBus<GameEvents> {
    return this.events;
  }

  public get hudSnapshot(): { readonly health: number; readonly maxHealth: number; readonly score: number; readonly collectibles: number } {
    const snapshot = this.levelSession.snapshot;
    return {
      health: this.health.current,
      maxHealth: this.health.maximum,
      score: snapshot.score,
      collectibles: snapshot.collectibles,
    };
  }

  public onEvent<K extends keyof GameEvents>(key: K, listener: (payload: GameEvents[K]) => void): DisposableLike {
    return this.events.on(key, listener);
  }

  public pause(): void {
    if (this.flow.state === "playing") this.flow.transition("paused");
  }

  public resume(): void {
    if (this.flow.state === "paused") this.flow.transition("playing");
  }

  public setInput(input: Partial<InputSnapshot>): void {
    this.testInput?.set(input);
  }

  public teleportPlayer(x: number, y: number): void {
    this.adapter.setPosition(new Vector3(x, y, GAME_CONFIG.gameplayZ));
    this.adapter.resetVelocity();
  }

  public forceFall(): void {
    this.adapter.setPosition(new Vector3(0, LEVEL_ONE.fallThresholdY - 1, GAME_CONFIG.gameplayZ));
    this.adapter.resetVelocity();
    this.handleDamage("fall");
  }

  public activateCheckpoint(): void {
    const checkpoint = this.level.checkpoints[0];
    if (checkpoint) this.activateCheckpointById(checkpoint.id);
  }

  public defeatEnemy(): void {
    const enemy = this.enemies.get("patrol-a");
    if (enemy) this.resolveStomp(enemy);
  }

  public fireProjectileAt(x: number, y: number, velocityX: number): void {
    this.spawnProjectile(
      new Vector3(x, y, GAME_CONFIG.gameplayZ),
      new Vector3(velocityX, 0, 0),
    );
  }

  public collectItem(): void {
    this.processItems();
  }

  public reachGoal(): void {
    if (this.levelSession.completeGoal() && this.flow.state === "playing") this.flow.transition("victory");
  }

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
    this.contactAdapter.dispose();
    for (const enemy of this.enemies.values()) enemy.dispose();
    for (const view of this.enemyViews.values()) view.dispose();
    this.projectilePool.dispose();
    this.playerView.dispose();
    this.playerBoundsProxy.dispose();
    this.level.dispose();
    this.adapter.dispose();
  }

  private createEnvironment(): void {
    const sunlight = new DirectionalLight("level-sun", new Vector3(-0.4, -1, 0.35), this.scene);
    sunlight.position.set(4, 9, -6);
    sunlight.intensity = 1.2;
    new HemisphericLight("level-fill", Vector3.Up(), this.scene).intensity = 0.55;
    new ShadowGenerator(512, sunlight);

    for (const z of [-1.5, 1.5]) {
      const wall = this.createStaticBox(`level-depth-wall-${z}`, 132, 20, 0.1, 61, 5, z);
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
    if (this.flow.state === "paused") {
      if (this.input.sample().pausePressed) this.resume();
      return;
    }
    if (this.flow.state !== "playing") return;
    this.fixedSteps += 1;
    this.elapsedSeconds += GAME_CONFIG.fixedStepSeconds;
    this.level.updateMovingPlatforms(GAME_CONFIG.fixedStepSeconds);
    this.level.updateItems(GAME_CONFIG.fixedStepSeconds);
    if (this.fixedSteps === this.scheduledJumpAtStep) {
      this.testInput?.set({ jumpPressed: true });
      this.scheduledJumpAtStep = undefined;
    }
    const input = this.input.sample();
    if (input.pausePressed) {
      this.pause();
      this.events.emit("pauseRequested", undefined);
      return;
    }
    if (input.restartPressed) {
      this.events.emit("restartRequested", undefined);
      return;
    }
    const motion = this.adapter.readMotion(GAME_CONFIG.fixedStepSeconds);
    this.previousStepMotion = motion;
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
    this.updateEnemies(this.lastMotion.position);
  }

  private afterFixedStep(): void {
    if (this.flow.state !== "playing") return;
    const jumpKind = this.queuedJumpKind;
    this.queuedJumpKind = null;
    if (jumpKind !== null) {
      this.events.emit("playerJumped", { kind: jumpKind });
    }
    this.lastMotion = this.adapter.readMotion(GAME_CONFIG.fixedStepSeconds);
    const motion = this.lastMotion;
    if (this.previousStepMotion) {
      this.contactAdapter.capturePlayerStep(this.previousStepMotion, motion);
      this.processEnemyContacts();
    }
    const inactiveReservedBeforeUpdate = this.projectilePool.inactiveReservedCount;
    this.projectilePool.update(GAME_CONFIG.fixedStepSeconds, (position) => this.isProjectileWithinLevel(position));
    if (inactiveReservedBeforeUpdate > 0 && this.projectilePool.inactiveReservedCount === 0) {
      this.lastProjectileReleasedAtSeconds = this.elapsedSeconds;
    }
    this.processProjectileWorldContacts();
    this.processProjectileContacts(motion.position);
    this.jumpApexY = Math.max(this.jumpApexY, motion.position.y);
    if (this.fixedSteps === 180) {
      this.fixedStep180 = { x: motion.position.x, jumpApexY: this.jumpApexY };
    }
    this.playerView.setPosition(motion.position);
    this.playerBoundsProxy.position.copyFrom(motion.position);
    this.playerBoundsProxy.computeWorldMatrix(true);
    this.playerView.setFacing(this.playerFacing === -1 ? "left" : "right");
    this.playerView.setState(this.controller.stateMachine.state);
    this.playerView.update(GAME_CONFIG.fixedStepSeconds);
    const aspect = this.scene.getEngine().getRenderWidth() / Math.max(1, this.scene.getEngine().getRenderHeight());
    if (Math.abs(aspect - this.previousAspect) > Number.EPSILON) {
      this.previousAspect = aspect;
      this.camera.resize(aspect, GAME_CONFIG.camera.verticalSize);
    }
    const cameraCenter = this.camera.update(motion.position, GAME_CONFIG.fixedStepSeconds);
    this.level.parallax.update(cameraCenter.x);
    this.processLevelTriggers();
    this.processTutorialTriggers();
    this.processItems();
  }

  private createEnemies(): void {
    for (const definition of this.level.enemies) {
      const position = new Vector3(definition.position.x, definition.position.y, definition.position.z);
      const enemy = definition.kind === "patrol"
        ? new PatrolEnemy({
            id: definition.id,
            position,
            patrolMinX: definition.patrolMinX,
            patrolMaxX: definition.patrolMaxX,
            speed: definition.speed,
            score: definition.score,
          })
        : new ShooterEnemy({
            id: definition.id,
            position,
            activationDistanceX: definition.activationDistanceX,
            fireIntervalSeconds: definition.fireIntervalSeconds,
            projectileSpeed: definition.projectileSpeed,
            score: definition.score,
            fire: (origin, velocity) => this.spawnProjectile(origin, velocity),
          });
      const view = new EnemyView(this.scene, {
        id: definition.id,
        kind: definition.kind,
        position,
        width: definition.size.width,
        height: definition.size.height,
        depth: definition.size.depth,
      });
      this.enemies.set(enemy.id, enemy);
      this.enemyViews.set(enemy.id, view);
      this.contactAdapter.registerEnemy(
        enemy.id,
        view.triggerBody,
        () => view.bounds(),
        () => enemy.velocity,
        () => enemy.defeated,
      );
    }
  }

  private updateEnemies(playerPosition: Readonly<Vector3>): void {
    for (const enemy of this.enemies.values()) {
      enemy.update({
        stepSeconds: GAME_CONFIG.fixedStepSeconds,
        playerPosition,
        gameplayActive: this.flow.state === "playing",
        worldQueries: {
          isBlockedAhead: () => false,
          hasGroundAhead: (candidate) => this.hasGroundAt(candidate.position.x),
        },
      });
      const view = this.enemyViews.get(enemy.id);
      if (view) {
        view.setPosition(enemy.position);
        if (enemy instanceof PatrolEnemy) view.setFacing(enemy.direction);
      }
    }
  }

  private hasGroundAt(x: number): boolean {
    return this.level.platforms.some((platform) => {
      const bounds = platform.root.getBoundingInfo().boundingBox;
      return x >= bounds.minimumWorld.x && x <= bounds.maximumWorld.x;
    });
  }

  private spawnProjectile(origin: Readonly<Vector3>, velocity: Readonly<Vector3>): void {
    const projectile = this.projectilePool.acquire();
    if (!projectile) return;
    projectile.launch(origin.add(new Vector3(0, 0.2, 0)), velocity, GAME_CONFIG.enemies.projectileLifetimeSeconds);
    this.projectilesFired += 1;
    this.projectileFireTimes.push(this.elapsedSeconds);
    this.events.emit("audioCueRequested", { cue: "projectile-fired" });
  }

  private processEnemyContacts(): void {
    for (const contact of this.contactAdapter.drainPlayerEnemyContacts()) {
      const enemy = this.enemies.get(contact.enemyId);
      if (!enemy) continue;
      const interaction = this.interactions.classify(contact);
      if (interaction === "stomp") {
        this.resolveStomp(enemy);
      } else if (interaction === "side") {
        const knockback = contact.currentPlayerBounds.minX < contact.enemyBounds.minX
          ? -GAME_CONFIG.enemies.sideKnockbackSpeed
          : GAME_CONFIG.enemies.sideKnockbackSpeed;
        this.applyContactDamage("enemy", knockback);
      }
    }
  }

  private resolveStomp(enemy: EnemyController): void {
    const outcome = enemy.takeDamage(1, "stomp");
    if (!outcome.defeated) return;
    this.enemyViews.get(enemy.id)?.setDefeated();
    this.levelSession.addScore(enemy.score);
    this.controller.queueVerticalImpulse(GAME_CONFIG.enemies.stompBounceSpeed);
    this.stompBounceCount += 1;
    this.events.emit("enemyDefeated", { enemyId: enemy.id, scoreDelta: enemy.score });
    this.events.emit("audioCueRequested", { cue: "enemy-defeated" });
    this.camera.shake(0.18, 0.15);
  }

  private processProjectileContacts(playerPosition: Readonly<Vector3>): void {
    for (const projectile of this.projectilePool.activeProjectiles) {
      const dx = projectile.position.x - playerPosition.x;
      const dy = projectile.position.y - playerPosition.y;
      if (Math.abs(dx) > GAME_CONFIG.player.radius + 0.17 || Math.abs(dy) > GAME_CONFIG.player.height / 2 + 0.17) continue;
      this.deactivateProjectile(projectile, "player");
      this.applyContactDamage("projectile", dx < 0 ? GAME_CONFIG.enemies.sideKnockbackSpeed : -GAME_CONFIG.enemies.sideKnockbackSpeed);
    }
  }

  private processProjectileWorldContacts(): void {
    for (const projectile of this.projectilePool.activeProjectiles) {
      if (this.projectileHitsAuthoredPlatform(projectile.position)) this.deactivateProjectile(projectile, "world");
    }
  }

  private deactivateProjectile(
    projectile: import("../gameplay/projectiles/Projectile").Projectile,
    reason: "world" | "player",
  ): void {
    if (!projectile.active) return;
    projectile.deactivateWithGrace();
    this.lastProjectileContactReason = reason;
    this.lastProjectileContactAtSeconds = this.elapsedSeconds;
    this.lastProjectileReleasedAtSeconds = undefined;
    this.lastProjectileDisabledAndReserved = projectile.reserved && !projectile.active;
  }

  private projectileHitsAuthoredPlatform(position: Readonly<Vector3>): boolean {
    return this.level.platforms.some((platform) => this.projectileOverlapsBounds(position, platform.root)) ||
      this.level.movingPlatforms.some((platform) => this.projectileOverlapsBounds(position, platform.root));
  }

  private projectileOverlapsBounds(
    position: Readonly<Vector3>,
    collider: ReturnType<typeof MeshBuilder.CreateBox>,
  ): boolean {
    const radius = 0.17;
    const bounds = collider.getBoundingInfo().boundingBox;
    return position.x >= bounds.minimumWorld.x - radius &&
      position.x <= bounds.maximumWorld.x + radius &&
      position.y >= bounds.minimumWorld.y - radius &&
      position.y <= bounds.maximumWorld.y + radius &&
      position.z >= bounds.minimumWorld.z - radius &&
      position.z <= bounds.maximumWorld.z + radius;
  }

  private isProjectileWithinLevel(position: Readonly<Vector3>): boolean {
    return position.x >= LEVEL_ONE.cameraBounds.minX - 4 &&
      position.x <= LEVEL_ONE.cameraBounds.maxX + 4 &&
      position.y >= LEVEL_ONE.fallThresholdY - 3 &&
      position.y <= LEVEL_ONE.cameraBounds.maxY + 8;
  }

  private applyContactDamage(source: "enemy" | "projectile", horizontalKnockback: number): void {
    const outcome = this.health.damage(1, source, this.elapsedSeconds);
    if (!outcome.applied) return;
    this.playerView.flashDamage(0.2);
    this.controller.queueHorizontalKnockback(horizontalKnockback);
    this.events.emit("audioCueRequested", { cue: "player-hit" });
    if (outcome.died) this.flow.transition("gameOver");
  }

  private respawnProtectionUntil = Number.NEGATIVE_INFINITY;

  private processLevelTriggers(): void {
    if ((this.lastMotion?.position.y ?? 0) < LEVEL_ONE.fallThresholdY) {
      this.handleDamage("fall");
      return;
    }
    for (const hazard of this.level.hazards) {
      if (hazard.update(this.playerBoundsProxy.getBoundingInfo())) {
        this.handleDamage("fall");
        return;
      }
    }
    for (const checkpoint of this.level.checkpoints) {
      if (checkpoint.update(this.playerBoundsProxy.getBoundingInfo())) this.activateCheckpointById(checkpoint.id);
    }
    for (const goal of this.level.goals) {
      if (goal.update(this.playerBoundsProxy.getBoundingInfo()) && this.levelSession.completeGoal()) {
        this.flow.transition("victory");
        return;
      }
    }
  }

  private processItems(): void {
    for (const item of this.level.items) {
      item.tryCollect(this.playerBoundsProxy.getBoundingInfo(), {
        level: this.levelSession,
        health: this.health,
        nowSeconds: this.elapsedSeconds,
      });
    }
  }

  private processTutorialTriggers(): void {
    const position = this.lastMotion?.position;
    if (!position) return;
    for (const tutorial of LEVEL_ONE.tutorialTriggers) {
      if (this.seenTutorialIds.has(tutorial.id)) continue;
      const halfWidth = tutorial.size.width / 2;
      const halfHeight = tutorial.size.height / 2;
      if (Math.abs(position.x - tutorial.position.x) > halfWidth || Math.abs(position.y - tutorial.position.y) > halfHeight) continue;
      this.seenTutorialIds.add(tutorial.id);
      this.events.emit("tutorialRequested", {
        id: tutorial.id,
        messageKey: tutorial.messageKey,
        durationSeconds: tutorial.durationSeconds,
      });
    }
  }

  private activateCheckpointById(checkpointId: string): void {
    const checkpoint = this.level.checkpoints.find((entry) => entry.id === checkpointId);
    if (!checkpoint) return;
    this.levelSession.activateCheckpoint({
      id: checkpoint.id,
      position: checkpoint.definition.respawnPosition,
    });
  }

  private handleDamage(source: "fall"): void {
    if (this.flow.state !== "playing") return;
    const outcome = this.health.damage(1, source, this.elapsedSeconds);
    if (!outcome.applied) return;
    this.playerView.flashDamage(0.2);
    if (outcome.died) {
      this.flow.transition("gameOver");
      return;
    }
    const respawn = this.levelSession.snapshot.activeCheckpointPosition;
    this.controller.resetMotion();
    this.health.resumeAfterRespawn();
    this.adapter.setPosition(new Vector3(respawn.x, respawn.y, respawn.z));
    this.adapter.resetVelocity();
    this.lastRespawn = { x: respawn.x, y: respawn.y, velocityX: 0, velocityY: 0 };
    this.respawnProtectionUntil = this.elapsedSeconds + GAME_CONFIG.player.respawnProtectionSeconds;
    this.health.grantInvulnerability(GAME_CONFIG.player.respawnProtectionSeconds, this.elapsedSeconds);
    this.events.emit("playerRespawned", { x: respawn.x, y: respawn.y });
  }
}
