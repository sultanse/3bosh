import { FreeCamera } from "@babylonjs/core/Cameras/freeCamera";
import { Engine } from "@babylonjs/core/Engines/engine";
import type { AbstractEngine } from "@babylonjs/core/Engines/abstractEngine";
import type { EngineOptions } from "@babylonjs/core/Engines/thinEngine";
import { Color4 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Scene } from "@babylonjs/core/scene";
import { DeterministicTestEngine } from "../dev/DeterministicTestEngine";
import { GameTestHarness } from "../dev/GameTestHarness";
import { LevelUi } from "../ui/LevelUi";
import type { UiDiagnosticsSnapshot } from "../ui/UiRoot";
import { SaveService } from "../services/SaveService";
import { LocalizationService } from "../services/LocalizationService";
import { BootScene } from "../scenes/BootScene";
import { LevelScene } from "../scenes/LevelScene";
import { MenuScene } from "../scenes/MenuScene";
import { PhysicsProbeScene } from "../scenes/PhysicsProbeScene";
import { GameFlowMachine, type GameFlowState } from "./GameFlowMachine";
import { SceneRouter, type ManagedScene } from "./SceneRouter";

export interface GameAppOptions {
  canvas: HTMLCanvasElement;
}

interface RenderableScene extends ManagedScene {
  render(): void;
  readonly uiSnapshot?: UiDiagnosticsSnapshot;
  readonly level?: LevelScene;
  invokeUi?(id: string): boolean;
}

const engineOptions: EngineOptions = {
  deterministicLockstep: true,
  timeStep: 1 / 60,
  lockstepMaxSteps: 4,
  stencil: true,
  audioEngine: true,
  adaptToDeviceRatio: true,
};

export class GameApp {
  private readonly canvas: HTMLCanvasElement;
  private readonly flow = new GameFlowMachine("boot");
  private readonly saves = new SaveService(window.localStorage);
  private readonly localization = new LocalizationService(this.saves.load().locale);
  private engine: AbstractEngine | undefined;
  private scene: Scene | undefined;
  private router: SceneRouter | undefined;

  public constructor(options: GameAppOptions) {
    this.canvas = options.canvas;
  }

  public async start(): Promise<void> {
    if (this.engine) return;

    const query = new URLSearchParams(window.location.search);
    const probe = query.get("probe");
    const level = query.get("level");
    const renderFps = Number(query.get("renderFps"));
    const isPhysicsProbe = probe === "physics";
    const isTestLevel = level === "test";
    const testBuild = import.meta.env.MODE === "test";
    const engine =
      (isPhysicsProbe || isTestLevel) && testBuild && Number.isFinite(renderFps) && renderFps > 0
        ? new DeterministicTestEngine(this.canvas, renderFps, engineOptions)
        : new Engine(this.canvas, true, engineOptions);
    this.engine = engine;
    window.addEventListener("resize", this.handleResize);

    try {
      if (isPhysicsProbe || isTestLevel) {
        await this.startLegacyScene(engine, isPhysicsProbe, isTestLevel, testBuild);
      } else {
        await this.startRoutedGame(engine, testBuild || import.meta.env.DEV);
      }
    } catch (error: unknown) {
      this.dispose();
      throw error;
    }
  }

  public dispose(): void {
    const { engine, scene } = this;
    if (!engine) return;
    window.removeEventListener("resize", this.handleResize);
    engine.stopRenderLoop();
    this.router?.dispose();
    this.router = undefined;
    scene?.dispose();
    engine.dispose();
    this.scene = undefined;
    this.engine = undefined;
    delete window.__GAME_UI_HARNESS__;
  }

  private async startLegacyScene(
    engine: AbstractEngine,
    isPhysicsProbe: boolean,
    isTestLevel: boolean,
    testBuild: boolean,
  ): Promise<void> {
    const scene = new Scene(engine);
    scene.clearColor = new Color4(0.06, 0.12, 0.22, 1);
    const boot = new BootScene(scene);
    this.scene = scene;
    if (isPhysicsProbe) {
      await PhysicsProbeScene.create(scene);
    } else if (isTestLevel) {
      const levelScene = await LevelScene.create(scene, { testMode: testBuild || import.meta.env.DEV });
      if (testBuild || import.meta.env.DEV) {
        const harness = new GameTestHarness(levelScene);
        window.__GAME_TEST_HARNESS__ = harness;
        scene.onAfterStepObservable.add(() => harness.publish());
        scene.onDisposeObservable.add(() => {
          delete window.__GAME_TEST_HARNESS__;
          delete window.__GAME_DIAGNOSTICS__;
        });
      }
    } else {
      new FreeCamera("camera", Vector3.Zero(), scene);
    }
    boot.markReady();
    this.runScene(engine, scene);
  }

  private async startRoutedGame(engine: AbstractEngine, exposeHarness: boolean): Promise<void> {
    this.router = new SceneRouter({
      menu: {
        create: async (signal) => this.createMenuScene(engine, signal),
      },
      level: {
        create: async (signal) => this.createLevelScene(engine, signal),
      },
    });
    this.flow.transition("menu");
    await this.router.goTo("menu");
    if (exposeHarness) this.attachUiHarness();
    const canvas = engine.getRenderingCanvas();
    canvas?.setAttribute("data-boot-status", "ready");
    engine.runRenderLoop(() => this.renderActiveScene());
  }

