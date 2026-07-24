import { Engine } from "@babylonjs/core/Engines/engine";
import type { EngineOptions } from "@babylonjs/core/Engines/thinEngine";

export class DeterministicTestEngine extends Engine {
  private readonly fixedRenderDeltaMs: number;

  public constructor(
    canvas: HTMLCanvasElement,
    renderFps: number,
    options: EngineOptions,
  ) {
    super(canvas, true, options);
    this.fixedRenderDeltaMs = 1000 / renderFps;
  }

  public override getDeltaTime(): number {
    return this.fixedRenderDeltaMs;
  }
}
