import { expect, test } from "@playwright/test";

for (const renderFps of [30, 60, 120] as const) {
  test(`Havok probe is stable at ${renderFps} render FPS`, async ({ page }) => {
    await page.goto(`/?probe=physics&renderFps=${renderFps}`);
    await expect(page.locator("[data-boot-status]")).toHaveAttribute(
      "data-boot-status",
      "ready",
      { timeout: 15_000 },
    );

    await expect
      .poll(() =>
        page.evaluate(() => window.__GAME_DIAGNOSTICS__?.physicsProbe),
      )
      .toMatchObject({
        supported: true,
        grounded: true,
        zDriftWithinTolerance: true,
        movingPlatformCarry: true,
        enemyTriggerEntered: true,
        enemyTriggerExited: true,
        duplicateTriggerEvents: false,
      });
  });
}
