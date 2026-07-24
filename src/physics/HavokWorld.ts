import HavokPhysics from "@babylonjs/havok";
import "@babylonjs/core/Physics/joinedPhysicsEngineComponent";
import { HavokPlugin } from "@babylonjs/core/Physics/v2/Plugins/havokPlugin";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import type { Scene } from "@babylonjs/core/scene";
import { GAME_CONFIG } from "../config/GameConfig";

export class HavokInitializationError extends Error {
  public constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "HavokInitializationError";
  }
}

export class HavokWorld {
  private constructor(public readonly plugin: HavokPlugin) {}

  public static async create(scene: Scene): Promise<HavokWorld> {
    try {
      const havok = await HavokPhysics();
      const plugin = new HavokPlugin(true, havok);
      scene.enablePhysics(new Vector3(0, GAME_CONFIG.gravity, 0), plugin);
      scene.getPhysicsEngine()?.setTimeStep(GAME_CONFIG.fixedStepSeconds);
      return new HavokWorld(plugin);
    } catch (error: unknown) {
      throw new HavokInitializationError("Unable to initialize Havok physics.", {
        cause: error,
      });
    }
  }
}
