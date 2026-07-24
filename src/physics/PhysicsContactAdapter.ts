import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { PhysicsEventType, type IBasePhysicsCollisionEvent } from "@babylonjs/core/Physics/v2/IPhysicsEnginePlugin";
import type { PhysicsBody } from "@babylonjs/core/Physics/v2/physicsBody";
import type { HavokPlugin } from "@babylonjs/core/Physics/v2/Plugins/havokPlugin";
import { GAME_CONFIG } from "../config/GameConfig";
import type { DisposableLike } from "../core/DisposableBag";
import type { BoundsSnapshot, PlayerEnemyContact } from "../gameplay/interactions/InteractionSystem";
import type { CharacterMotionSnapshot } from "./PhysicsCharacterAdapter";

interface EnemyTriggerRegistration {
  readonly id: string;
  readonly getBounds: () => BoundsSnapshot;
  readonly getVelocity: () => Readonly<Vector3>;
  readonly isDefeated: () => boolean;
}

const playerBounds = (position: Readonly<Vector3>): BoundsSnapshot => ({
  minX: position.x - GAME_CONFIG.player.radius,
  maxX: position.x + GAME_CONFIG.player.radius,
  feetY: position.y - GAME_CONFIG.player.height / 2,
  topY: position.y + GAME_CONFIG.player.height / 2,
});

/**
 * Converts character-controller trigger enter/exit notifications into stable
 * deterministic contact snapshots. It intentionally never requests a normal:
 * stomp direction comes from the swept player bounds and relative velocity.
 */
export class PhysicsContactAdapter implements DisposableLike {
  private readonly registrations = new Map<PhysicsBody, EnemyTriggerRegistration>();
  private readonly activeEnemyIds = new Set<string>();
  private readonly triggerSubscription: DisposableLike;
  private contacts: readonly PlayerEnemyContact[] = [];

  public constructor(plugin: HavokPlugin) {
    const listener = (event: IBasePhysicsCollisionEvent): void => {
      const registration = this.registrations.get(event.collider) ?? this.registrations.get(event.collidedAgainst);
      if (!registration) return;
      if (event.type === PhysicsEventType.TRIGGER_ENTERED) this.activeEnemyIds.add(registration.id);
      if (event.type === PhysicsEventType.TRIGGER_EXITED) this.activeEnemyIds.delete(registration.id);
    };
    const observer = plugin.onTriggerCollisionObservable.add(listener);
    this.triggerSubscription = { dispose: () => plugin.onTriggerCollisionObservable.remove(observer) };
  }

  public registerEnemy(
    id: string,
    triggerBody: PhysicsBody,
    getBounds: () => BoundsSnapshot,
    getVelocity: () => Readonly<Vector3>,
    isDefeated: () => boolean,
  ): void {
    this.registrations.set(triggerBody, { id, getBounds, getVelocity, isDefeated });
  }

  public capturePlayerStep(previous: CharacterMotionSnapshot, current: CharacterMotionSnapshot): void {
    const previousPlayerBounds = playerBounds(previous.position);
    const currentPlayerBounds = playerBounds(current.position);
    const byId = new Map<string, EnemyTriggerRegistration>();
    for (const registration of this.registrations.values()) byId.set(registration.id, registration);
    // Trigger notifications provide the normal fast path. The swept overlap
    // fallback is deliberate: a character controller can be teleported into a
    // trigger between physics broadphase updates, and that must not erase a
    // deterministic gameplay contact.
    const candidateEnemyIds = new Set(this.activeEnemyIds);
    for (const registration of byId.values()) {
      const enemyBounds = registration.getBounds();
      const overlaps =
        currentPlayerBounds.minX <= enemyBounds.maxX &&
        currentPlayerBounds.maxX >= enemyBounds.minX &&
        currentPlayerBounds.feetY <= enemyBounds.topY &&
        currentPlayerBounds.topY >= enemyBounds.feetY;
      if (overlaps) candidateEnemyIds.add(registration.id);
    }
    this.contacts = [...candidateEnemyIds].flatMap((enemyId) => {
      const enemy = byId.get(enemyId);
      if (!enemy) return [];
      return [{
        enemyId,
        previousPlayerBounds,
        currentPlayerBounds,
        enemyBounds: enemy.getBounds(),
        relativeVelocity: current.velocity.subtract(enemy.getVelocity()),
        enemyDefeated: enemy.isDefeated(),
      }];
    });
  }

  public drainPlayerEnemyContacts(): readonly PlayerEnemyContact[] {
    const contacts = this.contacts;
    this.contacts = [];
    return contacts;
  }

  public dispose(): void {
    this.triggerSubscription.dispose();
    this.registrations.clear();
    this.activeEnemyIds.clear();
    this.contacts = [];
  }
}
