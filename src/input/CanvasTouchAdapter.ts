import type { TouchZone, TouchZoneProvider } from "../ui/MobileControls";
import type { TouchInputSource } from "./TouchInputSource";

export interface PointerSurface extends EventTarget {
  getBoundingClientRect(): Readonly<{ left: number; top: number; width: number; height: number }>;
}

export interface VisibilityTarget extends EventTarget {
  readonly visibilityState: DocumentVisibilityState;
}

export interface CanvasTouchAdapterOptions {
  readonly blurTarget?: EventTarget;
  readonly visibilityTarget?: VisibilityTarget;
}

export class CanvasTouchAdapter {
  private readonly activeZones = new Map<number, TouchZone["id"]>();
  private readonly blurTarget: EventTarget;
  private readonly visibilityTarget: VisibilityTarget | undefined;
  private disposed = false;

  private readonly pointerDownListener = (event: Event): void => this.onPointerDown(event as PointerEvent);
  private readonly pointerMoveListener = (event: Event): void => this.onPointerMove(event as PointerEvent);
  private readonly pointerUpListener = (event: Event): void => this.onPointerRelease(event as PointerEvent);
  private readonly blurListener = (): void => this.cancelAll();
  private readonly visibilityListener = (): void => {
    if (this.visibilityTarget?.visibilityState === "hidden") {
      this.cancelAll();
    }
  };

  public constructor(
    private readonly canvas: PointerSurface,
    private readonly zoneProvider: TouchZoneProvider,
    private readonly touch: TouchInputSource,
    options: CanvasTouchAdapterOptions = {},
  ) {
    this.blurTarget = options.blurTarget ?? (typeof window === "undefined" ? new EventTarget() : window);
    this.visibilityTarget = options.visibilityTarget
      ?? (typeof document === "undefined" ? undefined : document);
    this.canvas.addEventListener("pointerdown", this.pointerDownListener);
    this.canvas.addEventListener("pointermove", this.pointerMoveListener);
    this.canvas.addEventListener("pointerup", this.pointerUpListener);
    this.canvas.addEventListener("pointercancel", this.pointerUpListener);
    this.blurTarget.addEventListener("blur", this.blurListener);
    this.visibilityTarget?.addEventListener("visibilitychange", this.visibilityListener);
  }

  public dispose(): void {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    this.canvas.removeEventListener("pointerdown", this.pointerDownListener);
    this.canvas.removeEventListener("pointermove", this.pointerMoveListener);
    this.canvas.removeEventListener("pointerup", this.pointerUpListener);
    this.canvas.removeEventListener("pointercancel", this.pointerUpListener);
    this.blurTarget.removeEventListener("blur", this.blurListener);
    this.visibilityTarget?.removeEventListener("visibilitychange", this.visibilityListener);
    this.cancelAll();
  }

  private onPointerDown(event: PointerEvent): void {
    const zone = this.hitTest(event.clientX, event.clientY);
    if (zone === undefined) {
      return;
    }
    event.preventDefault();
    this.activeZones.set(event.pointerId, zone.id);
    this.touch.press(event.pointerId, zone.action);
  }

  private onPointerMove(event: PointerEvent): void {
    const current = this.activeZones.get(event.pointerId);
    if (current === undefined) {
      return;
    }
    event.preventDefault();
    const zone = this.hitTest(event.clientX, event.clientY);
    if (zone?.id === current) {
      return;
    }
    this.touch.release(event.pointerId);
    this.activeZones.delete(event.pointerId);
    if (zone !== undefined) {
      this.activeZones.set(event.pointerId, zone.id);
      this.touch.press(event.pointerId, zone.action);
    }
  }

  private onPointerRelease(event: PointerEvent): void {
    if (!this.activeZones.has(event.pointerId)) {
      return;
    }
    this.activeZones.delete(event.pointerId);
    this.touch.release(event.pointerId);
  }

  private cancelAll(): void {
    this.activeZones.clear();
    this.touch.cancelAll();
  }

  private hitTest(clientX: number, clientY: number): TouchZone | undefined {
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      return undefined;
    }
    const size = this.zoneProvider.renderSize();
    const textureX = (clientX - rect.left) * (size.width / rect.width);
    const textureY = (clientY - rect.top) * (size.height / rect.height);
    for (const zone of this.zoneProvider.zones()) {
      const { x, y, width, height } = zone.bounds;
      if (textureX >= x && textureX <= x + width && textureY >= y && textureY <= y + height) {
        return zone;
      }
    }
    return undefined;
  }
}
