import { FreeCamera } from "@babylonjs/core/Cameras/freeCamera";
import { Engine } from "@babylonjs/core/Engines/engine";
import type { EngineOptions } from "@babylonjs/core/Engines/thinEngine";
import { Color4 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Scene } from "@babylonjs/core/scene";

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
  private engine: Engine | undefined;
  private scene: Scene | undefined;

  public constructor(options: GameAppOptions) {
    this.canvas = options.canvas;
  }

  public async start(): Promise<void> {
    if (this.engine) {
      return;
    }

    const engine = new Engine(this.canvas, true, engineOptions);
    const scene = new Scene(engine);
    scene.clearColor = new Color4(0.06, 0.12, 0.22, 1);
    new FreeCamera("camera", Vector3.Zero(), scene);

    this.engine = engine;
    this.scene = scene;
    window.addEventListener("resize", this.handleResize);
    engine.runRenderLoop(() => scene.render());
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
}
