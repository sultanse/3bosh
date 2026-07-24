import { Control } from "@babylonjs/gui/2D/controls/control";
import { StackPanel } from "@babylonjs/gui/2D/controls/stackPanel";
import type { UiRoot } from "./UiRoot";

export interface MainMenuCallbacks {
  readonly start: () => void;
  readonly clearSavedData: () => void;
}

export class MainMenu {
  private readonly panel: StackPanel;
  private readonly settings: StackPanel;

  public constructor(root: UiRoot, callbacks: MainMenuCallbacks) {
    this.panel = root.createPanel("main-menu");
    this.panel.width = "340px";
    this.panel.spacing = 10;
    const title = root.createText("menu-title", root.localization.t("gameTitle"), 42);
    title.height = "74px";
    title.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    root.add(this.panel, title);
    root.add(this.panel, root.createButton("start-game", root.localization.t("startGame"), callbacks.start));
    root.add(this.panel, root.createButton("open-settings", root.localization.t("menuSettings"), () => this.showSettings()));
    this.settings = root.createPanel("settings-menu");
    this.settings.width = "340px";
    this.settings.spacing = 10;
    const settingsTitle = root.createText("settings-title", root.localization.t("menuSettings"), 36);
    settingsTitle.height = "64px";
    settingsTitle.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    root.add(this.settings, settingsTitle);
    const audioTitle = root.createText("settings-audio-title", root.localization.t("audioTitle"), 23);
    audioTitle.height = "38px";
    audioTitle.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    root.add(this.settings, audioTitle);
    root.add(this.settings, root.createButton("clear-saved-data", root.localization.t("clearSavedData"), callbacks.clearSavedData));
    root.add(this.settings, root.createButton("close-settings", root.localization.t("returnToMenu"), () => this.hideSettings()));
    this.settings.isVisible = false;
  }

  public dispose(): void {
    this.panel.isVisible = false;
    this.settings.isVisible = false;
  }

  private showSettings(): void {
    this.panel.isVisible = false;
    this.settings.isVisible = true;
  }

  private hideSettings(): void {
    this.settings.isVisible = false;
    this.panel.isVisible = true;
  }
}
