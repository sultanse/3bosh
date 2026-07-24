import type { GameEvents } from "../core/TypedEventBus";
import { TypedEventBus } from "../core/TypedEventBus";
import { SaveService, type SaveData } from "../services/SaveService";
import { GameFlowMachine, type GameFlowState } from "./GameFlowMachine";
import { LevelSession, type Checkpoint } from "./LevelSession";

export class GameSession {
  public currentLevel: LevelSession | null = null;

  public constructor(
    private readonly flow: GameFlowMachine,
    private readonly saves: SaveService,
    private readonly events: TypedEventBus<GameEvents>,
  ) {}

  public get saveData(): SaveData {
    return this.saves.load();
  }

  public startLevel(spawnCheckpoint: Checkpoint): LevelSession {
    this.currentLevel = new LevelSession(spawnCheckpoint, this.events);
    return this.currentLevel;
  }

  public transition(next: GameFlowState): void {
    this.flow.transition(next);
    if (next === "victory" || next === "gameOver") {
      this.finalizeHighScore();
    }
  }

  private finalizeHighScore(): void {
    if (this.currentLevel !== null) {
      this.saves.saveHighScore(this.currentLevel.snapshot.score);
    }
  }
}
