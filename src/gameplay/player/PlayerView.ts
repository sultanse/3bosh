import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import type { Scene } from "@babylonjs/core/scene";
import type { PlayerState } from "./PlayerStateMachine";

export class PlayerView {
  public readonly root: TransformNode;
  private readonly visualRoot: TransformNode;
  private readonly body: ReturnType<typeof MeshBuilder.CreateCapsule>;
  private elapsedSeconds = 0;
  private flashRemainingSeconds = 0;
  private state: PlayerState = "idle";

  public constructor(scene: Scene) {
    this.root = new TransformNode("player-view-root", scene);
    this.visualRoot = new TransformNode("player-visual-root", scene);
    this.visualRoot.parent = this.root;
    this.body = MeshBuilder.CreateCapsule(
      "player-body",
      { height: 1.65, radius: 0.36, tessellation: 12 },
      scene,
    );
    this.body.parent = this.visualRoot;
    const material = new StandardMaterial("player-body-material", scene);
    material.diffuseColor = new Color3(0.96, 0.49, 0.17);
    material.specularColor = new Color3(0.18, 0.18, 0.18);
    this.body.material = material;

    const visor = MeshBuilder.CreateBox(
      "player-visor",
      { width: 0.46, height: 0.2, depth: 0.08 },
      scene,
    );
    visor.parent = this.visualRoot;
    visor.position.set(0.12, 0.2, -0.35);
    const visorMaterial = new StandardMaterial("player-visor-material", scene);
    visorMaterial.diffuseColor = new Color3(0.16, 0.78, 0.92);
    visor.material = visorMaterial;
  }

  public setPosition(position: Vector3): void {
    this.root.position.copyFrom(position);
  }

  public setFacing(facing: "left" | "right"): void {
    this.visualRoot.rotation.y = facing === "left" ? Math.PI : 0;
  }

  public setState(state: PlayerState): void {
    this.state = state;
  }

  public flashDamage(durationSeconds: number): void {
    this.flashRemainingSeconds = Math.max(0, durationSeconds);
  }

  public update(stepSeconds: number): void {
    this.elapsedSeconds += stepSeconds;
    this.flashRemainingSeconds = Math.max(0, this.flashRemainingSeconds - stepSeconds);
    const flash = this.flashRemainingSeconds > 0 && Math.floor(this.elapsedSeconds * 20) % 2 === 0;
    this.body.visibility = flash ? 0.25 : 1;
    this.visualRoot.position.y = this.state === "idle" ? Math.sin(this.elapsedSeconds * 3) * 0.035 : 0;
    this.visualRoot.rotation.z = this.state === "running" ? Math.sin(this.elapsedSeconds * 16) * 0.08 : 0;
    const verticalScale = this.state === "jumping" ? 0.9 : 1;
    this.visualRoot.scaling.set(1 / Math.sqrt(verticalScale), verticalScale, 1);
  }

  public dispose(): void {
    this.root.dispose(false, true);
  }
}
