import { expect, test } from "@playwright/test";

const boot = async (page: import("@playwright/test").Page, renderFps: number): Promise<void> => {
  await page.goto(`/?level=test&renderFps=${renderFps}`);
  await expect(page.locator("[data-boot-status]")).toHaveAttribute("data-boot-status", "ready");
};

for (const renderFps of [30, 60, 120]) {
  test(`a hidden crystal contributes exactly once at ${renderFps} FPS`, async ({ page }) => {
    await boot(page, renderFps);
    await page.evaluate(() => window.__GAME_TEST_HARNESS__?.teleportPlayer(58, -1.5));
    await expect.poll(() => page.evaluate(() => window.__GAME_DIAGNOSTICS__?.player)).toMatchObject({
      score: 75,
      collectibles: 1,
    });
    await page.waitForTimeout(150);
    expect(await page.evaluate(() => window.__GAME_DIAGNOSTICS__?.player)).toMatchObject({
      score: 75,
      collectibles: 1,
    });
  });
}

test("health remains available at maximum and shield blocks one projectile hit", async ({ page }) => {
  await boot(page, 60);
  await page.evaluate(() => window.__GAME_TEST_HARNESS__?.teleportPlayer(72, 1));
  await page.waitForTimeout(150);
  expect(await page.evaluate(() => window.__GAME_DIAGNOSTICS__?.player)).toMatchObject({ health: 3, collectibles: 0 });

  await page.evaluate(() => window.__GAME_TEST_HARNESS__?.forceFall());
  await expect.poll(() => page.evaluate(() => window.__GAME_DIAGNOSTICS__?.player?.health)).toBe(2);
  await page.evaluate(() => window.__GAME_TEST_HARNESS__?.teleportPlayer(72, 1));
  await expect.poll(() => page.evaluate(() => window.__GAME_DIAGNOSTICS__?.player)).toMatchObject({ health: 3, collectibles: 1 });

  await page.evaluate(() => window.__GAME_TEST_HARNESS__?.teleportPlayer(86, 1));
  await expect.poll(() => page.evaluate(() => window.__GAME_DIAGNOSTICS__?.player?.collectibles)).toBe(2);
  await page.evaluate(() => window.__GAME_TEST_HARNESS__?.fireProjectileAt(86, 1, 0));
  await page.waitForTimeout(100);
  expect(await page.evaluate(() => window.__GAME_DIAGNOSTICS__?.player?.health)).toBe(3);
});
