import type { TypedEventBus, GameEvents } from "../core/TypedEventBus";
import type { LocalizationService } from "../services/LocalizationService";
import type { GameFlowState } from "../app/GameFlowMachine";
import { EndScreen } from "./EndScreen";
import { Hud, type HudSnapshot } from "./Hud";
import { PauseMenu } from "./PauseMenu";
import { TutorialOverlay } from "./TutorialOverlay";
import { UiRoot } from "./UiRoot";
import type { Scene } from "@babylonjs/core/scene";
import { DisposableBag } from "../core/DisposableBag";

export interface LevelUiCallbacks {
  readonly resume: () => void;
  readonly restart: () => void;
  readonly menu: () => void;
}

export class LevelUi {
  public readonly root: UiRoot;
  public readonly tutorial: TutorialOverlay;
  private readonly hud: Hud;
  private readonly pause: PauseMenu;
  private readonly subscriptions = new DisposableBag();
  private endScreen: EndScreen | undefined;
  private outcome: "victory" | "gameOver" | undefined;

  public constructor(
    scene: Scene,
    localization: LocalizationService,
    events: TypedEventBus<GameEvents>,
    initial: HudSnapshot,
    private readonly callbacks: LevelUiCallbacks,
  ) {
    this.root = new UiRoot(scene, localization);
    this.hud = new Hud(this.root, events, localization, initial);
    this.pause = new PauseMenu(this.root, callbacks);
    this.tutorial = new TutorialOverlay(this.root);
    this.subscriptions.add(events.on("tutorialRequested", ({ messageKey, durationSeconds }) => {
      this.tutorial.show(localization.t(messageKey), durationSeconds);
    }));
  }

  public sync(state: GameFlowState): void {
    if (state === "playing") this.tutorial.update(1 / 60);
    this.pause.setVisible(state === "paused");
    const outcome = state === "victory" || state === "gameOver" ? state : undefined;
    if (outcome === undefined || outcome === this.outcome) return;
    this.endScreen?.dispose();
    this.subscriptions.dispose();
    this.outcome = outcome;
    this.endScreen = new EndScreen(this.root, outcome, {
      restart: this.callbacks.restart,
      menu: this.callbacks.menu,
    });
  }

  public dispose(): void {
    this.endScreen?.dispose();
    this.pause.dispose();
    this.tutorial.dispose();
    this.hud.dispose();
    this.root.dispose();
  }
}
