import { Checkbox } from "@babylonjs/gui/2D/controls/checkbox";
import { Control } from "@babylonjs/gui/2D/controls/control";
import { Slider } from "@babylonjs/gui/2D/controls/sliders/slider";
import { StackPanel } from "@babylonjs/gui/2D/controls/stackPanel";
import type { StringKey } from "../localization/strings";
import type { AudioSettings } from "../services/SaveService";
import type { UiRoot } from "./UiRoot";

export interface AudioSettingsCallbacks {
  readonly change: (settings: AudioSettings) => void;
  readonly persist: (settings: AudioSettings) => void;
  readonly clear: () => AudioSettings;
}

export interface AudioSettingsPanelOptions {
  readonly initial: AudioSettings;
  readonly callbacks: AudioSettingsCallbacks;
}

const SAVE_DEBOUNCE_MS = 160;

export class AudioSettingsPanel {
  private readonly music: Slider;
  private readonly sfx: Slider;
  private readonly mute: Checkbox;
  private readonly confirmation: ReturnType<UiRoot["createOverlay"]>;
  private saveTimer: number | undefined;
  private applyingSettings = false;

  public constructor(
    private readonly root: UiRoot,
    private readonly parent: StackPanel,
    private readonly options: AudioSettingsPanelOptions,
  ) {
    this.music = this.createVolumeControl("music-volume", "audioMusic", options.initial.musicVolume);
    this.sfx = this.createVolumeControl("sfx-volume", "audioSfx", options.initial.sfxVolume);
    this.mute = this.createMuteControl(options.initial.muted);
    this.confirmation = this.createConfirmation();
    this.music.onValueChangedObservable.add(() => this.handleSliderChange());
    this.sfx.onValueChangedObservable.add(() => this.handleSliderChange());
    this.mute.onIsCheckedChangedObservable.add(() => this.handleMuteChange());
    this.root.add(
      this.parent,
      this.root.createButton("clear-saved-data", this.root.localization.t("clearSavedData"), () => this.showConfirmation()),
    );
  }

  public dispose(): void {
    this.clearPendingSave();
    this.confirmation.isVisible = false;
  }

  private createVolumeControl(id: string, labelKey: StringKey, value: number): Slider {
    const label = this.root.createText(`${id}-label`, this.root.localization.t(labelKey), 20);
    label.height = "32px";
    label.textHorizontalAlignment = this.textAlignment();
    this.root.add(this.parent, label);

    const slider = new Slider(id);
    slider.minimum = 0;
    slider.maximum = 1;
    slider.step = 0.01;
    slider.value = value;
    slider.width = "280px";
    slider.height = "30px";
    slider.color = "#fff7df";
    slider.background = "#24354f";
    slider.borderColor = "#fff7df";
    slider.thumbColor = "#a6503d";
    slider.isThumbCircle = true;
    slider.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    this.root.track(id, slider, () => this.root.localization.t(labelKey));
    this.root.add(this.parent, slider);
    return slider;
  }

  private createMuteControl(checked: boolean): Checkbox {
    const row = new StackPanel("mute-audio-row");
    row.isVertical = false;
    row.width = "280px";
    row.height = "42px";
    row.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    this.root.track("mute-audio-row", row);

    const checkbox = new Checkbox("mute-audio");
    checkbox.width = "34px";
    checkbox.height = "34px";
    checkbox.color = "#fff7df";
    checkbox.background = "#24354f";
    checkbox.checkSizeRatio = 0.68;
    checkbox.isChecked = checked;
    this.root.track("mute-audio", checkbox, () => this.root.localization.t("audioMute"));

    const label = this.root.createText("mute-audio-label", this.root.localization.t("audioMute"), 20);
    label.width = "226px";
    label.height = "42px";
    label.textHorizontalAlignment = this.textAlignment();
    if (this.root.localization.direction === "rtl") {
      this.root.add(row, label);
      this.root.add(row, checkbox);
    } else {
      this.root.add(row, checkbox);
      this.root.add(row, label);
    }
    this.root.add(this.parent, row);
    return checkbox;
  }

  private createConfirmation(): ReturnType<UiRoot["createOverlay"]> {
    const overlay = this.root.createOverlay("clear-data-confirmation");
    const panel = new StackPanel("clear-data-confirmation-panel");
    panel.width = "340px";
    panel.spacing = 12;
    panel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    panel.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
    this.root.track("clear-data-confirmation-panel", panel);
    this.root.add(overlay, panel);

    const message = this.root.createText(
      "clear-data-confirmation-message",
      this.root.localization.t("clearDataConfirm"),
      24,
    );
    message.height = "84px";
    message.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    this.root.add(panel, message);
    this.root.add(
      panel,
      this.root.createButton("confirm-clear-data", this.root.localization.t("confirmClearData"), () => this.confirmClear()),
    );
    this.root.add(
      panel,
      this.root.createButton("cancel-clear-data", this.root.localization.t("cancelClearData"), () => this.hideConfirmation()),
    );
    overlay.isVisible = false;
    return overlay;
  }

  private handleSliderChange(): void {
    if (this.applyingSettings) return;
    this.options.callbacks.change(this.snapshot());
    this.clearPendingSave();
    this.saveTimer = window.setTimeout(() => {
      this.saveTimer = undefined;
      this.options.callbacks.persist(this.snapshot());
    }, SAVE_DEBOUNCE_MS);
  }

  private handleMuteChange(): void {
    if (this.applyingSettings) return;
    const settings = this.snapshot();
    this.options.callbacks.change(settings);
    this.options.callbacks.persist(settings);
  }

  private confirmClear(): void {
    this.clearPendingSave();
    this.applySettings(this.options.callbacks.clear());
    this.hideConfirmation();
  }

  private applySettings(settings: AudioSettings): void {
    this.applyingSettings = true;
    this.music.value = settings.musicVolume;
    this.sfx.value = settings.sfxVolume;
    this.mute.isChecked = settings.muted;
    this.applyingSettings = false;
  }

  private snapshot(): AudioSettings {
    return {
      musicVolume: this.music.value,
      sfxVolume: this.sfx.value,
      muted: this.mute.isChecked,
    };
  }

  private showConfirmation(): void {
    this.parent.isVisible = false;
    this.confirmation.isVisible = true;
  }

  private hideConfirmation(): void {
    this.confirmation.isVisible = false;
    this.parent.isVisible = true;
  }

  private clearPendingSave(): void {
    if (this.saveTimer === undefined) return;
    window.clearTimeout(this.saveTimer);
    this.saveTimer = undefined;
  }

  private textAlignment(): number {
    return this.root.localization.direction === "rtl"
      ? Control.HORIZONTAL_ALIGNMENT_RIGHT
      : Control.HORIZONTAL_ALIGNMENT_LEFT;
  }
}
