import { AdvancedDynamicTexture } from "@babylonjs/gui/2D/advancedDynamicTexture";
import { Button } from "@babylonjs/gui/2D/controls/button";
import { Control } from "@babylonjs/gui/2D/controls/control";
import { Ellipse } from "@babylonjs/gui/2D/controls/ellipse";
import { Rectangle } from "@babylonjs/gui/2D/controls/rectangle";
import { StackPanel } from "@babylonjs/gui/2D/controls/stackPanel";
import { TextBlock } from "@babylonjs/gui/2D/controls/textBlock";
import type { Scene } from "@babylonjs/core/scene";
import type { LocalizationService } from "../services/LocalizationService";

export interface UiControlDiagnostic {
  readonly id: string;
  readonly text: string | null;
  readonly visible: boolean;
  readonly pixelBounds: Readonly<{ x: number; y: number; width: number; height: number }>;
  readonly lineCount?: number;
}

export interface UiDiagnosticsSnapshot {
  readonly direction: "rtl" | "ltr";
  readonly viewport: Readonly<{ width: number; height: number }>;
  readonly controls: readonly UiControlDiagnostic[];
}

type DiagnosticControl = TextBlock | Button | Rectangle | StackPanel | Ellipse;

interface RegisteredControl {
  readonly id: string;
  readonly control: DiagnosticControl;
  readonly text: () => string | null;
}

export class UiRoot {
  public readonly texture: AdvancedDynamicTexture;
  private readonly controls = new Map<string, RegisteredControl>();
  private readonly actions = new Map<string, () => void>();
  private disposed = false;

  public constructor(
    scene: Scene,
    public readonly localization: LocalizationService,
  ) {
    this.texture = AdvancedDynamicTexture.CreateFullscreenUI("game-ui", true, scene);
  }

  public createPanel(id: string): StackPanel {
    const panel = new StackPanel(id);
    panel.isVertical = true;
    panel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    panel.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
    this.texture.addControl(panel);
    this.register(id, panel, () => null);
    return panel;
  }

  public createOverlay(id: string): Rectangle {
    const overlay = new Rectangle(id);
    overlay.width = "100%";
    overlay.height = "100%";
    overlay.thickness = 0;
    overlay.background = "#0b1220b8";
    this.texture.addControl(overlay);
    this.register(id, overlay, () => null);
    return overlay;
  }

  public createText(id: string, text: string, fontSize = 28): TextBlock {
    const block = new TextBlock(id, text);
    block.color = "#fff7df";
    block.fontSize = fontSize;
    block.textHorizontalAlignment = this.rtlHorizontalAlignment();
    block.textWrapping = true;
    block.resizeToFit = false;
    this.register(id, block, () => block.text ?? null);
    return block;
  }

  public createButton(id: string, text: string, callback: () => void): Button {
    const button = Button.CreateSimpleButton(id, text);
    button.width = "280px";
    button.height = "58px";
    button.color = "#fff7df";
    button.background = "#a6503d";
    button.cornerRadius = 10;
    button.thickness = 2;
    button.fontSize = 22;
    button.paddingTop = "8px";
    button.paddingBottom = "8px";
    button.onPointerClickObservable.add(() => callback());
    this.actions.set(id, callback);
    this.register(id, button, () => text);
    return button;
  }

  public add(parent: Rectangle | StackPanel, control: Control): void {
    parent.addControl(control);
  }

  public track(id: string, control: DiagnosticControl, text: () => string | null = () => null): void {
    this.register(id, control, text);
  }

  public snapshot(): UiDiagnosticsSnapshot {
    const engine = this.texture.getScene()?.getEngine();
    const viewport = {
      width: engine?.getRenderWidth() ?? 0,
      height: engine?.getRenderHeight() ?? 0,
    };
    return {
      direction: this.localization.direction,
      viewport,
      controls: [...this.controls.values()].map(({ id, control, text }) => ({
        id,
        text: text(),
        visible: this.isEffectivelyVisible(control),
        pixelBounds: {
          x: control._currentMeasure.left,
          y: control._currentMeasure.top,
          width: control._currentMeasure.width,
          height: control._currentMeasure.height,
        },
        ...(control instanceof TextBlock ? { lineCount: control.lines?.length ?? 0 } : {}),
      })),
    };
  }

  public invoke(id: string): boolean {
    const action = this.actions.get(id);
    if (action === undefined) return false;
    const registered = this.controls.get(id);
    if (registered === undefined) return false;
    const { control } = registered;
    if (!this.isEffectivelyVisible(control)) return false;
    const measure = control._currentMeasure;
    if (measure.width <= 0 || measure.height <= 0) return false;
    action();
    return true;
  }

  public dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.controls.clear();
    this.actions.clear();
    this.texture.dispose();
  }

  private register(id: string, control: DiagnosticControl, text: () => string | null): void {
    if (this.controls.has(id)) {
      throw new Error(`Duplicate GUI control id: ${id}`);
    }
    this.controls.set(id, { id, control, text });
  }

  private isEffectivelyVisible(control: Control): boolean {
    let node: Control | null | undefined = control;
    while (node) {
      if (!node.isVisible) return false;
      node = node.parent;
    }
    return true;
  }

  private rtlHorizontalAlignment(): number {
    return this.localization.direction === "rtl"
      ? Control.HORIZONTAL_ALIGNMENT_RIGHT
      : Control.HORIZONTAL_ALIGNMENT_LEFT;
  }
}
