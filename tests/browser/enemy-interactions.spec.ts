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

test("a projectile hitting an authored platform begins its invisible pool grace", async ({ page }) => {
  await boot(page, 60);
  await page.evaluate(() => (
    window.__GAME_TEST_HARNESS__ as unknown as {
      fireProjectileAt?: (x: number, y: number, velocityX: number) => void;
    } | undefined
  )?.fireProjectileAt?.(91.5, 1.2, 7));
  await expect.poll(() => page.evaluate(() => window.__GAME_DIAGNOSTICS__?.player?.activeProjectiles)).toBe(1);
  await expect.poll(() => page.evaluate(() => window.__GAME_DIAGNOSTICS__?.player?.activeProjectiles)).toBe(0);
});

test("a stomp applies the real bounce and renders at least one camera-shake sample", async ({ page }) => {
  await boot(page, 60);
  await page.evaluate(() => window.__GAME_TEST_HARNESS__?.teleportPlayer(31, 3.1));
  await expect.poll(() => page.evaluate(() => window.__GAME_DIAGNOSTICS__?.player)).toMatchObject({
    defeatedEnemies: 1,
    stompBounceCount: 1,
  });
  await expect.poll(() => page.evaluate(() => window.__GAME_DIAGNOSTICS__?.player?.verticalVelocity ?? 0)).toBeGreaterThan(0);
  await expect.poll(() => page.evaluate(() => window.__GAME_DIAGNOSTICS__?.player?.cameraShakeSamples ?? 0)).toBeGreaterThan(0);
});

test("a shooter stays dormant out of range and fires on its configured cadence in range", async ({ page }) => {
  await boot(page, 60);
  await page.waitForTimeout(350);
  expect(await page.evaluate(() => window.__GAME_DIAGNOSTICS__?.player?.projectilesFired)).toBe(0);

  await page.evaluate(() => window.__GAME_TEST_HARNESS__?.teleportPlayer(75, 1));
  await expect.poll(() => page.evaluate(() => window.__GAME_DIAGNOSTICS__?.player?.projectilesFired)).toBe(1);
  await page.waitForTimeout(400);
  expect(await page.evaluate(() => window.__GAME_DIAGNOSTICS__?.player?.projectilesFired)).toBe(1);
  await expect.poll(() => page.evaluate(() => window.__GAME_DIAGNOSTICS__?.player?.projectilesFired)).toBe(2);
});

test("the patrol's animated Havok trigger body follows its fixed-step movement", async ({ page }) => {
  await boot(page, 60);
  const before = await page.evaluate(() => window.__GAME_DIAGNOSTICS__?.player?.patrolPhysicsX);
  expect(before).toBeDefined();
  await page.waitForTimeout(450);
  const after = await page.evaluate(() => window.__GAME_DIAGNOSTICS__?.player?.patrolPhysicsX);
  expect(Math.abs((after ?? 0) - (before ?? 0))).toBeGreaterThan(0.2);
});
