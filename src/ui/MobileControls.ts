import { Control } from "@babylonjs/gui/2D/controls/control";
import { Ellipse } from "@babylonjs/gui/2D/controls/ellipse";
import { Rectangle } from "@babylonjs/gui/2D/controls/rectangle";
import { StackPanel } from "@babylonjs/gui/2D/controls/stackPanel";
import { TextBlock } from "@babylonjs/gui/2D/controls/textBlock";
import type { InputAction } from "../input/InputAction";
import type { UiRoot } from "./UiRoot";

export type MobileZoneId = "moveLeft" | "moveRight" | "jump";

export interface TouchZoneRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface TouchZone {
  readonly id: MobileZoneId;
  readonly action: InputAction;
  readonly bounds: TouchZoneRect;
}

export interface TouchZoneProvider {
  zones(): readonly TouchZone[];
  renderSize(): Readonly<{ width: number; height: number }>;
}

interface ZoneControl {
  readonly id: MobileZoneId;
  readonly action: InputAction;
  readonly control: Ellipse;
}

const CSS_DIAMETER = 92;
const SAFE_AREA_PADDING = 26;
const CLUSTER_GAP = 20;

export class MobileControls implements TouchZoneProvider {
  private readonly container: Rectangle;
  private readonly zoneControls: readonly ZoneControl[];

  public constructor(
    private readonly root: UiRoot,
    options: { readonly visible: boolean },
  ) {
    const scale = this.deviceScale();
    const diameter = Math.round(CSS_DIAMETER * scale);
    const pad = Math.round(SAFE_AREA_PADDING * scale);
    const gap = Math.round(CLUSTER_GAP * scale);
    const startAlign = this.inlineStartAlignment();
    const endAlign = this.inlineEndAlignment();

    this.container = new Rectangle("mobile-controls");
    this.container.width = "100%";
    this.container.height = "100%";
    this.container.thickness = 0;
    this.container.isHitTestVisible = false;
    this.container.isPointerBlocker = false;
    this.container.isVisible = options.visible;
    root.texture.addControl(this.container);

    const cluster = new StackPanel("mobile-move-cluster");
    cluster.isVertical = false;
    cluster.height = `${diameter}px`;
    cluster.horizontalAlignment = startAlign;
    cluster.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
    cluster.paddingBottom = `${pad}px`;
    cluster.paddingLeft = `${pad}px`;
    cluster.paddingRight = `${pad}px`;
    this.container.addControl(cluster);

    const moveLeft = this.createZone("moveLeft", "\u25C0", diameter);
    const moveRight = this.createZone("moveRight", "\u25B6", diameter);
    moveLeft.paddingRight = `${gap / 2}px`;
    moveRight.paddingLeft = `${gap / 2}px`;
    cluster.addControl(moveLeft);
    cluster.addControl(moveRight);

    const jumpWrap = new StackPanel("mobile-jump-wrap");
    jumpWrap.isVertical = true;
    jumpWrap.adaptWidthToChildren = true;
    jumpWrap.height = `${diameter}px`;
    jumpWrap.horizontalAlignment = endAlign;
    jumpWrap.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
    jumpWrap.paddingBottom = `${pad}px`;
    jumpWrap.paddingLeft = `${pad}px`;
    jumpWrap.paddingRight = `${pad}px`;
    this.container.addControl(jumpWrap);

    const jump = this.createZone("jump", "\u25B2", diameter);
    jumpWrap.addControl(jump);

    this.zoneControls = [
      { id: "moveLeft", action: "left", control: moveLeft },
      { id: "moveRight", action: "right", control: moveRight },
      { id: "jump", action: "jump", control: jump },
    ];
    for (const zone of this.zoneControls) {
      root.track(zone.id, zone.control);
    }
  }

  public setVisible(visible: boolean): void {
    this.container.isVisible = visible;
  }

  public zones(): readonly TouchZone[] {
    return this.zoneControls.map(({ id, action, control }) => ({
      id,
      action,
      bounds: {
        x: control._currentMeasure.left,
        y: control._currentMeasure.top,
        width: control._currentMeasure.width,
        height: control._currentMeasure.height,
      },
    }));
  }

  public renderSize(): Readonly<{ width: number; height: number }> {
    const engine = this.root.texture.getScene()?.getEngine();
    return {
      width: engine?.getRenderWidth() ?? 0,
      height: engine?.getRenderHeight() ?? 0,
    };
  }

  public dispose(): void {
    this.container.dispose();
  }

  private createZone(id: MobileZoneId, glyph: string, diameter: number): Ellipse {
    const ellipse = new Ellipse(id);
    ellipse.width = `${diameter}px`;
    ellipse.height = `${diameter}px`;
    ellipse.thickness = 3;
    ellipse.color = "#fff7df";
    ellipse.background = "#a6503db8";
    ellipse.isPointerBlocker = true;
    const label = new TextBlock(`${id}-glyph`, glyph);
    label.color = "#fff7df";
    label.fontSize = Math.round(diameter * 0.42);
    ellipse.addControl(label);
    return ellipse;
  }

  private deviceScale(): number {
    const ratio = typeof window === "undefined" ? 1 : window.devicePixelRatio;
    return ratio > 0 ? ratio : 1;
  }

  private inlineStartAlignment(): number {
    return this.root.localization.direction === "rtl"
      ? Control.HORIZONTAL_ALIGNMENT_RIGHT
      : Control.HORIZONTAL_ALIGNMENT_LEFT;
  }

  private inlineEndAlignment(): number {
    return this.root.localization.direction === "rtl"
      ? Control.HORIZONTAL_ALIGNMENT_LEFT
      : Control.HORIZONTAL_ALIGNMENT_RIGHT;
  }
}
