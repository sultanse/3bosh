import type { GameEvents } from "../core/TypedEventBus";
import { TypedEventBus } from "../core/TypedEventBus";

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

const copyPosition = (position: Checkpoint["position"]): Readonly<{ x: number; y: number; z: number }> => ({ ...position });

export class LevelSession {
  private score = 0;
  private collectibles = 0;
  private readonly collectedItemIds = new Set<string>();
  private readonly activatedCheckpointIds: Set<string>;
  private activeCheckpointId: string | null;
  private activeCheckpointPosition: Readonly<{ x: number; y: number; z: number }>;
  private goalReached = false;

  public constructor(spawnCheckpoint: Checkpoint, private readonly events: TypedEventBus<GameEvents>) {
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

  public collect(itemId: string, kind: CollectibleKind, scoreDelta: number): boolean {
    if (!Number.isFinite(scoreDelta) || !Number.isInteger(scoreDelta) || scoreDelta < 0 || this.collectedItemIds.has(itemId)) {
      return false;
    }

    this.collectedItemIds.add(itemId);
    this.collectibles += 1;
    this.score += scoreDelta;
    this.events.emit("collectibleCollected", { kind, scoreDelta });
    this.events.emit("scoreChanged", { score: this.score, collectibles: this.collectibles });
    return true;
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
}
