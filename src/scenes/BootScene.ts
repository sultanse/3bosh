import type { Scene } from "@babylonjs/core/scene";

export class BootScene {
  public constructor(private readonly scene: Scene) {}

  public markReady(): void {
    const canvas = this.scene.getEngine().getRenderingCanvas();
    canvas?.setAttribute("data-boot-status", "ready");
  }

  public markFailed(): void {
    const canvas = this.scene.getEngine().getRenderingCanvas();
    canvas?.setAttribute("data-boot-status", "failed");
  }
}
