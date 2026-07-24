import { expect, test, type Page } from "@playwright/test";

interface Bounds { readonly x: number; readonly y: number; readonly width: number; readonly height: number }
interface Control { readonly id: string; readonly visible: boolean; readonly pixelBounds: Bounds }

const diagnostics = (page: Page) => page.evaluate(() => window.__GAME_UI_HARNESS__?.diagnostics());
const player = (page: Page) => page.evaluate(() => window.__GAME_UI_HARNESS__?.player?.());
const controlOf = async (page: Page, id: string): Promise<Control | undefined> =>
  page.evaluate((controlId) => {
    const control = window.__GAME_UI_HARNESS__?.diagnostics().ui?.controls.find((entry) => entry.id === controlId);
    return control ? { id: control.id, visible: control.visible, pixelBounds: control.pixelBounds } : undefined;
  }, id);

const startPlaying = async (page: Page): Promise<void> => {
  await expect(page.locator("[data-boot-status]")).toHaveAttribute("data-boot-status", "ready");
  await expect.poll(() => diagnostics(page)).toMatchObject({ flowState: "menu" });
  expect(await page.evaluate(() => window.__GAME_UI_HARNESS__?.activate("start-game"))).toBe(true);
  await expect.poll(() => diagnostics(page)).toMatchObject({ flowState: "playing" });
};

test("touch zones drive simultaneous move and jump on a phone viewport", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-360x640", "multi-touch gameplay is asserted on the phone viewport");

  await page.goto("/");
  await startPlaying(page);

  const moveRight = await controlOf(page, "moveRight");
  const jump = await controlOf(page, "jump");
  const moveLeft = await controlOf(page, "moveLeft");
  expect(moveRight?.visible).toBe(true);
  expect(jump?.visible).toBe(true);
  expect(moveLeft?.visible).toBe(true);

  // Wait until the player has settled on the ground, then record the baseline.
  await expect.poll(() => player(page).then((p) => p?.grounded), { timeout: 5_000 }).toBe(true);
  const baseline = await player(page);
  expect(baseline).toBeTruthy();
  const startX = baseline?.x ?? 0;
  const groundY = baseline?.y ?? 0;

  // Dispatch two genuinely simultaneous canvas pointers: right + jump.
  await page.evaluate(() => {
    const canvas = document.querySelector<HTMLCanvasElement>("#game-canvas");
    const diag = window.__GAME_UI_HARNESS__?.diagnostics();
    if (!canvas || !diag?.ui) throw new Error("missing canvas or diagnostics");
    const rect = canvas.getBoundingClientRect();
    const viewport = diag.ui.viewport;
    const scaleX = rect.width / viewport.width;
    const scaleY = rect.height / viewport.height;
    const zone = (id: string): { x: number; y: number } => {
      const control = diag.ui?.controls.find((entry) => entry.id === id);
      if (!control) throw new Error(`missing zone ${id}`);
      const b = control.pixelBounds;
      return {
        x: rect.left + (b.x + b.width / 2) * scaleX,
        y: rect.top + (b.y + b.height / 2) * scaleY,
      };
    };
    const rightCenter = zone("moveRight");
    const jumpCenter = zone("jump");
    const fire = (type: string, pointerId: number, point: { x: number; y: number }): void => {
      canvas.dispatchEvent(new PointerEvent(type, {
        pointerId,
        clientX: point.x,
        clientY: point.y,
        bubbles: true,
        cancelable: true,
        pointerType: "touch",
        isPrimary: pointerId === 11,
      }));
    };
    fire("pointerdown", 11, rightCenter);
    fire("pointerdown", 12, jumpCenter);
    window.__mobileControlsTeardown__ = () => {
      fire("pointerup", 11, rightCenter);
      fire("pointerup", 12, jumpCenter);
    };
  });

  // Hold the pointers and capture the peak height and rightmost travel reached.
  let peakY = groundY;
  let maxX = startX;
  for (let i = 0; i < 12; i += 1) {
    await page.waitForTimeout(50);
    const snapshot = await player(page);
    if (snapshot) {
      peakY = Math.max(peakY, snapshot.y);
      maxX = Math.max(maxX, snapshot.x);
    }
  }

  await page.evaluate(() => window.__mobileControlsTeardown__?.());

  expect(maxX).toBeGreaterThan(startX + 0.5);
  expect(peakY).toBeGreaterThan(groundY + 0.4);

  // The zones must be at least 72 CSS-equivalent pixels across.
  const canvasScale = await page.evaluate(() => {
    const canvas = document.querySelector<HTMLCanvasElement>("#game-canvas");
    const viewport = window.__GAME_UI_HARNESS__?.diagnostics().ui?.viewport;
    if (!canvas || !viewport) throw new Error("missing canvas metrics");
    return canvas.getBoundingClientRect().width / viewport.width;
  });
  expect((moveRight?.pixelBounds.width ?? 0) * canvasScale).toBeGreaterThanOrEqual(72);
  expect((jump?.pixelBounds.width ?? 0) * canvasScale).toBeGreaterThanOrEqual(72);

  // The page must never scroll or zoom under gameplay gestures.
  const pageState = await page.evaluate(() => ({
    scrollY: window.scrollY,
    scale: window.visualViewport?.scale ?? 1,
  }));
  expect(pageState.scrollY).toBe(0);
  expect(pageState.scale).toBe(1);
});

test("touch controls appear only for coarse pointers or the test override", async ({ page }, testInfo) => {
  const zonesVisible = async (): Promise<boolean> => {
    const ids = ["moveLeft", "moveRight", "jump"];
    for (const id of ids) {
      const control = await controlOf(page, id);
      if (control?.visible !== true) return false;
    }
    return true;
  };

  if (testInfo.project.name === "mobile-360x640") {
    await page.goto("/");
    await startPlaying(page);
    expect(await zonesVisible()).toBe(true);
    return;
  }

  await page.goto("/");
  await startPlaying(page);
  expect(await zonesVisible()).toBe(false);

  await page.goto("/?touchControls=1");
  await startPlaying(page);
  expect(await zonesVisible()).toBe(true);
});
