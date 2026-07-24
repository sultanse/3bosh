import { FreeCamera } from "@babylonjs/core/Cameras/freeCamera";
import { Engine } from "@babylonjs/core/Engines/engine";
import type { AbstractEngine } from "@babylonjs/core/Engines/abstractEngine";
import type { EngineOptions } from "@babylonjs/core/Engines/thinEngine";
import { Color4 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Scene } from "@babylonjs/core/scene";
import { DeterministicTestEngine } from "../dev/DeterministicTestEngine";
import { GameTestHarness } from "../dev/GameTestHarness";
import { BootScene } from "../scenes/BootScene";
import { LevelScene } from "../scenes/LevelScene";
import { PhysicsProbeScene } from "../scenes/PhysicsProbeScene";

export interface GameAppOptions {
  canvas: HTMLCanvasElement;
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
  private engine: AbstractEngine | undefined;
  private scene: Scene | undefined;

  public constructor(options: GameAppOptions) {
    this.canvas = options.canvas;
  }

  public async start(): Promise<void> {
    if (this.engine) {
      return;
    }

    const query = new URLSearchParams(window.location.search);
    const probe = query.get("probe");
    const level = query.get("level");
    const renderFps = Number(query.get("renderFps"));
    const isPhysicsProbe = probe === "physics";
    const isTestLevel = level === "test";
    const testBuild = import.meta.env.MODE === "test";
    const attachHarness = (import.meta.env.DEV || testBuild) && isTestLevel;
    const engine =
      (isPhysicsProbe || isTestLevel) && testBuild && Number.isFinite(renderFps) && renderFps > 0
        ? new DeterministicTestEngine(this.canvas, renderFps, engineOptions)
        : new Engine(this.canvas, true, engineOptions);
    const scene = new Scene(engine);
    scene.clearColor = new Color4(0.06, 0.12, 0.22, 1);
    const boot = new BootScene(scene);

    this.engine = engine;
    this.scene = scene;
    window.addEventListener("resize", this.handleResize);
    try {
      if (isPhysicsProbe) {
        await PhysicsProbeScene.create(scene);
      } else if (isTestLevel) {
        const levelScene = await LevelScene.create(scene, { testMode: attachHarness });
        if (attachHarness) {
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
      if (engine instanceof DeterministicTestEngine) {
        this.renderDeterministicFrame(engine, scene);
      } else {
        engine.runRenderLoop(() => scene.render());
      }
    } catch (error: unknown) {
      boot.markFailed();
      this.dispose();
      throw error;
    }
  }

  public dispose(): void {
    const { engine, scene } = this;

    if (!engine) {
      return;
    }

    window.removeEventListener("resize", this.handleResize);
    engine.stopRenderLoop();
    scene?.dispose();
    engine.dispose();
    this.scene = undefined;
    this.engine = undefined;
  }

  private readonly handleResize = (): void => {
    this.engine?.resize();
  };

  private renderDeterministicFrame(
    engine: DeterministicTestEngine,
    scene: Scene,
  ): void {
    const render = (): void => {
      if (this.engine !== engine) {
        return;
      }
      engine.beginFrame();
      scene.render();
      engine.endFrame();
      window.requestAnimationFrame(render);
    };
    window.requestAnimationFrame(render);
  }
}
