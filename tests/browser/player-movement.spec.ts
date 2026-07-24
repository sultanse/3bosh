import { expect, test } from "@playwright/test";

test("player moves, jumps once, lands, and remains on the gameplay plane", async ({
  page,
}) => {
  await page.goto("/?level=test");
  await page.keyboard.down("KeyD");
  await page.waitForTimeout(500);
  await page.keyboard.press("Space");
  await page.keyboard.press("Space");
  await page.waitForTimeout(1200);
  await page.keyboard.up("KeyD");

  const player = await page.evaluate(() => window.__GAME_DIAGNOSTICS__?.player);
  expect(player?.x).toBeGreaterThan(1);
  expect(player?.grounded).toBe(true);
  expect(Math.abs(player?.z ?? 99)).toBeLessThanOrEqual(0.001);
  expect(player?.airJumpCount).toBe(0);
});

test("movement distance and jump apex remain stable across render rates", async ({ page }) => {
  const samples = new Map<number, { x: number; jumpApexY: number }>();

  for (const renderFps of [30, 60, 120]) {
    await page.goto(`/?level=test&renderFps=${renderFps}`);
    await expect(page.locator("[data-boot-status]")).toHaveAttribute(
      "data-boot-status",
      "ready",
    );
    await page.evaluate(() => window.__GAME_TEST_HARNESS__?.startFixedMovementScenario());
    await page.waitForFunction(
      () => (window.__GAME_DIAGNOSTICS__?.player?.fixedSteps ?? 0) >= 180,
    );

    const player = await page.evaluate(() => window.__GAME_DIAGNOSTICS__?.player);
    expect(player).toBeDefined();
    samples.set(renderFps, {
      x: player?.fixedStep180?.x ?? 0,
      jumpApexY: player?.fixedStep180?.jumpApexY ?? 0,
    });
  }

  const baseline = samples.get(60);
  expect(baseline).toBeDefined();
  expect(baseline?.jumpApexY).toBeGreaterThan(1.1);
  for (const renderFps of [30, 120]) {
    const sample = samples.get(renderFps);
    expect(sample).toBeDefined();
    expect(Math.abs((sample?.x ?? 0) - (baseline?.x ?? 0)) / Math.max(1, Math.abs(baseline?.x ?? 0))).toBeLessThanOrEqual(0.02);
    expect(Math.abs((sample?.jumpApexY ?? 0) - (baseline?.jumpApexY ?? 0)) / Math.max(1, Math.abs(baseline?.jumpApexY ?? 0))).toBeLessThanOrEqual(0.02);
  }
});
