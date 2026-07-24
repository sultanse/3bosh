import { Camera } from "@babylonjs/core/Cameras/camera";
import { FreeCamera } from "@babylonjs/core/Cameras/freeCamera";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import type { Scene } from "@babylonjs/core/scene";
import { CameraShake } from "./CameraShake";

export interface CameraBounds {
  readonly minX: number;
  readonly maxX: number;
  readonly minY: number;
  readonly maxY: number;
}

export interface SideCameraControllerOptions {
  readonly bounds: CameraBounds;
  readonly center: Vector3;
  readonly halfWidth: number;
  readonly halfHeight: number;
  readonly deadZoneWidth: number;
  readonly deadZoneHeight: number;
  readonly damping: number;
  readonly camera?: FreeCamera;
}

export class SideCameraController {
  private center: Vector3;
  private readonly shakeEffect = new CameraShake();
  private halfWidth: number;
  private halfHeight: number;

  public constructor(private readonly options: SideCameraControllerOptions) {
    this.center = options.center.clone();
    this.halfWidth = options.halfWidth;
    this.halfHeight = options.halfHeight;
    this.applyCamera(this.center);
  }

  public static createCamera(
    scene: Scene,
    name: string,
    center: Vector3,
    verticalSize: number,
  ): FreeCamera {
    const camera = new FreeCamera(name, center.clone(), scene);
    camera.position.z = -20;
    camera.mode = Camera.ORTHOGRAPHIC_CAMERA;
    const aspect = scene.getEngine().getRenderWidth() / Math.max(1, scene.getEngine().getRenderHeight());
    const halfHeight = verticalSize / 2;
    const halfWidth = halfHeight * aspect;
    camera.orthoLeft = -halfWidth;
    camera.orthoRight = halfWidth;
    camera.orthoBottom = -halfHeight;
    camera.orthoTop = halfHeight;
    camera.setTarget(new Vector3(center.x, center.y, 0));
    return camera;
  }

  public update(target: Vector3, stepSeconds: number): Vector3 {
    const desired = this.deadZoneCorrectedCenter(target);
    const interpolation = 1 - Math.exp(-this.options.damping * Math.max(0, stepSeconds));
    this.center = Vector3.Lerp(this.center, desired, interpolation);
    this.center = this.clamp(this.center);
    const presentedCenter = this.clamp(this.center.add(this.shakeEffect.update(stepSeconds)));
    this.applyCamera(presentedCenter);
    return presentedCenter;
  }

  public shake(amplitude: number, durationSeconds: number): void {
    this.shakeEffect.start(amplitude, durationSeconds);
  }

  public get shakeSamples(): number {
    return this.shakeEffect.renderedSampleCount;
  }

  public resize(aspect: number, verticalSize: number): void {
    this.halfHeight = verticalSize / 2;
    this.halfWidth = this.halfHeight * aspect;
    this.options.camera?.setTarget(new Vector3(this.center.x, this.center.y, 0));
    if (this.options.camera) {
      this.options.camera.orthoLeft = -this.halfWidth;
      this.options.camera.orthoRight = this.halfWidth;
      this.options.camera.orthoBottom = -this.halfHeight;
      this.options.camera.orthoTop = this.halfHeight;
    }
  }

  private deadZoneCorrectedCenter(target: Vector3): Vector3 {
    const halfDeadWidth = this.options.deadZoneWidth / 2;
    const halfDeadHeight = this.options.deadZoneHeight / 2;
    const x = target.x > this.center.x + halfDeadWidth
      ? target.x - halfDeadWidth
      : target.x < this.center.x - halfDeadWidth
        ? target.x + halfDeadWidth
        : this.center.x;
    const y = target.y > this.center.y + halfDeadHeight
      ? target.y - halfDeadHeight
      : target.y < this.center.y - halfDeadHeight
        ? target.y + halfDeadHeight
        : this.center.y;
    return this.clamp(new Vector3(x, y, this.center.z));
  }

  private clamp(center: Vector3): Vector3 {
    return new Vector3(
      this.clampAxis(center.x, this.options.bounds.minX, this.options.bounds.maxX, this.halfWidth),
      this.clampAxis(center.y, this.options.bounds.minY, this.options.bounds.maxY, this.halfHeight),
      this.center.z,
    );
  }

  private clampAxis(value: number, minimum: number, maximum: number, halfExtent: number): number {
    const minimumCenter = minimum + halfExtent;
    const maximumCenter = maximum - halfExtent;
    if (minimumCenter > maximumCenter) {
      return (minimum + maximum) / 2;
    }
    return Math.min(maximumCenter, Math.max(minimumCenter, value));
  }

  private applyCamera(center: Vector3): void {
    const camera = this.options.camera;
    if (!camera) {
      return;
    }
    camera.position.set(center.x, center.y, -20);
    camera.setTarget(new Vector3(center.x, center.y, 0));
  }
}
