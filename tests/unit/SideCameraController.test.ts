import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { describe, expect, it } from "vitest";
import { SideCameraController } from "../../src/gameplay/camera/SideCameraController";

describe("SideCameraController", () => {
  it("does not move while the target remains inside its dead zone", () => {
    const camera = new SideCameraController({
      bounds: { minX: -20, maxX: 20, minY: -10, maxY: 10 },
      center: new Vector3(0, 0, -10),
      halfWidth: 5,
      halfHeight: 4,
      deadZoneWidth: 3,
      deadZoneHeight: 2,
      damping: 9,
    });

    expect(camera.update(new Vector3(1.4, 0.9, 0), 1 / 60)).toEqual(
      new Vector3(0, 0, -10),
    );
  });

  it("damps toward a target outside the dead zone", () => {
    const camera = new SideCameraController({
      bounds: { minX: -20, maxX: 20, minY: -10, maxY: 10 },
      center: new Vector3(0, 0, -10),
      halfWidth: 5,
      halfHeight: 4,
      deadZoneWidth: 3,
      deadZoneHeight: 2,
      damping: 9,
    });

    const center = camera.update(new Vector3(10, 0, 0), 1 / 60);

    expect(center.x).toBeGreaterThan(0);
    expect(center.x).toBeLessThan(8.5);
  });

  it("clamps the camera center after including its orthographic half extents", () => {
    const camera = new SideCameraController({
      bounds: { minX: 0, maxX: 10, minY: 0, maxY: 8 },
      center: new Vector3(5, 4, -10),
      halfWidth: 5,
      halfHeight: 4,
      deadZoneWidth: 0,
      deadZoneHeight: 0,
      damping: 1000,
    });

    expect(camera.update(new Vector3(50, 50, 0), 1)).toEqual(
      new Vector3(5, 4, -10),
    );
  });

  it("decays shake and clamps it inside the level bounds", () => {
    const camera = new SideCameraController({
      bounds: { minX: 0, maxX: 10, minY: 0, maxY: 8 },
      center: new Vector3(5, 4, -10),
      halfWidth: 5,
      halfHeight: 4,
      deadZoneWidth: 0,
      deadZoneHeight: 0,
      damping: 1000,
    });
    camera.shake(3, 0.1);

    expect(camera.update(new Vector3(50, 50, 0), 1 / 60)).toEqual(
      new Vector3(5, 4, -10),
    );
    expect(camera.update(new Vector3(50, 50, 0), 0.2)).toEqual(
      new Vector3(5, 4, -10),
    );
  });
});
