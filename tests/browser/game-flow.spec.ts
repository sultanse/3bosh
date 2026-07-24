import { expect, test } from "@playwright/test";

const ui = (page: import("@playwright/test").Page) => page.evaluate(() => window.__GAME_UI_HARNESS__?.diagnostics());
const activate = (page: import("@playwright/test").Page, id: string) =>
  page.evaluate((controlId) => window.__GAME_UI_HARNESS__?.activate(controlId), id);

test("the Arabic game UI routes menu, pause, restart, victory and game-over actions", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("[data-boot-status]")).toHaveAttribute("data-boot-status", "ready");
  await expect.poll(() => ui(page)).toMatchObject({ flowState: "menu" });
  expect((await ui(page))?.ui?.controls).toContainEqual(expect.objectContaining({ id: "start-game", text: "ابدأ اللعب" }));
  expect((await page.screenshot()).byteLength).toBeGreaterThan(1_000);

  expect(await activate(page, "start-game")).toBe(true);
  await expect.poll(() => ui(page)).toMatchObject({ flowState: "playing" });
  await page.keyboard.press("Escape");
  await expect.poll(() => ui(page)).toMatchObject({ flowState: "paused" });
  expect(await activate(page, "resume")).toBe(true);
  await expect.poll(() => ui(page)).toMatchObject({ flowState: "playing" });

  await page.keyboard.press("Escape");
  await expect.poll(() => ui(page)).toMatchObject({ flowState: "paused" });
  expect(await activate(page, "restart-level")).toBe(true);
  await expect.poll(() => ui(page)).toMatchObject({ flowState: "playing" });

  await page.evaluate(() => window.__GAME_UI_HARNESS__?.forceVictory());
  await expect.poll(() => ui(page)).toMatchObject({ flowState: "victory" });
  expect(await activate(page, "victory-menu")).toBe(true);
  await expect.poll(() => ui(page)).toMatchObject({ flowState: "menu" });

  expect(await activate(page, "start-game")).toBe(true);
  await expect.poll(() => ui(page)).toMatchObject({ flowState: "playing" });
  await page.evaluate(() => window.__GAME_UI_HARNESS__?.forceGameOver());
  await expect.poll(() => ui(page)).toMatchObject({ flowState: "gameOver" });
  expect(await activate(page, "gameOver-restart")).toBe(true);
  await expect.poll(() => ui(page)).toMatchObject({ flowState: "playing" });
});
