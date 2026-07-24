import { expect, test } from "@playwright/test";

interface Bounds { readonly x: number; readonly y: number; readonly width: number; readonly height: number }
interface Control { readonly id: string; readonly text: string | null; readonly visible: boolean; readonly pixelBounds: Bounds; readonly lineCount?: number }

const visible = (controls: readonly Control[], id: string): Control => {
  const control = controls.find((entry) => entry.id === id);
  if (!control) throw new Error(`Missing GUI control: ${id}`);
  return control;
};

const overlaps = (a: Bounds, b: Bounds): boolean =>
  a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;

const expectContained = (control: Control, viewport: Readonly<{ width: number; height: number }>): void => {
  expect(control.pixelBounds.x).toBeGreaterThanOrEqual(0);
  expect(control.pixelBounds.y).toBeGreaterThanOrEqual(0);
  expect(control.pixelBounds.x + control.pixelBounds.width).toBeLessThanOrEqual(viewport.width + 1);
  expect(control.pixelBounds.y + control.pixelBounds.height).toBeLessThanOrEqual(viewport.height + 1);
};

test("RTL HUD and end controls stay contained with tutorial text wrapped", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("[data-boot-status]")).toHaveAttribute("data-boot-status", "ready");
  await page.evaluate(() => window.__GAME_UI_HARNESS__?.activate("start-game"));
  await expect.poll(() => page.evaluate(() => window.__GAME_UI_HARNESS__?.diagnostics().flowState)).toBe("playing");
  await page.waitForTimeout(100);
  const diagnostic = await page.evaluate(() => window.__GAME_UI_HARNESS__?.diagnostics().ui);
  expect(diagnostic?.direction).toBe("rtl");
  const controls = diagnostic?.controls ?? [];
  const health = visible(controls, "hud-health");
  const score = visible(controls, "hud-score");
  const collectibles = visible(controls, "hud-collectibles");
  for (const control of [health, score, collectibles]) {
    expect(control.visible).toBe(true);
    expectContained(control, diagnostic?.viewport ?? { width: 0, height: 0 });
  }
  expect(overlaps(health.pixelBounds, score.pixelBounds)).toBe(false);
  expect(overlaps(score.pixelBounds, collectibles.pixelBounds)).toBe(false);
  await page.evaluate(() => window.__GAME_UI_HARNESS__?.forceDamage());
  await expect.poll(() => page.evaluate(() => window.__GAME_UI_HARNESS__?.diagnostics().ui?.controls.find((control) => control.id === "hud-damage-flash")?.visible)).toBe(true);
  const flash = visible((await page.evaluate(() => window.__GAME_UI_HARNESS__?.diagnostics().ui))?.controls ?? [], "hud-damage-flash");
  expectContained(flash, diagnostic?.viewport ?? { width: 0, height: 0 });
  const tutorial = visible(controls, "tutorial-message");
  expect(tutorial.visible).toBe(true);
  expect(tutorial.text).toContain("استخدم أسهم الاتجاهات");
  expect(tutorial.lineCount).toBeGreaterThan(1);
  expect(tutorial.pixelBounds.height).toBeGreaterThanOrEqual((tutorial.lineCount ?? 0) * 22);
  expectContained(tutorial, diagnostic?.viewport ?? { width: 0, height: 0 });

  await page.keyboard.press("Escape");
  await expect.poll(() => page.evaluate(() => window.__GAME_UI_HARNESS__?.diagnostics().flowState)).toBe("paused");
  const paused = await page.evaluate(() => window.__GAME_UI_HARNESS__?.diagnostics().ui);
  const pauseButton = visible(paused?.controls ?? [], "resume");
  expectContained(pauseButton, paused?.viewport ?? { width: 0, height: 0 });

  await page.evaluate(() => window.__GAME_UI_HARNESS__?.activate("resume"));
  await expect.poll(() => page.evaluate(() => window.__GAME_UI_HARNESS__?.diagnostics().flowState)).toBe("playing");
  await page.evaluate(() => window.__GAME_UI_HARNESS__?.forceVictory());
  await expect.poll(() => page.evaluate(() => window.__GAME_UI_HARNESS__?.diagnostics().flowState)).toBe("victory");
  const victory = await page.evaluate(() => window.__GAME_UI_HARNESS__?.diagnostics().ui);
  for (const id of ["victory-title", "victory-restart", "victory-menu"]) {
    expectContained(visible(victory?.controls ?? [], id), victory?.viewport ?? { width: 0, height: 0 });
  }

  await page.evaluate(() => window.__GAME_UI_HARNESS__?.activate("victory-restart"));
  await expect.poll(() => page.evaluate(() => window.__GAME_UI_HARNESS__?.diagnostics().flowState)).toBe("playing");
  await page.evaluate(() => window.__GAME_UI_HARNESS__?.forceGameOver());
  await expect.poll(() => page.evaluate(() => window.__GAME_UI_HARNESS__?.diagnostics().flowState)).toBe("gameOver");
  const gameOver = await page.evaluate(() => window.__GAME_UI_HARNESS__?.diagnostics().ui);
  for (const id of ["gameOver-title", "gameOver-restart", "gameOver-menu"]) {
    expectContained(visible(gameOver?.controls ?? [], id), gameOver?.viewport ?? { width: 0, height: 0 });
  }
});
