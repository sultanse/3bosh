import type { GameEvents } from "../core/TypedEventBus";
import { TypedEventBus } from "../core/TypedEventBus";
import type { PlayerHealth } from "../gameplay/player/PlayerHealth";

export interface Checkpoint {
  readonly id: string;
  readonly position: Readonly<{ x: number; y: number; z: number }>;
}

export interface LevelSessionSnapshot {
  readonly score: number;
  readonly collectibles: number;
  readonly collectedItemIds: ReadonlySet<string>;
  readonly activeCheckpointId: string | null;
  readonly activeCheckpointPosition: Readonly<{ x: number; y: number; z: number }>;
  readonly goalReached: boolean;
}

type CollectibleKind = GameEvents["collectibleCollected"]["kind"];

export type CollectionEffect =
  | { readonly kind: "crystal"; readonly score: number }
  | { readonly kind: "health"; readonly healAmount: number }
  | { readonly kind: "shield"; readonly durationSeconds: number };

export interface CollectResult {
  readonly collected: boolean;
  readonly scoreDelta: number;
}

const copyPosition = (position: Checkpoint["position"]): Readonly<{ x: number; y: number; z: number }> => ({ ...position });

export class LevelSession {
  private score = 0;
  private collectibles = 0;
  private readonly collectedItemIds = new Set<string>();
  private readonly activatedCheckpointIds: Set<string>;
  private activeCheckpointId: string | null;
  private activeCheckpointPosition: Readonly<{ x: number; y: number; z: number }>;
  private goalReached = false;

  public constructor(
    spawnCheckpoint: Checkpoint,
    private readonly events: TypedEventBus<GameEvents>,
    private readonly health?: PlayerHealth,
    private readonly nowSeconds: () => number = () => 0,
  ) {
    this.activeCheckpointId = spawnCheckpoint.id;
    this.activeCheckpointPosition = copyPosition(spawnCheckpoint.position);
    this.activatedCheckpointIds = new Set([spawnCheckpoint.id]);
  }

  public get snapshot(): LevelSessionSnapshot {
    return {
      score: this.score,
      collectibles: this.collectibles,
      collectedItemIds: new Set(this.collectedItemIds),
      activeCheckpointId: this.activeCheckpointId,
      activeCheckpointPosition: copyPosition(this.activeCheckpointPosition),
      goalReached: this.goalReached,
    };
  }

  public activateCheckpoint(checkpoint: Checkpoint): boolean {
    if (this.activatedCheckpointIds.has(checkpoint.id)) {
      return false;
    }

    this.activatedCheckpointIds.add(checkpoint.id);
    this.activeCheckpointId = checkpoint.id;
    this.activeCheckpointPosition = copyPosition(checkpoint.position);
    this.events.emit("checkpointActivated", { checkpointId: checkpoint.id });
    return true;
  }

  public collect(itemId: string, effect: CollectionEffect): CollectResult;
  /** @deprecated Use the typed CollectionEffect overload. */
  public collect(itemId: string, kind: CollectibleKind, scoreDelta: number): boolean;
  public collect(
    itemId: string,
    effectOrKind: CollectionEffect | CollectibleKind,
    legacyScoreDelta?: number,
  ): CollectResult | boolean {
    if (typeof effectOrKind === "string") {
      return this.collectLegacy(itemId, effectOrKind, legacyScoreDelta);
    }
    if (itemId.length === 0 || this.collectedItemIds.has(itemId)) {
      return { collected: false, scoreDelta: 0 };
    }

    const scoreDelta = this.applyEffect(effectOrKind);
    if (scoreDelta === null) {
      return { collected: false, scoreDelta: 0 };
    }

    this.collectedItemIds.add(itemId);
    this.collectibles += 1;
    this.score += scoreDelta;
    this.events.emit("collectibleCollected", { kind: effectOrKind.kind, scoreDelta });
    this.events.emit("scoreChanged", { score: this.score, collectibles: this.collectibles });
    return { collected: true, scoreDelta };
  }

  public addScore(scoreDelta: number): boolean {
    if (!Number.isFinite(scoreDelta) || !Number.isInteger(scoreDelta) || scoreDelta <= 0) {
      return false;
    }

    this.score += scoreDelta;
    this.events.emit("scoreChanged", { score: this.score, collectibles: this.collectibles });
    return true;
  }

  public completeGoal(): boolean {
    if (this.goalReached) {
      return false;
    }

    this.goalReached = true;
    this.events.emit("levelCompleted", { score: this.score, collectibles: this.collectibles });
    return true;
  }

  private collectLegacy(itemId: string, kind: CollectibleKind, scoreDelta: number | undefined): boolean {
    if (scoreDelta === undefined || !Number.isFinite(scoreDelta) || !Number.isInteger(scoreDelta) || scoreDelta < 0 || this.collectedItemIds.has(itemId)) {
      return false;
    }
    this.collectedItemIds.add(itemId);
    this.collectibles += 1;
    this.score += scoreDelta;
    this.events.emit("collectibleCollected", { kind, scoreDelta });
    this.events.emit("scoreChanged", { score: this.score, collectibles: this.collectibles });
    return true;
  }

  private applyEffect(effect: CollectionEffect): number | null {
    if (effect.kind === "crystal") {
      return Number.isFinite(effect.score) && Number.isInteger(effect.score) && effect.score >= 0 ? effect.score : null;
    }
    if (this.health === undefined) {
      return null;
    }
    if (effect.kind === "health") {
      if (!Number.isFinite(effect.healAmount) || effect.healAmount <= 0 || this.health.current >= this.health.maximum) return null;
      const previous = this.health.current;
      this.health.heal(effect.healAmount);
      return this.health.current > previous ? 0 : null;
    }
    if (!Number.isFinite(effect.durationSeconds) || effect.durationSeconds <= 0) return null;
    this.health.grantShield(effect.durationSeconds, this.nowSeconds());
    return 0;
  }
}
