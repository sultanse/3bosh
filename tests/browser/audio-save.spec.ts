import { expect, test, type Page } from "@playwright/test";

const activate = (page: Page, id: string) =>
  page.evaluate((controlId) => window.__GAME_UI_HARNESS__?.activate(controlId), id);

const setValue = (page: Page, id: string, value: number) =>
  page.evaluate(
    ({ controlId, controlValue }) => window.__GAME_UI_HARNESS__?.setValue(controlId, controlValue),
    { controlId: id, controlValue: value },
  );

const controlValue = (page: Page, id: string) =>
  page.evaluate(
    (controlId) => window.__GAME_UI_HARNESS__?.diagnostics().ui?.controls.find((control) => control.id === controlId)?.value,
    id,
  );

const isVisible = (page: Page, id: string) =>
  page.evaluate(
    (controlId) => window.__GAME_UI_HARNESS__?.diagnostics().ui?.controls.find((control) => control.id === controlId)?.visible,
    id,
  );

test("audio settings persist exactly and confirmed clearing remains storage-scoped", async ({ page }) => {
  // Given
  await page.goto("/");
  await expect(page.locator("[data-boot-status]")).toHaveAttribute("data-boot-status", "ready");
  await page.evaluate(() => window.localStorage.setItem("unrelated.preference", "keep-me"));
  expect(await activate(page, "open-settings")).toBe(true);

  // When
  expect(await setValue(page, "music-volume", 0.4)).toBe(true);
  expect(await setValue(page, "sfx-volume", 0.7)).toBe(true);
  expect(await setValue(page, "mute-audio", 1)).toBe(true);

  // Then
  await expect.poll(() => page.evaluate(() => window.localStorage.getItem("3bosh.save"))).not.toBeNull();
  await page.reload();
  await expect(page.locator("[data-boot-status]")).toHaveAttribute("data-boot-status", "ready");
  expect(await activate(page, "open-settings")).toBe(true);
  expect(await controlValue(page, "music-volume")).toBe(0.4);
  expect(await controlValue(page, "sfx-volume")).toBe(0.7);
  expect(await controlValue(page, "mute-audio")).toBe(1);

  expect(await activate(page, "clear-saved-data")).toBe(true);
  expect(await isVisible(page, "clear-data-confirmation")).toBe(true);
  expect(await activate(page, "confirm-clear-data")).toBe(true);

  expect(await controlValue(page, "music-volume")).toBe(0.7);
  expect(await controlValue(page, "sfx-volume")).toBe(0.7);
  expect(await controlValue(page, "mute-audio")).toBe(0);
  expect(
    await page.evaluate(() => ({
      game: window.localStorage.getItem("3bosh.save"),
      unrelated: window.localStorage.getItem("unrelated.preference"),
    })),
  ).toEqual({ game: null, unrelated: "keep-me" });
});
