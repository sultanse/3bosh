import { Control } from "@babylonjs/gui/2D/controls/control";
import { StackPanel } from "@babylonjs/gui/2D/controls/stackPanel";
import { TextBlock } from "@babylonjs/gui/2D/controls/textBlock";
import { DisposableBag } from "../core/DisposableBag";
import type { GameEvents, TypedEventBus } from "../core/TypedEventBus";
import type { LocalizationService } from "../services/LocalizationService";
import type { UiRoot } from "./UiRoot";

export interface HudSnapshot {
  readonly health: number;
  readonly maxHealth: number;
  readonly score: number;
  readonly collectibles: number;
}

export class Hud {
  private readonly subscriptions = new DisposableBag();
  private readonly healthText: TextBlock;
  private readonly scoreText: TextBlock;
  private readonly collectibleText: TextBlock;
  private readonly shieldText: TextBlock;

  public constructor(
    root: UiRoot,
    events: TypedEventBus<GameEvents>,
    localization: LocalizationService,
    initial: HudSnapshot,
  ) {
    const panel = new StackPanel("hud");
    panel.width = "280px";
    panel.height = "160px";
    panel.top = "18px";
    panel.horizontalAlignment = localization.direction === "rtl"
      ? Control.HORIZONTAL_ALIGNMENT_RIGHT
      : Control.HORIZONTAL_ALIGNMENT_LEFT;
    panel.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    root.texture.addControl(panel);
    this.healthText = root.createText("hud-health", "", 21);
    this.scoreText = root.createText("hud-score", "", 21);
    this.collectibleText = root.createText("hud-collectibles", "", 21);
    this.shieldText = root.createText("hud-shield", "", 19);
    for (const control of [this.healthText, this.scoreText, this.collectibleText, this.shieldText]) {
      control.height = "32px";
      root.add(panel, control);
    }
    this.setHealth(localization, initial.health, initial.maxHealth);
    this.setScore(localization, initial.score, initial.collectibles);
    this.shieldText.text = "";
    this.shieldText.isVisible = false;
    this.subscriptions.add(events.on("healthChanged", ({ health, maxHealth }) => this.setHealth(localization, health, maxHealth)));
    this.subscriptions.add(events.on("scoreChanged", ({ score, collectibles }) => this.setScore(localization, score, collectibles)));
    this.subscriptions.add(events.on("shieldChanged", ({ active }) => {
      this.shieldText.isVisible = active;
      this.shieldText.text = active ? "درع نشط" : "";
    }));
    this.subscriptions.add(events.on("checkpointActivated", ({ checkpointId }) => {
      this.collectibleText.text = `${localization.t("hudCollectibles")}: ${checkpointId}`;
    }));
  }

  public dispose(): void {
    this.subscriptions.dispose();
    this.healthText.isVisible = false;
    this.scoreText.isVisible = false;
    this.collectibleText.isVisible = false;
    this.shieldText.isVisible = false;
  }

  private setHealth(localization: LocalizationService, health: number, maximum: number): void {
    this.healthText.text = `${localization.t("hudHealth")}: ${health}/${maximum}`;
  }

  private setScore(localization: LocalizationService, score: number, collectibles: number): void {
    this.scoreText.text = `${localization.t("hudScore")}: ${score}`;
    this.collectibleText.text = `${localization.t("hudCollectibles")}: ${collectibles}`;
  }
}
