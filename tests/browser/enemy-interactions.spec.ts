import { expect, test } from "@playwright/test";

const boot = async (page: import("@playwright/test").Page, renderFps: number): Promise<void> => {
  await page.goto(`/?level=test&renderFps=${renderFps}`);
  await expect(page.locator("[data-boot-status]")).toHaveAttribute("data-boot-status", "ready");
};

for (const renderFps of [30, 60, 120]) {
  test(`enemy contacts classify exactly once at ${renderFps} FPS`, async ({ page }) => {
    await boot(page, renderFps);
    await page.evaluate(() => window.__GAME_TEST_HARNESS__?.teleportPlayer(31, 1));
    await expect.poll(() => page.evaluate(() => window.__GAME_DIAGNOSTICS__?.player?.health)).toBe(2);
    await page.waitForTimeout(250);
    expect(await page.evaluate(() => window.__GAME_DIAGNOSTICS__?.player?.health)).toBe(2);

    await page.goto(`/?level=test&renderFps=${renderFps}`);
    await expect(page.locator("[data-boot-status]")).toHaveAttribute("data-boot-status", "ready");
    await page.evaluate(() => window.__GAME_TEST_HARNESS__?.teleportPlayer(31, 3.1));
    await expect.poll(() => page.evaluate(() => window.__GAME_DIAGNOSTICS__?.player)).toMatchObject({
      health: 3,
      score: 100,
      defeatedEnemies: 1,
    });
  });
}

test("shooter activates in range, damages the player, and its projectile is pooled", async ({ page }) => {
  await boot(page, 60);
  await page.evaluate(() => window.__GAME_TEST_HARNESS__?.teleportPlayer(75, 1));
  await expect.poll(() => page.evaluate(() => window.__GAME_DIAGNOSTICS__?.player?.health)).toBe(2);
  await page.evaluate(() => window.__GAME_TEST_HARNESS__?.teleportPlayer(3, 1));
  await expect.poll(() => page.evaluate(() => window.__GAME_DIAGNOSTICS__?.player?.activeProjectiles)).toBe(0);
});
