import { FreeCamera } from "@babylonjs/core/Cameras/freeCamera";
import type { AbstractEngine } from "@babylonjs/core/Engines/abstractEngine";
import { Color4 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Scene } from "@babylonjs/core/scene";
import type { ManagedScene } from "../app/SceneRouter";
import type { LocalizationService } from "../services/LocalizationService";
import { MainMenu } from "../ui/MainMenu";
import { ErrorScreen } from "../ui/ErrorScreen";
import { UiRoot } from "../ui/UiRoot";

export interface MenuSceneOptions {
  readonly localization: LocalizationService;
  readonly start: () => void;
  readonly clearSavedData: () => void;
  readonly retry?: () => void;
}

export class MenuScene implements ManagedScene {
  public readonly name = "menu";
  public readonly ui: UiRoot;
  public readonly scene: Scene;
  private readonly menu: MainMenu;

  private constructor(engine: AbstractEngine, options: MenuSceneOptions) {
    this.scene = new Scene(engine);
    this.scene.clearColor = new Color4(0.09, 0.15, 0.25, 1);
    new FreeCamera("menu-camera", new Vector3(0, 0, -10), this.scene);
    this.ui = new UiRoot(this.scene, options.localization);
    this.menu = new MainMenu(this.ui, {
      start: options.start,
      clearSavedData: options.clearSavedData,
    });
    if (options.retry !== undefined) new ErrorScreen(this.ui, options.retry);
  }

  public static async create(engine: AbstractEngine, options: MenuSceneOptions, signal: AbortSignal): Promise<MenuScene> {
    if (signal.aborted) throw new DOMException("Navigation aborted", "AbortError");
    const menu = new MenuScene(engine, options);
    if (signal.aborted) {
      menu.dispose();
      throw new DOMException("Navigation aborted", "AbortError");
    }
    return menu;
  }

  public render(): void {
    this.scene.render();
  }

  public dispose(): void {
    this.menu.dispose();
    this.ui.dispose();
    this.scene.dispose();
  }
}
