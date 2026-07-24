import { Control } from "@babylonjs/gui/2D/controls/control";
import { Rectangle } from "@babylonjs/gui/2D/controls/rectangle";
import { StackPanel } from "@babylonjs/gui/2D/controls/stackPanel";
import type { UiRoot } from "./UiRoot";

export interface EndScreenCallbacks {
  readonly restart: () => void;
  readonly menu: () => void;
}

export class EndScreen {
  private readonly overlay: Rectangle;

  public constructor(root: UiRoot, outcome: "victory" | "gameOver", callbacks: EndScreenCallbacks) {
    this.overlay = root.createOverlay(`${outcome}-overlay`);
    const panel = new StackPanel(`${outcome}-screen`);
    panel.width = "350px";
    panel.spacing = 10;
    panel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    panel.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
    root.add(this.overlay, panel);
    const title = root.createText(
      `${outcome}-title`,
      root.localization.t(outcome === "victory" ? "victoryMessage" : "gameOverMessage"),
      34,
    );
    title.height = "94px";
    title.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    root.add(panel, title);
    root.add(panel, root.createButton(`${outcome}-restart`, root.localization.t("restartLevel"), callbacks.restart));
    root.add(panel, root.createButton(`${outcome}-menu`, root.localization.t("returnToMenu"), callbacks.menu));
  }

  public dispose(): void {
    this.overlay.isVisible = false;
  }
}
