import { Control } from "@babylonjs/gui/2D/controls/control";
import { Rectangle } from "@babylonjs/gui/2D/controls/rectangle";
import { StackPanel } from "@babylonjs/gui/2D/controls/stackPanel";
import type { UiRoot } from "./UiRoot";

export interface PauseMenuCallbacks {
  readonly resume: () => void;
  readonly restart: () => void;
  readonly menu: () => void;
}

export class PauseMenu {
  private readonly overlay: Rectangle;
  private readonly panel: StackPanel;

  public constructor(root: UiRoot, callbacks: PauseMenuCallbacks) {
    this.overlay = root.createOverlay("pause-overlay");
    this.panel = new StackPanel("pause-menu");
    this.panel.width = "340px";
    this.panel.spacing = 10;
    this.panel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    this.panel.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
    root.add(this.overlay, this.panel);
    const title = root.createText("pause-title", root.localization.t("pause"), 38);
    title.height = "64px";
    title.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    root.add(this.panel, title);
    root.add(this.panel, root.createButton("resume", root.localization.t("resume"), callbacks.resume));
    root.add(this.panel, root.createButton("restart-level", root.localization.t("restartLevel"), callbacks.restart));
    root.add(this.panel, root.createButton("return-to-menu", root.localization.t("returnToMenu"), callbacks.menu));
    this.setVisible(false);
  }

  public setVisible(visible: boolean): void {
    this.overlay.isVisible = visible;
  }

  public dispose(): void {
    this.overlay.isVisible = false;
  }
}
