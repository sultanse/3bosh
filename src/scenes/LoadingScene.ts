import { FreeCamera } from "@babylonjs/core/Cameras/freeCamera";
import type { AbstractEngine } from "@babylonjs/core/Engines/abstractEngine";
import { Color4 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Scene } from "@babylonjs/core/scene";
import type { ManagedScene } from "../app/SceneRouter";
import type { LocalizationService } from "../services/LocalizationService";
import { LoadingScreen } from "../ui/LoadingScreen";
import { UiRoot } from "../ui/UiRoot";

export class LoadingScene implements ManagedScene {
  public readonly name = "loading";
  public readonly scene: Scene;
  public readonly ui: UiRoot;

  private constructor(engine: AbstractEngine, localization: LocalizationService) {
    this.scene = new Scene(engine);
    this.scene.clearColor = new Color4(0.06, 0.12, 0.22, 1);
    new FreeCamera("loading-camera", new Vector3(0, 0, -10), this.scene);
    this.ui = new UiRoot(this.scene, localization);
    new LoadingScreen(this.ui);
  }

  public static async create(engine: AbstractEngine, localization: LocalizationService, signal: AbortSignal): Promise<LoadingScene> {
    if (signal.aborted) throw new DOMException("Navigation aborted", "AbortError");
    const loading = new LoadingScene(engine, localization);
    if (signal.aborted) {
      loading.dispose();
      throw new DOMException("Navigation aborted", "AbortError");
    }
    return loading;
  }

  public render(): void {
    this.scene.render();
  }

  public dispose(): void {
    this.ui.dispose();
    this.scene.dispose();
  }
}
