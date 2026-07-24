import { Control } from "@babylonjs/gui/2D/controls/control";
import { StackPanel } from "@babylonjs/gui/2D/controls/stackPanel";
import type { UiRoot } from "./UiRoot";

export class ErrorScreen {
  public constructor(root: UiRoot, retry: () => void) {
    const overlay = root.createOverlay("load-error-overlay");
    const panel = new StackPanel("load-error-panel");
    panel.width = "340px";
    panel.spacing = 10;
    panel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    panel.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
    root.add(overlay, panel);
    const title = root.createText("load-error-title", root.localization.t("errorLoadLevel"), 30);
    title.height = "84px";
    title.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    root.add(panel, title);
    root.add(panel, root.createButton("retry-level-load", root.localization.t("gameOverRetry"), retry));
  }
}
