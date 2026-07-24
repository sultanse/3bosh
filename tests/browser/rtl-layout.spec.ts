import { expect, test } from "@playwright/test";

interface Bounds { readonly x: number; readonly y: number; readonly width: number; readonly height: number }
interface Control { readonly id: string; readonly text: string | null; readonly visible: boolean; readonly pixelBounds: Bounds }

const visible = (controls: readonly Control[], id: string): Control => {
  const control = controls.find((entry) => entry.id === id);
  if (!control) throw new Error(`Missing GUI control: ${id}`);
  return control;
};

const overlaps = (a: Bounds, b: Bounds): boolean =>
  a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;

test("RTL HUD and end controls stay contained with tutorial text wrapped", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("[data-boot-status]")).toHaveAttribute("data-boot-status", "ready");
  await page.evaluate(() => window.__GAME_UI_HARNESS__?.activate("start-game"));
  await expect.poll(() => page.evaluate(() => window.__GAME_UI_HARNESS__?.diagnostics().flowState)).toBe("playing");
  await page.waitForTimeout(100);
  const diagnostic = await page.evaluate(() => window.__GAME_UI_HARNESS__?.diagnostics().ui);
  expect(diagnostic?.direction).toBe("rtl");
  const controls = diagnostic?.controls ?? [];
  const hud = [visible(controls, "hud-health"), visible(controls, "hud-score"), visible(controls, "hud-collectibles")];
  for (const control of hud) {
    expect(control.visible).toBe(true);
    expect(control.pixelBounds.x).toBeGreaterThanOrEqual(0);
    expect(control.pixelBounds.y).toBeGreaterThanOrEqual(0);
    expect(control.pixelBounds.x + control.pixelBounds.width).toBeLessThanOrEqual((diagnostic?.viewport.width ?? 0) + 1);
  }
  expect(overlaps(hud[0]!.pixelBounds, hud[1]!.pixelBounds)).toBe(false);
  expect(overlaps(hud[1]!.pixelBounds, hud[2]!.pixelBounds)).toBe(false);

  await page.keyboard.press("Escape");
  await expect.poll(() => page.evaluate(() => window.__GAME_UI_HARNESS__?.diagnostics().flowState)).toBe("paused");
  const paused = await page.evaluate(() => window.__GAME_UI_HARNESS__?.diagnostics().ui);
  const pauseButton = visible(paused?.controls ?? [], "resume");
  expect(pauseButton.pixelBounds.x + pauseButton.pixelBounds.width).toBeLessThanOrEqual((paused?.viewport.width ?? 0) + 1);
  expect(pauseButton.pixelBounds.y + pauseButton.pixelBounds.height).toBeLessThanOrEqual((paused?.viewport.height ?? 0) + 1);
});
