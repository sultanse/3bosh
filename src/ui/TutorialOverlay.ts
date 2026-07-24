import { Control } from "@babylonjs/gui/2D/controls/control";
import { TextBlock } from "@babylonjs/gui/2D/controls/textBlock";
import type { UiRoot } from "./UiRoot";

export class TutorialOverlay {
  private readonly text: TextBlock;
  private remainingSeconds = 0;

  public constructor(root: UiRoot) {
    this.text = root.createText("tutorial-message", "", 22);
    this.text.width = "300px";
    this.text.height = "132px";
    this.text.textWrapping = true;
    this.text.top = "-24%";
    this.text.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    this.text.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
    this.text.isVisible = false;
    root.texture.addControl(this.text);
  }

  public show(message: string, durationSeconds: number): void {
    this.text.text = message;
    this.remainingSeconds = Math.max(0, durationSeconds);
    this.text.isVisible = this.remainingSeconds > 0;
  }

  public update(stepSeconds: number): void {
    if (!this.text.isVisible) return;
    this.remainingSeconds -= stepSeconds;
    if (this.remainingSeconds <= 0) this.text.isVisible = false;
  }

  public dispose(): void {
    this.text.isVisible = false;
  }
}
