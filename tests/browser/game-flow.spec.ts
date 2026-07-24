import { expect, test } from "@playwright/test";

const ui = (page: import("@playwright/test").Page) => page.evaluate(() => window.__GAME_UI_HARNESS__?.diagnostics());
const activate = (page: import("@playwright/test").Page, id: string) =>
  page.evaluate((controlId) => window.__GAME_UI_HARNESS__?.activate(controlId), id);
const label = async (page: import("@playwright/test").Page, id: string): Promise<string | null | undefined> =>
  page.evaluate((controlId) => window.__GAME_UI_HARNESS__?.diagnostics().ui?.controls.find((control) => control.id === controlId)?.text, id);

test("the Arabic game UI routes menu, pause, restart, victory and game-over actions", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("[data-boot-status]")).toHaveAttribute("data-boot-status", "ready");
  await expect.poll(() => ui(page)).toMatchObject({ flowState: "menu" });
  expect(await label(page, "start-game")).toBe("ابدأ اللعب");
  expect(await label(page, "open-settings")).toBe("الإعدادات");
  expect(await activate(page, "open-settings")).toBe(true);
  expect(await label(page, "clear-saved-data")).toBe("مسح البيانات المحفوظة");
  expect(await label(page, "close-settings")).toBe("القائمة الرئيسية");
  expect(await activate(page, "clear-saved-data")).toBe(true);
  expect(await activate(page, "close-settings")).toBe(true);
  expect(await label(page, "start-game")).toBe("ابدأ اللعب");
  expect((await page.screenshot()).byteLength).toBeGreaterThan(1_000);

  expect(await activate(page, "start-game")).toBe(true);
  await expect.poll(() => ui(page)).toMatchObject({ flowState: "playing" });
  expect(await label(page, "hud-pause")).toBe("إيقاف مؤقت");
  expect(await activate(page, "hud-pause")).toBe(true);
  await expect.poll(() => ui(page)).toMatchObject({ flowState: "paused" });
  await expect.poll(() => label(page, "resume")).toBe("متابعة");
  expect(await label(page, "restart-level")).toBe("إعادة المستوى");
  expect(await label(page, "return-to-menu")).toBe("القائمة الرئيسية");
  expect(await activate(page, "resume")).toBe(true);
  await expect.poll(() => ui(page)).toMatchObject({ flowState: "playing" });

  expect(await activate(page, "hud-pause")).toBe(true);
  await expect.poll(() => ui(page)).toMatchObject({ flowState: "paused" });
  expect(await activate(page, "restart-level")).toBe(true);
  await expect.poll(() => ui(page)).toMatchObject({ flowState: "playing" });

  await page.evaluate(() => window.__GAME_UI_HARNESS__?.forceVictory());
  await expect.poll(() => ui(page)).toMatchObject({ flowState: "victory" });
  expect(await label(page, "victory-title")).toBe("أحسنت! وصلت إلى البوابة");
  expect(await label(page, "victory-restart")).toBe("إعادة المستوى");
  expect(await label(page, "victory-menu")).toBe("القائمة الرئيسية");
  expect(await activate(page, "victory-menu")).toBe(true);
  await expect.poll(() => ui(page)).toMatchObject({ flowState: "menu" });

  expect(await activate(page, "start-game")).toBe(true);
  await expect.poll(() => ui(page)).toMatchObject({ flowState: "playing" });
  await page.evaluate(() => window.__GAME_UI_HARNESS__?.forceGameOver());
  await expect.poll(() => ui(page)).toMatchObject({ flowState: "gameOver" });
  expect(await label(page, "gameOver-title")).toBe("انتهت المحاولة");
  expect(await label(page, "gameOver-restart")).toBe("إعادة المستوى");
  expect(await label(page, "gameOver-menu")).toBe("القائمة الرئيسية");
  expect(await activate(page, "gameOver-restart")).toBe(true);
  await expect.poll(() => ui(page)).toMatchObject({ flowState: "playing" });
});

test("loading failure presents a localized recoverable error and retry", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/?failLevelLoad=1&levelLoadDelayMs=200");
  await expect(page.locator("[data-boot-status]")).toHaveAttribute("data-boot-status", "ready");

  expect(await activate(page, "start-game")).toBe(true);
  await expect.poll(() => ui(page)).toMatchObject({ flowState: "loadingLevel" });
  await expect.poll(() => label(page, "loading-title")).toBe("جارٍ تحميل المرحلة…");
  await expect.poll(() => ui(page)).toMatchObject({ flowState: "menu" });
  expect(await label(page, "load-error-title")).toBe("تعذر تحميل المرحلة");
  expect(await label(page, "retry-level-load")).toBe("أعد المحاولة");

  expect(await activate(page, "retry-level-load")).toBe(true);
  await expect.poll(() => ui(page)).toMatchObject({ flowState: "playing" });
  expect(errors).toEqual([]);
});
