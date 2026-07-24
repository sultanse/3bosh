import { expect, test } from "@playwright/test";

test("checkpoint respawns a fallen player until the attempt ends", async ({ page }) => {
  await page.goto("/?level=test");
  await expect(page.locator("[data-boot-status]")).toHaveAttribute("data-boot-status", "ready");

  await page.evaluate(() => window.__GAME_TEST_HARNESS__?.activateCheckpoint());
  await expect.poll(() => page.evaluate(() => window.__GAME_DIAGNOSTICS__?.player?.activeCheckpointId))
    .toBe("checkpoint-workshop-gate");

  await page.evaluate(() => window.__GAME_TEST_HARNESS__?.forceFall());
  await expect.poll(() => page.evaluate(() => window.__GAME_DIAGNOSTICS__?.player)).toMatchObject({
    health: 2,
    activeCheckpointId: "checkpoint-workshop-gate",
    respawnProtected: true,
    flowState: "playing",
  });
  const respawn = await page.evaluate(() => window.__GAME_DIAGNOSTICS__?.player);
  expect(respawn?.lastRespawn).toEqual({ x: 65, y: 1.5, velocityX: 0, velocityY: 0 });

  await page.evaluate(() => window.__GAME_TEST_HARNESS__?.forceFall());
  await expect.poll(() => page.evaluate(() => window.__GAME_DIAGNOSTICS__?.player?.health)).toBe(1);
  await page.evaluate(() => window.__GAME_TEST_HARNESS__?.forceFall());
  await expect.poll(() => page.evaluate(() => window.__GAME_DIAGNOSTICS__?.player)).toMatchObject({
    health: 0,
    flowState: "gameOver",
  });
});
