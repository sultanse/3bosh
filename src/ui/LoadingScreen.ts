import { Control } from "@babylonjs/gui/2D/controls/control";
import type { UiRoot } from "./UiRoot";

export class LoadingScreen {
  public constructor(root: UiRoot) {
    const overlay = root.createOverlay("loading-overlay");
    const label = root.createText("loading-title", root.localization.t("loadingLevel"), 30);
    label.width = "80%";
    label.height = "72px";
    label.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    label.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
    root.add(overlay, label);
  }
}