  private async createLevelScene(engine: AbstractEngine, signal: AbortSignal): Promise<RenderableScene> {
    if (signal.aborted) throw new DOMException("Navigation aborted", "AbortError");
    const scene = new Scene(engine);
    scene.clearColor = new Color4(0.06, 0.12, 0.22, 1);
    let level: LevelScene | undefined;
    let ui: LevelUi | undefined;
    let restartSubscription: { dispose(): void } | undefined;
    try {
      level = await LevelScene.create(scene, { testMode: false });
      if (signal.aborted) throw new DOMException("Navigation aborted", "AbortError");
      ui = new LevelUi(scene, this.localization, level.gameEvents, level.hudSnapshot, {
        resume: () => this.resumeLevel(),
        restart: () => { void this.startLevel(); },
        menu: () => { void this.showMenu(); },
      });
      restartSubscription = level.onEvent("restartRequested", () => { void this.startLevel(); });
      const boundLevel = level;
      const boundUi = ui;
      return {
        name: "level",
        level: boundLevel,
        get uiSnapshot() { return boundUi.root.snapshot(); },
        invokeUi: (id) => boundUi.root.invoke(id),
        render: () => {
          this.syncFlow(boundLevel);
          boundUi.sync(boundLevel.flowState);
          scene.render();
        },
        dispose: () => {
          restartSubscription?.dispose();
          boundUi.dispose();
          boundLevel.dispose();
          scene.dispose();
        },
      };
    } catch (error: unknown) {
      restartSubscription?.dispose();
      ui?.dispose();
      level?.dispose();
      scene.dispose();
      throw error;
    }
  }

  private async createMenuScene(engine: AbstractEngine, signal: AbortSignal): Promise<RenderableScene> {
    const menu = await MenuScene.create(engine, {
      localization: this.localization,
      start: () => { void this.startLevel(); },
      clearSavedData: () => this.saves.clear(),
    }, signal);
    return {
      name: menu.name,
      get uiSnapshot() { return menu.ui.snapshot(); },
      invokeUi: (id) => menu.ui.invoke(id),
      render: () => menu.render(),
      dispose: () => menu.dispose(),
    };
  }

  private async startLevel(): Promise<void> {
    if (!this.router) return;
    if (this.flow.state === "menu" || this.flow.state === "victory" || this.flow.state === "gameOver" || this.flow.state === "playing" || this.flow.state === "paused") {
      this.flow.transition("loadingLevel");
    }
    await this.router.goTo("level");
    if (this.flow.state === "loadingLevel") this.flow.transition("playing");
  }

  private async showMenu(): Promise<void> {
    if (!this.router) return;
    if (this.flow.state === "paused") this.flow.transition("menu");
    else if (this.flow.state === "victory" || this.flow.state === "gameOver" || this.flow.state === "loadingLevel") this.flow.transition("menu");
    await this.router.goTo("menu");
  }

  private resumeLevel(): void {
    const level = this.activeScene()?.level;
    level?.resume();
    if (this.flow.state === "paused") this.flow.transition("playing");
  }

  private syncFlow(level: LevelScene): void {
    const state = level.flowState;
    if (state === this.flow.state || this.flow.state === "loadingLevel") return;
    if (this.flow.state === "playing" && (state === "paused" || state === "victory" || state === "gameOver")) {
      this.flow.transition(state);
    } else if (this.flow.state === "paused" && state === "playing") {
      this.flow.transition("playing");
    }
  }

  private activeScene(): RenderableScene | undefined {
    return this.router?.current as RenderableScene | undefined;
  }

  private renderActiveScene(): void {
    this.activeScene()?.render();
  }

  private runScene(engine: AbstractEngine, scene: Scene): void {
    if (engine instanceof DeterministicTestEngine) {
      this.renderDeterministicFrame(engine, scene);
    } else {
      engine.runRenderLoop(() => scene.render());
    }
  }

  private attachUiHarness(): void {
    window.__GAME_UI_HARNESS__ = {
      diagnostics: () => ({ flowState: this.flow.state, ui: this.activeScene()?.uiSnapshot }),
      activate: (id) => this.activeScene()?.invokeUi?.(id) ?? false,
      forceVictory: () => this.activeScene()?.level?.reachGoal(),
      forceGameOver: () => {
        const level = this.activeScene()?.level;
        level?.forceFall();
        level?.forceFall();
        level?.forceFall();
      },
    };
  }

  private readonly handleResize = (): void => {
    this.engine?.resize();
  };

  private renderDeterministicFrame(engine: DeterministicTestEngine, scene: Scene): void {
    const render = (): void => {
      if (this.engine !== engine) return;
      engine.beginFrame();
      scene.render();
      engine.endFrame();
      window.requestAnimationFrame(render);
    };
    window.requestAnimationFrame(render);
  }
}

export type GameUiHarnessDiagnostics = {
  readonly flowState: GameFlowState;
  readonly ui: UiDiagnosticsSnapshot | undefined;
};
