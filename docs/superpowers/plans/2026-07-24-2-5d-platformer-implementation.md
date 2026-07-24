# 2.5D Babylon.js Platformer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** بناء إصدار أول كامل وقابل للعب من لعبة منصات 2.5D أصلية، عربية وملائمة للجوال، داخل مشروع `3bosh`.

**Architecture:** تطبيق Vite/TypeScript خفيف يقوده `GameApp` و`SceneRouter` وحالة تدفق صريحة. تركّب `LevelScene` وحدات مستقلة للاعب والفيزياء والكاميرا والمستوى والأعداء والعناصر وBabylon GUI، مع فصل قواعد اللعب عن العرض، واستخدام Havok Character Controller وحلقة لعب ثابتة 60Hz.

**Tech Stack:** TypeScript 6، Vite 8.1، Babylon.js/Core/GUI/Loaders 9.18.0، Havok 1.3.13، Vitest، Playwright.

## Global Constraints

- المشروع المستهدف: `/Users/sultan/dev/my_projects/3bosh`.
- لا يبدأ التنفيذ إلا بعد موافقة المستخدم الصريحة؛ هذه الوثيقة خطة فقط.
- استخدم Babylon.js وTypeScript وVite وBabylon GUI وHavok Physics V2.
- لا تستخدم React.
- العربية هي اللغة الافتراضية مع RTL، والإنجليزية موجودة كبنية ترجمة قابلة للتفعيل.
- اللاعب يتحرك على X وY ويقفل سلطويًا عند `Z = 0`.
- تحديث اللعب ثابت عند 60Hz والرسم مستقل عنه.
- القفزة المزدوجة معطلة افتراضيًا وقابلة للتفعيل من الإعداد.
- السقوط يخصم نقطة صحة ثم يعيد اللاعب إلى آخر checkpoint؛ نفاد الصحة يؤدي إلى Game Over.
- لا تعتمد اللعبة على أصل خارجي مفقود، ولا تستخدم أي أصل أو اسم أو تصميم محمي.
- استخدم TypeScript strict وتجنب `any`.
- نظف observers ومستمعي DOM والموارد الفيزيائية وBabylon GUI عند التخلص من المشهد.
- استخدم pooling للمقذوفات والمؤثرات المتكررة.
- معيار البناء: `npm run build` ينجح بلا أخطاء TypeScript.
- Vite 8 يتطلب Node.js `20.19+` أو `22.12+`؛ تحقق من ذلك قبل التثبيت.

---

## خريطة الملفات

### ملفات الاستضافة والأدوات

- `package.json`: الاعتماديات وأوامر dev/build/test.
- `package-lock.json`: نسخ التبعيات المقفلة.
- `tsconfig.json`: strict TypeScript وإعدادات DOM والاختبارات.
- `vite.config.ts`: إعداد Vite واستثناء Havok من pre-bundle.
- `vitest.config.ts`: اختبارات الوحدة في بيئة Node.
- `playwright.config.ts`: تشغيل build محلي واختبارات Chromium.
- `index.html`: canvas ومعلومات اللغة والـviewport.
- `src/styles/main.css`: ملء الشاشة ومنع scroll/zoom وsafe areas.

### النواة والتطبيق

- `src/main.ts`: نقطة الدخول الوحيدة.
- `src/app/GameApp.ts`: Engine والحلقة والتخلص.
- `src/app/SceneRouter.ts`: انتقالات المشاهد وإلغاؤها.
- `src/app/GameFlowMachine.ts`: الحالات والانتقالات القانونية.
- `src/app/GameSession.ts`: النتيجة العليا وإعدادات الجلسة.
- `src/app/LevelSession.ts`: نقاط ومقتنيات وcheckpoint للمحاولة الحالية.
- `src/config/GameConfig.ts`: جميع قيم اللعب المركزية.
- `src/core/DisposableBag.ts`: ملكية الموارد القابلة للتخلص.
- `src/core/TypedEventBus.ts`: أحداث typed بين الميزات.
- `src/core/Result.ts`: نجاح/فشل typed للتحميل.
- `src/dev/GameTestHarness.ts`: أوامر وتشخيصات deterministic متاحة في DEV/test فقط.

### الخدمات والإدخال

- `src/services/AssetService.ts`: تحميل الأصول مع fallback.
- `src/services/AudioService.ts`: الموسيقى والمؤثرات والمستويات وautoplay unlock.
- `src/services/SaveService.ts`: مخطط حفظ versioned.
- `src/services/LocalizationService.ts`: اللغة والاتجاه والنصوص.
- `src/input/InputAction.ts`: snapshot أفعال موحد.
- `src/input/InputManager.ts`: دمج keyboard وtouch.
- `src/input/KeyboardInputSource.ts`: لوحة المفاتيح.
- `src/input/TouchInputSource.ts`: مؤشرات اللمس المتعددة.

### المشاهد والفيزياء واللعب

- `src/scenes/BootScene.ts`: تهيئة Havok والخدمات وشاشة التحميل.
- `src/scenes/MenuScene.ts`: مشهد القائمة.
- `src/scenes/LevelScene.ts`: composition root لجلسة المستوى.
- `src/physics/HavokWorld.ts`: تهيئة plugin وأجسام الفيزياء.
- `src/physics/PhysicsCharacterAdapter.ts`: غلاف Character Controller.
- `src/physics/CollisionLayers.ts`: masks مركزية.
- `src/gameplay/player/*`: الحركة والحالات والصحة والعرض.
- `src/gameplay/camera/*`: التتبع والحدود والاهتزاز.
- `src/gameplay/interactions/*`: تصنيف تلامس اللاعب والأعداء وتطبيق نتيجته.
- `src/gameplay/level/*`: بيانات المستوى والبناء والمنصات والمخاطر والهدف.
- `src/gameplay/enemies/*`: العقد المشترك ونوعا الأعداء.
- `src/gameplay/projectiles/*`: المقذوف وpool.
- `src/gameplay/items/*`: البلورة والصحة والدرع.

### الواجهة والتوطين

- `src/ui/*`: Babylon GUI للقوائم وHUD والتحكم المحمول.
- `src/localization/strings.ts`: مفاتيح الترجمة.
- `src/localization/ar.ts`: النصوص العربية.
- `src/localization/en.ts`: النصوص الإنجليزية.

### الاختبارات

- `tests/unit/*`: قواعد نقية بلا WebGL.
- `tests/browser/*`: Havok والتدفقات داخل Chromium.
- `tests/browser/fixtures/gameHarness.ts`: قراءة حالة تشخيصية من اللعبة من دون النقر العشوائي.

---

### Task 1: تثبيت الأساس والأدوات ودورة حياة التطبيق

**Files:**
- Modify: `package.json`
- Modify: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `vitest.config.ts`
- Create: `playwright.config.ts`
- Modify: `index.html`
- Replace: `src/main.ts`
- Replace: `src/style.css` with `src/styles/main.css`
- Delete: `src/counter.ts`
- Delete: `src/assets/typescript.svg`
- Delete: `src/assets/vite.svg`
- Delete: `src/assets/hero.png`
- Create: `src/app/GameApp.ts`
- Create: `src/core/DisposableBag.ts`
- Create: `tests/unit/DisposableBag.test.ts`

**Interfaces:**
- Produces: `DisposableBag.add(disposable: DisposableLike): void`, `DisposableBag.dispose(): void`.
- Produces: `GameApp.start(): Promise<void>`, `GameApp.dispose(): void`.

- [ ] **Step 1: تحقق من runtime وحالة المجلد**

Run:

```bash
cd /Users/sultan/dev/my_projects/3bosh
node --version
npm --version
git status --short --branch
```

Expected:

- Node يطابق `20.19+` أو `22.12+`.
- المشروع على `master...origin/master`، والتغييرات الوحيدة قبل التنفيذ هي `docs/`. إذا ظهرت تغييرات أخرى، توقف وراجعها مع المستخدم.

- [ ] **Step 2: سجل وثائق التصميم والخطة قبل لمس القالب**

Run:

```bash
git add docs/superpowers/specs/2026-07-24-2-5d-platformer-design.md docs/superpowers/plans/2026-07-24-2-5d-platformer-implementation.md
git commit -m "docs: add platformer design and implementation plan"
```

Expected: commit يوثق خط الأساس المعتمد، وتبقى ملفات القالب الحالية بلا تعديل.

- [ ] **Step 3: ثبّت التبعيات بنسخ Babylon/Havok المحددة**

Run:

```bash
npm install --save-exact @babylonjs/core@9.18.0 @babylonjs/gui@9.18.0 @babylonjs/havok@1.3.13 @babylonjs/loaders@9.18.0
npm install --save-dev --save-exact vitest@latest @playwright/test@1.61.1 @types/node@latest
npx playwright install chromium
```

Expected: تحديث `package.json` و`package-lock.json` بلا peer dependency errors.

- [ ] **Step 4: حدّث scripts وإعداد TypeScript**

اجعل scripts في `package.json`:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "build:test": "tsc --noEmit && vite build --mode test",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:browser": "playwright test",
    "check": "npm run test && npm run build"
  }
}
```

استبدل `tsconfig.json` كاملًا بـ:

```json
{
  "compilerOptions": {
    "target": "ES2023",
    "module": "ESNext",
    "lib": ["ES2023", "DOM", "DOM.Iterable"],
    "types": ["vite/client", "node"],
    "skipLibCheck": true,
    "moduleResolution": "Bundler",
    "strict": true,
    "noEmit": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "useDefineForClassFields": true
  },
  "include": [
    "src",
    "tests",
    "vite.config.ts",
    "vitest.config.ts",
    "playwright.config.ts"
  ]
}
```

Expected: لا تستخدم enums أو parameter properties بما يتعارض مع `erasableSyntaxOnly`; استخدم string unions وحقول classes صريحة.

- [ ] **Step 5: اكتب اختبار DisposableBag الفاشل**

Create `tests/unit/DisposableBag.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import { DisposableBag } from "../../src/core/DisposableBag";

describe("DisposableBag", () => {
  it("disposes owned resources once in reverse order", () => {
    const order: string[] = [];
    const bag = new DisposableBag();
    bag.addCallback(() => order.push("first"));
    bag.addCallback(() => order.push("second"));

    bag.dispose();
    bag.dispose();

    expect(order).toEqual(["second", "first"]);
  });

  it("immediately disposes resources added after disposal", () => {
    const dispose = vi.fn();
    const bag = new DisposableBag();
    bag.dispose();
    bag.add({ dispose });
    expect(dispose).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 6: شغّل الاختبار لإثبات الفشل**

Run:

```bash
npx vitest run tests/unit/DisposableBag.test.ts
```

Expected: FAIL لأن `src/core/DisposableBag.ts` غير موجود.

- [ ] **Step 7: نفذ النواة الدنيا ودورة حياة Engine**

Create `src/core/DisposableBag.ts`:

```ts
export interface DisposableLike {
  dispose(): void;
}

export class DisposableBag implements DisposableLike {
  private readonly disposables: DisposableLike[] = [];
  private disposed = false;

  public add(disposable: DisposableLike): void {
    if (this.disposed) {
      disposable.dispose();
      return;
    }
    this.disposables.push(disposable);
  }

  public addCallback(callback: () => void): void {
    this.add({ dispose: callback });
  }

  public dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (const disposable of this.disposables.splice(0).reverse()) {
      disposable.dispose();
    }
  }
}
```

Implement `GameApp` with Babylon as the sole simulation scheduler. Construct `Engine` with:

```ts
const engineOptions: EngineOptions = {
  deterministicLockstep: true,
  timeStep: 1 / 60,
  lockstepMaxSteps: 4,
  stencil: true,
  audioEngine: true,
  adaptToDeviceRatio: true,
};
```

Do not create a second accumulator or call physics `_step` directly. `Scene` features later attach gameplay updates to `onBeforeStepObservable` and `onAfterStepObservable`.

`GameApp` must expose:

```ts
export interface GameAppOptions {
  canvas: HTMLCanvasElement;
}

export class GameApp {
  public constructor(options: GameAppOptions);
  public start(): Promise<void>;
  public dispose(): void;
}
```

`start()` ينشئ `Engine(options.canvas, true)`, يسجل resize، ويبدأ render loop. في هذه المهمة يعرض Scene فارغًا بلون واضح فقط. `dispose()` يوقف render loop ويزيل resize ثم يتخلص من Scene وEngine.

Replace `src/main.ts` with:

```ts
import "./styles/main.css";
import { GameApp } from "./app/GameApp";

const canvas = document.querySelector<HTMLCanvasElement>("#game-canvas");
if (!canvas) throw new Error("Missing #game-canvas");

const app = new GameApp({ canvas });
void app.start();
window.addEventListener("pagehide", () => app.dispose(), { once: true });
```

Update `index.html` to use `<html lang="ar" dir="rtl">`, viewport containing `user-scalable=no`, and:

```html
<main id="app">
  <canvas id="game-canvas" aria-label="لعبة منصات ثلاثية الأبعاد"></canvas>
</main>
```

`src/styles/main.css` must set `html, body, #app, #game-canvas` to full viewport, `overflow: hidden`, `touch-action: none`, `overscroll-behavior: none`, and canvas `display: block`.

- [ ] **Step 8: أضف إعداد الاختبارات والبناء**

`vite.config.ts`:

```ts
import { defineConfig } from "vite";

export default defineConfig({
  optimizeDeps: { exclude: ["@babylonjs/havok"] },
  build: { target: "es2023" },
});
```

`vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts"],
  },
});
```

`playwright.config.ts`:

```ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "tests/browser",
  use: { baseURL: "http://127.0.0.1:4173", trace: "retain-on-failure" },
  webServer: {
    command: "npm run build:test && npm run preview -- --host 127.0.0.1",
    port: 4173,
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    {
      name: "mobile-360x640",
      use: {
        ...devices["Pixel 7"],
        viewport: { width: 360, height: 640 },
      },
    },
  ],
});
```

- [ ] **Step 9: تحقق وسجل المهمة**

Run:

```bash
npm run test
npm run build
git add package.json package-lock.json tsconfig.json vite.config.ts vitest.config.ts playwright.config.ts index.html src tests
git commit -m "chore: establish Babylon game foundation"
```

Expected: unit test PASS وbuild PASS.

---

### Task 2: إعداد العقود الأساسية والتوطين والحفظ

**Files:**
- Create: `src/core/Result.ts`
- Create: `src/core/TypedEventBus.ts`
- Create: `src/app/GameFlowMachine.ts`
- Create: `src/app/GameSession.ts`
- Create: `src/app/LevelSession.ts`
- Create: `src/localization/strings.ts`
- Create: `src/localization/ar.ts`
- Create: `src/localization/en.ts`
- Create: `src/services/LocalizationService.ts`
- Create: `src/services/SaveService.ts`
- Create: `tests/unit/GameFlowMachine.test.ts`
- Create: `tests/unit/LevelSession.test.ts`
- Create: `tests/unit/SaveService.test.ts`
- Create: `tests/unit/LocalizationService.test.ts`

**Interfaces:**
- Produces: `GameFlowState = "boot" | "menu" | "loadingLevel" | "playing" | "paused" | "victory" | "gameOver"`.
- Produces: `GameFlowMachine.transition(next: GameFlowState): void`.
- Produces: `SaveService.load(): SaveData`, `saveAudio(settings): void`, `saveHighScore(score): void`, `clear(): void`.
- Produces: `LocalizationService.t(key: StringKey): string`, `direction: "rtl" | "ltr"`.
- Produces: `LevelSession` as the only owner of score, collectibles, active checkpoint, collected item IDs, and goal state; `PlayerHealth` remains the only owner of health.
- Produces: `GameEvents` typed event map used by later tasks.

- [ ] **Step 1: اكتب اختبارات الحالات والحفظ والترجمة**

`GameFlowMachine.test.ts` must assert:

```ts
const flow = new GameFlowMachine("boot");
flow.transition("menu");
flow.transition("loadingLevel");
flow.transition("playing");
flow.transition("paused");
flow.transition("playing");
flow.transition("victory");
expect(flow.state).toBe("victory");
expect(() => flow.transition("paused")).toThrow("Illegal game flow transition");
```

`SaveService.test.ts` must use an in-memory `Storage` fake and assert:

```ts
storage.setItem("3bosh.save", "{broken");
expect(service.load()).toEqual(DEFAULT_SAVE_DATA);

service.saveAudio({ musicVolume: 0.4, sfxVolume: 0.8, muted: true });
service.saveHighScore(250);
expect(service.load()).toMatchObject({ highScore: 250, muted: true });

service.saveHighScore(100);
expect(service.load().highScore).toBe(250);

service.clear();
expect(storage.getItem("3bosh.save")).toBeNull();
```

`LocalizationService.test.ts` must assert Arabic defaults, RTL, English switch, and that every `StringKey` exists in both dictionaries.

`LevelSession.test.ts` must assert that a new attempt starts at the spawn checkpoint with zero score/collectibles, activates a checkpoint once, rejects duplicate item IDs, and completes the goal once. Health must not appear in `LevelSessionSnapshot`.

- [ ] **Step 2: شغّل الاختبارات لإثبات الفشل**

Run:

```bash
npx vitest run tests/unit/GameFlowMachine.test.ts tests/unit/LevelSession.test.ts tests/unit/SaveService.test.ts tests/unit/LocalizationService.test.ts
```

Expected: FAIL بسبب modules المفقودة.

- [ ] **Step 3: نفذ العقود بقيم صريحة**

Use:

```ts
export type Result<T, E> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };
```

Define `StringKey` as a union generated from a readonly `STRINGS` object containing all menu, HUD, tutorial, error, victory, game-over, audio, clear-data, and control labels. Define dictionaries as:

```ts
export type TranslationDictionary = Readonly<Record<StringKey, string>>;
```

Define `SaveData` exactly:

```ts
export interface SaveData {
  readonly version: 1;
  readonly highScore: number;
  readonly musicVolume: number;
  readonly sfxVolume: number;
  readonly muted: boolean;
  readonly locale: "ar" | "en";
}
```

Validation rules: score is a non-negative finite integer; volumes clamp to `[0, 1]`; booleans and locale must have exact types; malformed or unknown versions return `DEFAULT_SAVE_DATA`.

Define `GameEvents` with payloads:

```ts
export interface GameEvents {
  readonly playerJumped: { readonly kind: "ground" | "coyote" | "double" };
  readonly playerDamaged: {
    readonly health: number;
    readonly amount: number;
    readonly source: "enemy" | "projectile" | "fall";
  };
  readonly healthChanged: { readonly health: number; readonly maxHealth: number };
  readonly shieldChanged: { readonly active: boolean; readonly expiresAtSeconds: number | null };
  readonly playerDied: undefined;
  readonly playerRespawned: { readonly x: number; readonly y: number };
  readonly scoreChanged: { readonly score: number; readonly collectibles: number };
  readonly collectibleCollected: {
    readonly kind: "crystal" | "health" | "shield";
    readonly scoreDelta: number;
  };
  readonly enemyDefeated: { readonly enemyId: string; readonly scoreDelta: number };
  readonly checkpointActivated: { readonly checkpointId: string };
  readonly levelCompleted: { readonly score: number; readonly collectibles: number };
  readonly pauseRequested: undefined;
  readonly restartRequested: undefined;
}
```

Define `LevelSessionSnapshot` exactly:

```ts
export interface LevelSessionSnapshot {
  readonly score: number;
  readonly collectibles: number;
  readonly collectedItemIds: ReadonlySet<string>;
  readonly activeCheckpointId: string | null;
  readonly activeCheckpointPosition: Readonly<{ x: number; y: number; z: number }>;
  readonly goalReached: boolean;
}
```

`LevelSession` exposes `activateCheckpoint`, `collect`, `addScore`, and `completeGoal`; every successful mutation emits the matching typed event. It does not store health. `GameSession` owns the current `LevelSession` and finalizes high score on victory or Game Over.

`TypedEventBus` exposes `on<K extends keyof T>(key, listener): DisposableLike` and `emit<K extends keyof T>(key, payload): void`, snapshots listeners before iteration, and clears all listeners on dispose.

- [ ] **Step 4: تحقق وسجل المهمة**

Run:

```bash
npm run test
npm run build
git add src/core src/app/GameFlowMachine.ts src/app/GameSession.ts src/app/LevelSession.ts src/localization src/services/LocalizationService.ts src/services/SaveService.ts tests/unit
git commit -m "feat: add typed flow localization and save services"
```

Expected: جميع اختبارات الوحدة PASS وbuild PASS.

---

### Task 3: بوابة جدوى Havok وCharacter Controller

**Files:**
- Create: `src/config/GameConfig.ts`
- Create: `src/physics/CollisionLayers.ts`
- Create: `src/physics/HavokWorld.ts`
- Create: `src/physics/PhysicsCharacterAdapter.ts`
- Create: `src/scenes/BootScene.ts`
- Create: `src/scenes/PhysicsProbeScene.ts`
- Create: `src/dev/DeterministicTestEngine.ts`
- Modify: `src/app/GameApp.ts`
- Create: `tests/browser/physics-probe.spec.ts`

**Interfaces:**
- Produces: `HavokWorld.create(scene: Scene): Promise<HavokWorld>`.
- Produces: `PhysicsCharacterAdapter.readMotion(stepSeconds): CharacterMotionSnapshot`.
- Produces: `PhysicsCharacterAdapter.step(command: CharacterStepCommand): CharacterStepResult`.
- Produces: `setPosition(Vector3)`, `resetVelocity()`, `dispose()`.
- Produces: `window.__GAME_DIAGNOSTICS__` only in development/test builds.

- [ ] **Step 1: اكتب اختبار المتصفح الفاشل للبوابة**

`tests/browser/physics-probe.spec.ts`:

```ts
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
```

Add a typed declaration in `src/vite-env.d.ts`; do not use `any`.

- [ ] **Step 2: شغّل الاختبار لإثبات الفشل**

Run:

```bash
npx playwright test tests/browser/physics-probe.spec.ts --project=chromium
```

Expected: FAIL لأن probe route والتشخيص غير موجودين.

- [ ] **Step 3: عرّف الإعدادات وطبقات الاصطدام**

`GameConfig.ts` exports one deeply readonly object with these initial values:

```ts
export const GAME_CONFIG = {
  fixedStepSeconds: 1 / 60,
  lockstepMaxSteps: 4,
  gravity: -24,
  gameplayZ: 0,
  zLockEpsilon: 0.001,
  player: {
    radius: 0.42,
    height: 1.8,
    maxHealth: 3,
    moveSpeed: 6.5,
    groundAcceleration: 38,
    groundDeceleration: 44,
    airAcceleration: 18,
    jumpSpeed: 10.5,
    coyoteSeconds: 0.1,
    jumpBufferSeconds: 0.12,
    doubleJumpEnabled: false,
    invulnerabilitySeconds: 1.25,
    respawnProtectionSeconds: 1,
  },
  camera: {
    verticalSize: 10,
    deadZoneWidth: 3.5,
    deadZoneHeight: 2,
    damping: 9,
  },
  fallThresholdY: -8,
} as const;
```

Define collision membership and masks with named numeric bit flags for world, player, enemy, projectile, trigger, and collectible.

- [ ] **Step 4: نفذ HavokWorld وPhysicsCharacterAdapter**

`HavokWorld.create` must:

1. `await HavokPhysics()`.
2. create `HavokPlugin(true, havok)` so it consumes the deterministic scene-step delta.
3. call `scene.enablePhysics(new Vector3(0, GAME_CONFIG.gravity, 0), plugin)`.
4. call `scene.getPhysicsEngine()?.setTimeStep(GAME_CONFIG.fixedStepSeconds)`.
5. wrap initialization failures in a typed `HavokInitializationError`.

Babylon owns the global Havok step through `scene.render()` under deterministic lockstep. Never call the private `_step` method. Register gameplay/platform work on `scene.onBeforeStepObservable` and contact/view work on `scene.onAfterStepObservable`.

`PhysicsCharacterAdapter` is the **only owner of character gravity**. `PlayerController` must never subtract gravity. The adapter follows the official cycle:

```ts
const support = controller.checkSupport(stepSeconds, Vector3.Down());
const currentVelocity = controller.getVelocity();
const velocityY =
  command.overrideVelocityY === null
    ? currentVelocity.y
    : command.overrideVelocityY;
controller.setVelocity(new Vector3(command.velocityX, velocityY, 0));
controller.integrate(
  stepSeconds,
  support,
  new Vector3(0, GAME_CONFIG.gravity, 0),
);
const position = controller.getPosition();
if (Math.abs(position.z - GAME_CONFIG.gameplayZ) > GAME_CONFIG.zLockEpsilon) {
  controller.setPosition(
    new Vector3(position.x, position.y, GAME_CONFIG.gameplayZ),
  );
}
```

Use these internal contracts:

```ts
export interface CharacterMotionSnapshot {
  readonly support: CharacterSupport;
  readonly position: Readonly<Vector3>;
  readonly velocity: Readonly<Vector3>;
}

export interface CharacterStepCommand {
  readonly stepSeconds: number;
  readonly velocityX: number;
  readonly overrideVelocityY: number | null;
}
```

Map Babylon support results into `CharacterSupport` so player logic never imports Havok types directly. Scene gravity remains configured for other physics bodies; it does not replace the explicit gravity passed to Character Controller integration.

- [ ] **Step 5: أنشئ PhysicsProbeScene**

The probe scene must create:

- static ground box.
- invisible front/back static depth walls.
- character capsule at `(0, 3, 0)`.
- animated platform moving deterministically between `x = 3` and `x = 7`.
- one enemy-sized Havok trigger traversed by the character to verify enter/exit delivery without relying on a collision normal.
- orthographic side camera and one hemispheric light.
- DOM boot status attribute for Playwright.
- a diagnostic state that becomes successful only after landing, remaining within Z epsilon for 120 fixed ticks, and riding the moving platform for 60 fixed ticks.

In test mode, `DeterministicTestEngine` extends `Engine` only to inject an exact `getDeltaTime()` of `1000 / renderFps` milliseconds while a manual render driver calls `beginFrame → scene.render → endFrame`. Production always uses normal `Engine.runRenderLoop`. This makes 30/60/120 tests deterministic without private Havok stepping.

If Babylon 9.18 changed a Character Controller signature, inspect the installed `.d.ts`, adapt only `PhysicsCharacterAdapter`, and keep its public interface unchanged.

- [ ] **Step 6: تحقق من البوابة قبل أي نظام لعب آخر**

Run:

```bash
npm run build
npx playwright test tests/browser/physics-probe.spec.ts --project=chromium
npx playwright test tests/browser/physics-probe.spec.ts --project=mobile-360x640
```

Expected: PASS على المشروعين. إذا فشل حمل المنصة، طبّق fallback delta داخل adapter واكتب assertion تمنع تطبيق surface velocity وdelta اليدوي معًا.

- [ ] **Step 7: سجل المهمة**

Run:

```bash
git add src/config src/physics src/scenes src/app/GameApp.ts src/dev/DeterministicTestEngine.ts src/vite-env.d.ts tests/browser
git commit -m "feat: validate Havok character controller integration"
```

---

### Task 4: الإدخال وحالة اللاعب وقواعد الحركة

**Files:**
- Create: `src/input/InputAction.ts`
- Create: `src/input/InputManager.ts`
- Create: `src/input/KeyboardInputSource.ts`
- Create: `src/input/TouchInputSource.ts`
- Create: `src/gameplay/player/PlayerStateMachine.ts`
- Create: `src/gameplay/player/PlayerController.ts`
- Create: `tests/unit/InputManager.test.ts`
- Create: `tests/unit/PlayerStateMachine.test.ts`
- Create: `tests/unit/PlayerController.test.ts`

**Interfaces:**
- Produces: `InputSnapshot`.
- Produces: `InputManager.sample(): InputSnapshot`.
- Produces: `PlayerController.update(stepSeconds, input, motion, nowSeconds): PlayerMotorCommand`.
- Produces: `PlayerController.resetMotion(): void`, `queueVerticalImpulse(value: number): void`.
- Produces: `PlayerController.enterHurt(untilSeconds): void`, `markDead(): void`, `revive(): void`.
- Consumes: `CharacterMotionSnapshot` from Task 3.
- Produces: `PlayerMotorCommand { velocityX, overrideVelocityY, state, facing, acceptedJump }`.

- [ ] **Step 1: اكتب اختبارات الإدخال والحركة الفاشلة**

Test exact behaviors:

```ts
expect(manager.sample()).toEqual({
  moveAxis: 0,
  jumpPressed: false,
  jumpHeld: false,
  pausePressed: false,
  restartPressed: false,
});
```

Then assert keyboard left + touch right resolve to the most recently activated non-zero direction, two pointers can hold right and jump simultaneously, and blur clears all held actions.

For the player:

```ts
const controller = createController();
const running = controller.update(STEP, RIGHT_HELD, GROUNDED_MOTION, 0);
expect(running.state).toBe("running");
expect(running.velocityX).toBeGreaterThan(0);
expect(running.velocityX).toBeLessThanOrEqual(GAME_CONFIG.player.moveSpeed);

const jumping = controller.update(STEP, JUMP_PRESSED, GROUNDED_MOTION, STEP);
expect(jumping.state).toBe("jumping");
expect(jumping.overrideVelocityY).toBe(GAME_CONFIG.player.jumpSpeed);

const repeated = controller.update(STEP, JUMP_PRESSED, AIRBORNE_MOTION, STEP * 2);
expect(repeated.overrideVelocityY).toBeNull();
```

Add cases for coyote time, jump buffer, acceleration, deceleration, falling state from adapter velocity, facing direction, disabled/enabled double jump, `enterHurt` expiry, `markDead`, and `revive`.

- [ ] **Step 2: شغّل الاختبارات لإثبات الفشل**

Run:

```bash
npx vitest run tests/unit/InputManager.test.ts tests/unit/PlayerStateMachine.test.ts tests/unit/PlayerController.test.ts
```

Expected: FAIL بسبب الوحدات المفقودة.

- [ ] **Step 3: نفذ InputSnapshot ومصادر الإدخال**

Use:

```ts
export interface InputSnapshot {
  readonly moveAxis: -1 | 0 | 1;
  readonly jumpPressed: boolean;
  readonly jumpHeld: boolean;
  readonly pausePressed: boolean;
  readonly restartPressed: boolean;
}

export interface InputSource {
  sample(): InputSnapshot;
  dispose(): void;
}
```

`KeyboardInputSource` maps A/D/arrows, Space/W/ArrowUp, Escape, and R; it ignores repeated keydown for edge-triggered actions and clears on blur. `TouchInputSource` tracks `pointerId → action` and supports simultaneous pointers. `InputManager` merges held state and consumes edge-triggered flags once.

- [ ] **Step 4: نفذ PlayerStateMachine وPlayerController**

Use string union:

```ts
export type PlayerState =
  | "idle"
  | "running"
  | "jumping"
  | "falling"
  | "hurt"
  | "dead";
```

Rules:

- grounded + zero input → idle.
- grounded + non-zero input → running.
- accepted jump → jumping.
- positive vertical velocity → jumping.
- negative vertical velocity without support → falling.
- hurt and dead override locomotion states.
- state changes expose one typed callback for `PlayerView`.

PlayerController keeps horizontal velocity, last-supported time, buffered-jump time, used-air-jumps, queued vertical impulse, condition deadlines, and facing. Horizontal velocity moves toward target using `moveTowards(current, target, acceleration * stepSeconds)`. It reads vertical velocity from `CharacterMotionSnapshot` for state selection and **never applies gravity**. A buffered jump is consumed only when grounded/coyote or when the configured air jump is available, and acceptance produces `overrideVelocityY = jumpSpeed` for one adapter step.

`resetMotion()` zeros horizontal motion, support/buffer timers, queued impulses, and used air jumps for respawn; the adapter separately resets its velocity. `queueVerticalImpulse(value)` is the only later input for stomp bounce and emits one `overrideVelocityY`. `enterHurt` blocks locomotion transitions until its deadline, `markDead` is terminal for the attempt, and `revive` is allowed only after a non-terminal respawn.

- [ ] **Step 5: تحقق وسجل المهمة**

Run:

```bash
npm run test
npm run build
git add src/input src/gameplay/player tests/unit
git commit -m "feat: add deterministic player input and movement rules"
```

Expected: all unit tests PASS and build PASS.

---

### Task 5: اللاعب المرئي والصحة والكاميرا والشريحة القابلة للعب

**Files:**
- Create: `src/gameplay/player/PlayerHealth.ts`
- Create: `src/gameplay/player/PlayerView.ts`
- Create: `src/gameplay/camera/CameraShake.ts`
- Create: `src/gameplay/camera/SideCameraController.ts`
- Create: `src/scenes/LevelScene.ts`
- Create: `src/dev/GameTestHarness.ts`
- Modify: `src/app/GameApp.ts`
- Create: `tests/unit/PlayerHealth.test.ts`
- Create: `tests/unit/SideCameraController.test.ts`
- Create: `tests/browser/player-movement.spec.ts`

**Interfaces:**
- Produces: `PlayerHealth.damage(amount, source, nowSeconds): DamageResult`.
- Produces: `PlayerHealth.heal(amount): number`, `grantShield(durationSeconds, nowSeconds): void`, `grantInvulnerability(durationSeconds, nowSeconds): void`.
- Produces: `SideCameraController.update(target, stepSeconds): Vector3`.
- Consumes: `PhysicsCharacterAdapter`, `PlayerController`, `InputManager`.

- [ ] **Step 1: اكتب اختبارات الصحة والكاميرا**

`PlayerHealth.test.ts` must prove:

```ts
const health = new PlayerHealth(3, 1.25);
expect(health.damage(1, "enemy", 0)).toEqual({ applied: true, health: 2, died: false });
expect(health.damage(1, "enemy", 0.5).applied).toBe(false);
expect(health.damage(1, "enemy", 1.26).health).toBe(1);
expect(health.heal(10)).toBe(3);
```

Add exact source policy:

- shield and ordinary invulnerability block `enemy` and `projectile`.
- respawn protection uses `grantInvulnerability` and blocks `enemy` and `projectile`.
- `fall` bypasses shield and contact invulnerability and always costs one health, guaranteeing the approved falling rule.
- first blocked shield hit consumes shield; a later contact hit applies normally.

`SideCameraController.test.ts` must use pure numeric bounds and assert:

- target inside dead zone causes no camera motion.
- target outside dead zone moves with damping.
- camera center clamps with half orthographic width/height included.
- shake decays to zero and never reveals space beyond bounds.

- [ ] **Step 2: اكتب اختبار المتصفح لمسار الحركة**

`player-movement.spec.ts`:

```ts
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

  const player = await page.evaluate(
    () => window.__GAME_DIAGNOSTICS__?.player,
  );
  expect(player?.x).toBeGreaterThan(1);
  expect(player?.grounded).toBe(true);
  expect(Math.abs(player?.z ?? 99)).toBeLessThanOrEqual(0.001);
  expect(player?.airJumpCount).toBe(0);
});
```

- [ ] **Step 3: شغّل الاختبارات لإثبات الفشل**

Run:

```bash
npx vitest run tests/unit/PlayerHealth.test.ts tests/unit/SideCameraController.test.ts
npx playwright test tests/browser/player-movement.spec.ts --project=chromium
```

Expected: FAIL بسبب الوحدات والمسار المفقودين.

- [ ] **Step 4: نفذ الصحة وعرض اللاعب**

`DamageResult`:

```ts
export interface DamageResult {
  readonly applied: boolean;
  readonly health: number;
  readonly died: boolean;
  readonly blockedByShield?: boolean;
}
```

Define:

```ts
export type DamageSource = "enemy" | "projectile" | "fall";
```

`PlayerHealth` owns health, contact-invulnerability deadline, respawn-protection deadline through the same grant method, and optional shield deadline. It emits `healthChanged` and `shieldChanged` through an injected typed callback but performs no Babylon calls. Applied contact damage calls `PlayerController.enterHurt`; death calls `markDead`; a living respawn calls `revive`. `PlayerView` creates a root `TransformNode`, capsule/box primitive children with original colors, faces left/right by changing only the visual root rotation, and exposes:

```ts
public setPosition(position: Vector3): void;
public setFacing(facing: "left" | "right"): void;
public setState(state: PlayerState): void;
public flashDamage(durationSeconds: number): void;
public dispose(): void;
```

Use Babylon animations or fixed-step visual timers for idle bob, run tilt, jump squash, hurt flash; do not animate the physics root.

- [ ] **Step 5: نفذ الكاميرا**

Create a side `FreeCamera` or `UniversalCamera` at negative Z, set `mode = Camera.ORTHOGRAPHIC_CAMERA`, and update `orthoLeft/right/top/bottom` from `verticalSize` and aspect ratio.

Keep camera math pure:

```ts
export interface CameraBounds {
  readonly minX: number;
  readonly maxX: number;
  readonly minY: number;
  readonly maxY: number;
}
```

Apply dead-zone correction first, exponential damping `1 - exp(-damping * dt)` second, shake offset third, and final bounds clamp last.

- [ ] **Step 6: ركّب LevelScene الاختباري**

`LevelScene` creates:

- light and shadow generator with conservative map size.
- static ground and three static platforms.
- front/back invisible depth walls.
- Player controller, adapter, view, health, input, and camera.
- `scene.onBeforeStepObservable` order: sample input → update animated-platform target transforms → `adapter.readMotion` → compute player motor → `adapter.step` (single character-gravity application).
- Babylon then advances Havok once for that deterministic scene step.
- `scene.onAfterStepObservable` order: drain triggers/contacts → emit accepted jump/health events → update view → resolve interactions → camera.
- diagnostics in development/test only.

`GameApp` routes `?level=test` to this scene. Keep `PhysicsProbeScene` reachable for its test.

`GameTestHarness` is created only when `(import.meta.env.DEV || import.meta.env.MODE === "test")` and a test query parameter is present. It exposes typed read-only diagnostics plus commands `setInput`, `teleportPlayer`, `forceFall`, `activateCheckpoint`, `defeatEnemy`, `collectItem`, and `reachGoal`. Production builds without test mode never attach the harness.

- [ ] **Step 7: تحقق عند معدلات رسم مختلفة**

Add a diagnostic query parameter `?renderFps=30|60|120` that throttles rendering in test builds without changing fixed-step logic. Extend `player-movement.spec.ts` with a parameterized test that records X travel and jump apex for the same 180 fixed steps at all three render rates, then asserts each value differs from the 60 FPS baseline by at most 2%. Run:

```bash
npm run test
npx playwright test tests/browser/player-movement.spec.ts --project=chromium
npm run build
```

Expected: PASS, including the automated 30/60/120 comparison.

- [ ] **Step 8: سجل المهمة**

Run:

```bash
git add src/app src/scenes src/gameplay/player src/gameplay/camera src/dev tests
git commit -m "feat: deliver playable movement vertical slice"
```

---

### Task 6: تعريف المستوى وبناؤه والمنصات والمخاطر والـcheckpoint والهدف

**Files:**
- Create: `src/gameplay/level/LevelDefinition.ts`
- Create: `src/gameplay/level/LevelOne.ts`
- Create: `src/gameplay/level/PlatformFactory.ts`
- Create: `src/gameplay/level/MovingPlatform.ts`
- Create: `src/gameplay/level/Hazard.ts`
- Create: `src/gameplay/level/Checkpoint.ts`
- Create: `src/gameplay/level/Goal.ts`
- Create: `src/gameplay/level/ParallaxBackground.ts`
- Create: `src/gameplay/level/LevelBuilder.ts`
- Modify: `src/app/LevelSession.ts`
- Modify: `src/scenes/LevelScene.ts`
- Create: `tests/unit/LevelDefinition.test.ts`
- Create: `tests/browser/checkpoint-respawn.spec.ts`

**Interfaces:**
- Produces: `LevelDefinition` typed data contract.
- Produces: `LevelBuilder.build(definition): BuiltLevel`.
- Produces: `MovingPlatform.update(elapsedSeconds): PlatformMotion`.
- Produces: trigger callbacks for hazard, checkpoint, and goal.
- Consumes: `LevelSession` from Task 2 as the only checkpoint/goal owner.

- [ ] **Step 1: اكتب اختبار صحة بيانات المستوى**

`LevelDefinition.test.ts` must validate `LEVEL_ONE`:

```ts
expect(LEVEL_ONE.id).toBe("sunset-workshop-01");
expect(LEVEL_ONE.spawn.z).toBe(0);
expect(LEVEL_ONE.platforms.length).toBeGreaterThanOrEqual(10);
expect(LEVEL_ONE.movingPlatforms).toHaveLength(1);
expect(LEVEL_ONE.checkpoints).toHaveLength(1);
expect(LEVEL_ONE.goals).toHaveLength(1);
expect(LEVEL_ONE.hiddenAreas).toHaveLength(1);
expect(LEVEL_ONE.parallaxLayers).toHaveLength(3);
```

Also assert unique IDs, positive dimensions, camera bounds contain spawn and goal, all gameplay objects have `z = 0`, and each moving platform has distinct start/end points.

- [ ] **Step 2: اكتب اختبار checkpoint/respawn الفاشل**

The browser test performs:

1. start level.
2. move to checkpoint using test-only deterministic input harness.
3. assert checkpoint ID is active.
4. force player below `fallThresholdY` through test harness.
5. assert health changed from 3 to 2.
6. assert player respawned at checkpoint with zero velocity and protection active.
7. repeat until health reaches 0 and assert Game Over state.

- [ ] **Step 3: شغّل الاختبارات لإثبات الفشل**

Run:

```bash
npx vitest run tests/unit/LevelDefinition.test.ts
npx playwright test tests/browser/checkpoint-respawn.spec.ts --project=chromium
```

Expected: FAIL.

- [ ] **Step 4: عرّف LevelDefinition كاملًا**

Use readonly interfaces for:

```ts
export interface Vec3Data { readonly x: number; readonly y: number; readonly z: number }
export interface Size3Data { readonly width: number; readonly height: number; readonly depth: number }
export interface PlatformDefinition {
  readonly id: string;
  readonly position: Vec3Data;
  readonly size: Size3Data;
  readonly palette: "grass" | "stone" | "wood";
}
export interface MovingPlatformDefinition extends PlatformDefinition {
  readonly endPosition: Vec3Data;
  readonly travelSeconds: number;
  readonly pauseSeconds: number;
}
```

Also define hazards, checkpoints, goals, hidden areas, enemy/item slots, parallax layers, spawn, fall threshold, and camera bounds. Keep all geometry values in `LevelOne.ts`, not in factories.

- [ ] **Step 5: أنشئ محتوى المستوى الأول**

Use an original visual identity named **ورشة الغروب** (`sunset-workshop-01`). Lay out the X axis from `0` to about `120`, with:

- safe tutorial ground at X 0–14.
- first gap at X 15–19.
- patrol arena at X 24–38.
- moving platform crossing at X 42–54.
- hidden lower alcove reachable near X 58.
- checkpoint near X 64.
- shooter arena at X 72–88.
- final mixed platform section X 92–110.
- goal portal at X 116.

Every required platform, item, enemy slot, tutorial trigger, and hidden-area trigger must have a stable ID.

- [ ] **Step 6: نفذ factories والبناء**

`PlatformFactory` creates independent collider/root and visual child. `MovingPlatform` uses `PhysicsMotionType.ANIMATED` and analytic ping-pong interpolation with pause. Update its physics transform before the player each fixed tick.

`ParallaxBackground` creates three primitive-based layers with unlit or light materials and updates X by layer factor while keeping them outside gameplay collision masks.

`Hazard`, `Checkpoint`, and `Goal` use trigger bodies or bounded overlap checks isolated behind:

```ts
export interface LevelTrigger {
  readonly id: string;
  update(playerBounds: BoundingInfo): boolean;
  reset(): void;
  dispose(): void;
}
```

- [ ] **Step 7: دمج دورة السقوط والاسترجاع والهدف**

In `LevelScene`:

- initialize `LevelSession.activeCheckpointPosition` to spawn; never duplicate it in a `LevelScene` field.
- on fall/hazard, call `PlayerHealth.damage(1, "fall", now)`. Fall bypasses shield and ordinary invulnerability.
- if alive, call `PlayerController.resetMotion()` and `revive()`, reset adapter position/velocity, and call `PlayerHealth.grantInvulnerability(respawnProtectionSeconds, now)` for later enemy/projectile contacts.
- if dead, transition to `gameOver`.
- checkpoint calls `LevelSession.activateCheckpoint` once and emits through the session.
- goal calls `LevelSession.completeGoal` once, transitions to `victory`, and freezes gameplay updates.

- [ ] **Step 8: تحقق وسجل المهمة**

Run:

```bash
npm run test
npx playwright test tests/browser/checkpoint-respawn.spec.ts --project=chromium
npm run build
git add src/app/LevelSession.ts src/gameplay/level src/scenes/LevelScene.ts tests
git commit -m "feat: build level progression checkpoints and hazards"
```

---

### Task 7: الأعداء والدوس والمقذوفات المجمعة

**Files:**
- Create: `src/gameplay/enemies/EnemyController.ts`
- Create: `src/gameplay/enemies/EnemyView.ts`
- Create: `src/gameplay/enemies/PatrolEnemy.ts`
- Create: `src/gameplay/enemies/ShooterEnemy.ts`
- Create: `src/gameplay/projectiles/Projectile.ts`
- Create: `src/gameplay/projectiles/ProjectilePool.ts`
- Create: `src/gameplay/interactions/InteractionSystem.ts`
- Create: `src/physics/PhysicsContactAdapter.ts`
- Modify: `src/gameplay/level/LevelDefinition.ts`
- Modify: `src/gameplay/level/LevelOne.ts`
- Modify: `src/gameplay/level/LevelBuilder.ts`
- Modify: `src/scenes/LevelScene.ts`
- Create: `tests/unit/PatrolEnemy.test.ts`
- Create: `tests/unit/ProjectilePool.test.ts`
- Create: `tests/unit/StompClassifier.test.ts`
- Create: `tests/browser/enemy-interactions.spec.ts`

**Interfaces:**
- Produces: `EnemyController.update(context): void`, `takeDamage(amount, source): EnemyDamageResult`, `dispose()`.
- Produces: `PhysicsContactAdapter.drainPlayerEnemyContacts(): readonly PlayerEnemyContact[]`.
- Produces: `InteractionSystem.classify(contact): "stomp" | "side" | "none"`.
- Produces: fixed-capacity `ProjectilePool.acquire()` and `release(projectile)`.

- [ ] **Step 1: اكتب الاختبارات النقية**

`PatrolEnemy.test.ts` asserts patrol direction reverses at patrol bounds, world obstacle, and missing ground edge; defeated enemy stops updating and emits exactly one event.

`StompClassifier.test.ts` covers:

```ts
expect(classifyContact({
  previousPlayerBounds: bounds({ feetY: 3 }),
  currentPlayerBounds: bounds({ feetY: 2.4 }),
  enemyBounds: bounds({ topY: 2.5 }),
  relativeVelocity: { x: 0, y: -4, z: 0 },
})).toBe("stomp");

expect(classifyContact({
  previousPlayerBounds: bounds({ feetY: 2.2 }),
  currentPlayerBounds: bounds({ feetY: 2.1 }),
  enemyBounds: bounds({ topY: 2.5 }),
  relativeVelocity: { x: 3, y: -1, z: 0 },
})).toBe("side");
```

`ProjectilePool.test.ts` asserts capacity is fixed, inactive projectiles are reused, release is idempotent, lifetime expiry returns to pool, and no acquire allocates after warmup.

- [ ] **Step 2: اكتب اختبار المتصفح لمس العدو**

Test:

- side collision lowers health once and respects invulnerability.
- descending contact defeats patrol enemy, increments score, bounces player, and shakes camera.
- shooter fires on configured interval only in activation range.
- projectile damages player and returns to pool.
- parameterize stomp and side-contact scenarios with `renderFps = 30, 60, 120`; each must produce exactly one classification/event and the same score/health result.

- [ ] **Step 3: شغّل الاختبارات لإثبات الفشل**

Run:

```bash
npx vitest run tests/unit/PatrolEnemy.test.ts tests/unit/ProjectilePool.test.ts tests/unit/StompClassifier.test.ts
npx playwright test tests/browser/enemy-interactions.spec.ts --project=chromium
```

Expected: FAIL.

- [ ] **Step 4: نفذ عقد العدو والتصنيف**

Use:

```ts
export type EnemyKind = "patrol" | "shooter";
export type EnemyDamageSource = "stomp";

export interface EnemyUpdateContext {
  readonly stepSeconds: number;
  readonly playerPosition: Readonly<Vector3>;
  readonly worldQueries: EnemyWorldQueries;
}

export interface PlayerEnemyContact {
  readonly enemyId: string;
  readonly previousPlayerBounds: BoundsSnapshot;
  readonly currentPlayerBounds: BoundsSnapshot;
  readonly enemyBounds: BoundsSnapshot;
  readonly relativeVelocity: Readonly<Vector3>;
}
```

Keep obstacle/edge queries behind `EnemyWorldQueries`; no enemy imports `LevelScene`. Enemy hurtboxes are Havok triggers. `PhysicsContactAdapter` subscribes to trigger enter/exit events verified by the Task 3 probe, tracks the active enemy IDs, and after each deterministic step builds `PlayerEnemyContact` snapshots from previous/current player bounds, current enemy bounds, and relative velocity. It does not request a collision normal from `ICharacterControllerCollisionEvent`.

`LevelScene` drains contacts in `onAfterStepObservable` and passes them to `InteractionSystem`. Classify `stomp` only when all conditions hold: relative Y velocity is below `-stompMinDownSpeed`, previous feet were at or above `enemyTopY - stompTolerance`, current feet crossed to `<= enemyTopY + stompTolerance`, horizontal bounds overlap, and the enemy is not defeated. Any other current overlap is `side`; otherwise `none`.

- [ ] **Step 5: نفذ نوعي العدو**

`PatrolEnemy` moves inside data bounds, flips view at a blocking obstacle or failed edge probe, and uses an animated/kinematic physics body appropriate to Havok integration.

`ShooterEnemy`:

- activates only within configured X distance.
- uses an accumulated deterministic cooldown.
- aims along X only with Z velocity 0.
- does not fire when defeated or gameplay is paused.

- [ ] **Step 6: نفذ ProjectilePool**

Warm `capacity = 16` projectiles during level build. Each projectile owns mesh/body once and toggles active state, collision, visibility, position, velocity, and expiry. Projectiles are released on world/player contact, expiry, or leaving level bounds.

- [ ] **Step 7: دمج الأحداث والنتيجة**

On stomp:

- mark enemy defeated once.
- call `LevelSession.addScore(configuredScore)` so `scoreChanged` is emitted.
- call `PlayerController.queueVerticalImpulse(stompBounceSpeed)`.
- emit `enemyDefeated`.
- trigger camera shake and audio event.

On side/projectile contact:

- call `PlayerHealth.damage` with source `"enemy"` or `"projectile"`.
- apply horizontal knockback without changing Z.
- ignore repeated contacts during invulnerability.

- [ ] **Step 8: تحقق وسجل المهمة**

Run:

```bash
npm run test
npx playwright test tests/browser/enemy-interactions.spec.ts --project=chromium
npm run build
git add src/gameplay/enemies src/gameplay/projectiles src/gameplay/interactions src/gameplay/level src/physics/PhysicsContactAdapter.ts src/scenes tests
git commit -m "feat: add patrol and shooter enemy interactions"
```

---

### Task 8: المقتنيات وعنصر الصحة والدرع والنقاط

**Files:**
- Create: `src/gameplay/items/Collectible.ts`
- Create: `src/gameplay/items/HealthPickup.ts`
- Create: `src/gameplay/items/ShieldPowerUp.ts`
- Create: `src/gameplay/items/ItemFactory.ts`
- Modify: `src/app/GameSession.ts`
- Modify: `src/app/LevelSession.ts`
- Modify: `src/gameplay/level/LevelDefinition.ts`
- Modify: `src/gameplay/level/LevelOne.ts`
- Modify: `src/gameplay/level/LevelBuilder.ts`
- Modify: `src/scenes/LevelScene.ts`
- Create: `tests/unit/GameSession.test.ts`
- Create: `tests/unit/Items.test.ts`
- Create: `tests/browser/collectibles.spec.ts`

**Interfaces:**
- Produces: `LevelSession.collect(itemId, effect): CollectResult`.
- Produces: item `tryCollect(playerBounds, context): boolean`.
- Consumes: `PlayerHealth`, `TypedEventBus<GameEvents>`.

- [ ] **Step 1: اكتب الاختبارات**

Test exact rules:

- a crystal ID scores once and increments collectible count once.
- health pickup does nothing and remains available at max health; it is consumed after healing one point.
- shield pickup grants one blocked hit within its configured duration.
- replaying a fresh level session resets collected IDs but high score remains app-level data.
- hidden-area crystals contribute normally.

- [ ] **Step 2: شغّل الاختبارات لإثبات الفشل**

Run:

```bash
npx vitest run tests/unit/GameSession.test.ts tests/unit/Items.test.ts
npx playwright test tests/browser/collectibles.spec.ts --project=chromium
```

Expected: FAIL.

- [ ] **Step 3: أكمل معاملات العناصر في LevelSession وGameSession**

Keep the Task 2 `LevelSessionSnapshot` unchanged and extend behavior through typed item effects:

```ts
export type CollectionEffect =
  | { readonly kind: "crystal"; readonly score: number }
  | { readonly kind: "health"; readonly healAmount: number }
  | { readonly kind: "shield"; readonly durationSeconds: number };
```

`LevelSession.collect` rejects duplicate item IDs, increments crystal totals, and emits `scoreChanged` plus `collectibleCollected`. Health/shield effects call `PlayerHealth`; they are recorded as collected only when the effect succeeds. `GameSession` finalizes high score only on victory/game-over and delegates persistence to `SaveService`.

- [ ] **Step 4: نفذ العناصر**

All items share:

```ts
export interface CollectibleItem {
  readonly id: string;
  tryCollect(playerBounds: BoundingInfo, context: CollectionContext): boolean;
  update(stepSeconds: number): void;
  dispose(): void;
}
```

Crystal effect: configured score + collectible increment. Health effect: heal one only below max. Shield effect: one blocked hit with maximum duration. Each successful collection emits one typed event, plays an original feedback effect, disables physics/trigger, and hides the view.

- [ ] **Step 5: استخدم instances للأشكال المتكررة**

Create one crystal source mesh and instances for repeated crystals. Keep each trigger separate and lightweight. Use a simple spin/bob animation driven by shared elapsed time; do not create one render observer per crystal.

- [ ] **Step 6: تحقق وسجل المهمة**

Run:

```bash
npm run test
npx playwright test tests/browser/collectibles.spec.ts --project=chromium
npm run build
git add src/app src/gameplay/items src/gameplay/level src/scenes tests
git commit -m "feat: add collectibles health pickup and shield"
```

---

### Task 9: Babylon GUI وتدفق القائمة والإيقاف والنهايات

**Files:**
- Create: `src/app/SceneRouter.ts`
- Create: `src/scenes/MenuScene.ts`
- Create: `src/ui/UiRoot.ts`
- Create: `src/ui/MainMenu.ts`
- Create: `src/ui/Hud.ts`
- Create: `src/ui/PauseMenu.ts`
- Create: `src/ui/EndScreen.ts`
- Create: `src/ui/TutorialOverlay.ts`
- Modify: `src/scenes/BootScene.ts`
- Modify: `src/scenes/LevelScene.ts`
- Modify: `src/app/GameApp.ts`
- Create: `tests/unit/SceneRouter.test.ts`
- Create: `tests/browser/game-flow.spec.ts`
- Create: `tests/browser/rtl-layout.spec.ts`

**Interfaces:**
- Produces: `SceneFactory.create(signal: AbortSignal): Promise<ManagedScene>`.
- Produces: `SceneRouter.goTo(route): Promise<void>`.
- Produces: UI controls with `dispose()` and typed callbacks only.
- Produces: `UiDiagnosticsSnapshot` in DEV/test with label, visibility, and canvas-pixel bounds for every tested Babylon GUI control.

- [ ] **Step 1: اكتب اختبارات SceneRouter**

Use fake scene factories to assert:

- only latest overlapping navigation completes.
- previous `AbortController` is aborted.
- old managed scene is disposed exactly once after replacement is ready.
- failed destination keeps a recoverable error UI and does not render a half-created scene.

- [ ] **Step 2: اكتب اختبارات تدفق المتصفح**

`game-flow.spec.ts` covers through the typed DEV/test harness:

```text
Boot → Menu → LoadingLevel → Playing → Paused → Playing
Playing → Restart → LoadingLevel → Playing
Playing → Victory → Menu
Playing → GameOver → Restart → Playing
```

Because Babylon GUI renders into canvas, tests must not use DOM roles or DOM bounding boxes. Assert each GUI callback is bound to the Arabic label recorded in `UiDiagnosticsSnapshot`; invoke it through the typed harness or click the center of its recorded canvas bounds. `rtl-layout.spec.ts` runs on desktop and the explicit `mobile-360x640` project, then computes overlap and viewport containment from numeric control bounds:

- root direction is RTL.
- health/score/collectibles are visible without overlap.
- pause and end-screen buttons remain inside viewport.
- Arabic tutorial text wraps without clipping.

- [ ] **Step 3: شغّل الاختبارات لإثبات الفشل**

Run:

```bash
npx vitest run tests/unit/SceneRouter.test.ts
npx playwright test tests/browser/game-flow.spec.ts tests/browser/rtl-layout.spec.ts
```

Expected: FAIL.

- [ ] **Step 4: نفذ SceneRouter وGameFlowMachine integration**

`SceneRouter` accepts factories for `menu` and `level`, owns current scene, and serializes transitions by generation number plus abort signal. `GameApp` renders only the active scene; gameplay observers execute only when flow state is `playing`, while Babylon remains the owner of deterministic step scheduling.

Pause must:

- set flow to `paused`.
- stop fixed gameplay steps and enemy/projectile/audio timers.
- leave render loop and GUI input active.

Restart must construct a new LevelScene and dispose the old one; do not mutate dozens of entities in place.

- [ ] **Step 5: أنشئ UiRoot والمكونات**

`UiRoot` creates one fullscreen `AdvancedDynamicTexture` per active scene and owns all controls. Each component receives translation service and callbacks; it never imports `LevelScene`.

In DEV/test, `UiRoot` records:

```ts
export interface UiControlDiagnostic {
  readonly id: string;
  readonly text: string | null;
  readonly visible: boolean;
  readonly pixelBounds: Readonly<{ x: number; y: number; width: number; height: number }>;
}

export interface UiDiagnosticsSnapshot {
  readonly direction: "rtl" | "ltr";
  readonly viewport: Readonly<{ width: number; height: number }>;
  readonly controls: readonly UiControlDiagnostic[];
}
```

The snapshot is derived after Babylon GUI measure/layout, not from configured percentages alone.

Required Arabic labels include:

```ts
{
  gameTitle: "ورشة الغروب",
  startGame: "ابدأ اللعب",
  resume: "متابعة",
  restartLevel: "إعادة المستوى",
  returnToMenu: "القائمة الرئيسية",
  victoryTitle: "أحسنت! وصلت إلى البوابة",
  gameOverTitle: "انتهت المحاولة",
  clearSavedData: "مسح البيانات المحفوظة",
  pause: "إيقاف مؤقت",
}
```

Babylon GUI text alignment and stack order must be explicitly configured for RTL; never rely only on document `dir`.

- [ ] **Step 6: نفذ HUD والتعليمات**

HUD renders an initial snapshot from `PlayerHealth` and `LevelSession` before subscribing. It then subscribes once to `healthChanged`, `shieldChanged`, `scoreChanged`, and `checkpointActivated`. Tutorial messages are data-driven triggers in `LevelDefinition`, show for a configured duration, and mark themselves seen within the current attempt.

- [ ] **Step 7: تحقق وسجل المهمة**

Run:

```bash
npm run test
npx playwright test tests/browser/game-flow.spec.ts tests/browser/rtl-layout.spec.ts
npm run build
git add src/app src/scenes src/ui src/localization tests
git commit -m "feat: add Arabic game flow and Babylon GUI"
```

---

### Task 10: تحكم الجوال متعدد اللمس ومنع سلوك الصفحة

**Files:**
- Create: `src/ui/MobileControls.ts`
- Create: `src/input/CanvasTouchAdapter.ts`
- Modify: `src/input/TouchInputSource.ts`
- Modify: `src/ui/UiRoot.ts`
- Modify: `src/scenes/LevelScene.ts`
- Modify: `src/styles/main.css`
- Create: `tests/unit/TouchInputSource.test.ts`
- Create: `tests/browser/mobile-controls.spec.ts`

**Interfaces:**
- Produces: `MobileControls` pointer callbacks with stable action IDs.
- Produces: `CanvasTouchAdapter` that maps canvas pointer IDs and screen coordinates to button zones.
- Consumes: `TouchInputSource.press(pointerId, action)`, `release(pointerId)`, `cancelAll()`.

- [ ] **Step 1: اكتب اختبارات multi-touch**

Unit test:

```ts
touch.press(1, "moveRight");
touch.press(2, "jump");
expect(touch.sample()).toMatchObject({
  moveAxis: 1,
  jumpPressed: true,
  jumpHeld: true,
});
touch.release(2);
expect(touch.sample()).toMatchObject({ moveAxis: 1, jumpHeld: false });
touch.cancelAll();
expect(touch.sample().moveAxis).toBe(0);
```

Browser test on the explicit `mobile-360x640` project reads left/right/jump pixel zones from UI diagnostics, dispatches two pointer IDs at the right/jump zone centers on the canvas, asserts both actions in diagnostics, checks player moves and jumps, and asserts `window.scrollY === 0` and visual viewport scale remains 1.

- [ ] **Step 2: شغّل الاختبارات لإثبات الفشل**

Run:

```bash
npx vitest run tests/unit/TouchInputSource.test.ts
npx playwright test tests/browser/mobile-controls.spec.ts --project=mobile-360x640
```

Expected: FAIL.

- [ ] **Step 3: نفذ MobileControls**

Use Babylon GUI ellipses/buttons with:

- left/right controls in bottom-inline-start.
- jump in bottom-inline-end.
- minimum visible diameter 72 CSS-equivalent pixels.
- safe-area padding.
- `isPointerBlocker = true`.

`MobileControls` is responsible only for Babylon GUI visuals and publishing post-layout pixel rectangles for `moveLeft`, `moveRight`, and `jump`. `CanvasTouchAdapter` attaches `pointerdown`, `pointermove`, `pointerup`, and `pointercancel` directly to the canvas, reads the DOM `pointerId`, hit-tests the published rectangles, and forwards press/release to `TouchInputSource`. Moving a held pointer between zones releases the old action before pressing the new one; blur and visibility loss call `cancelAll`.

Show controls only when coarse pointer or touch capability is detected, with a test query override. Do not depend on the payload of `Control.onPointerDownObservable` for pointer IDs.

- [ ] **Step 4: أكمل حماية الصفحة**

CSS:

```css
html,
body,
#app,
#game-canvas {
  width: 100%;
  height: 100%;
  margin: 0;
  overflow: hidden;
  touch-action: none;
  overscroll-behavior: none;
}

body {
  position: fixed;
  inset: 0;
  -webkit-user-select: none;
  user-select: none;
}
```

Prevent default only for gameplay canvas pointer/touch gestures; do not globally block keyboard accessibility or UI button activation.

- [ ] **Step 5: تحقق وسجل المهمة**

Run:

```bash
npm run test
npx playwright test tests/browser/mobile-controls.spec.ts --project=mobile-360x640
npm run build
git add src/input src/ui src/scenes src/styles tests
git commit -m "feat: add responsive multi-touch controls"
```

---

### Task 11: الصوت الإجرائي والإعدادات والحفظ الدائم

**Files:**
- Create: `src/services/AudioService.ts`
- Create: `src/ui/AudioSettingsPanel.ts`
- Modify: `src/ui/MainMenu.ts`
- Modify: `src/ui/PauseMenu.ts`
- Modify: `src/services/SaveService.ts`
- Modify: `src/scenes/BootScene.ts`
- Modify: `src/scenes/LevelScene.ts`
- Create: `tests/unit/AudioService.test.ts`
- Create: `tests/browser/audio-save.spec.ts`

**Interfaces:**
- Produces: `AudioService.unlock(): Promise<boolean>`.
- Produces: `playMusic(track)`, `stopMusic()`, `playSfx(cue)`.
- Produces: `setMusicVolume`, `setSfxVolume`, `setMuted`, `dispose`.
- Consumes: typed gameplay events.

- [ ] **Step 1: اكتب اختبارات AudioService باستخدام fake Web Audio**

Assert:

- no source starts before unlock.
- first successful unlock resumes context and starts requested music.
- failed resume returns `false` without throwing.
- music and SFX gains are independent and clamp to `[0, 1]`.
- mute sets master gain to 0 and unmute restores channel settings.
- rapid repeat of the same SFX respects a short per-cue cooldown.
- dispose stops active oscillators/sources and disconnects nodes.

- [ ] **Step 2: اكتب اختبار حفظ الإعدادات**

Browser test:

1. open menu.
2. set music 40%, SFX 70%, mute on.
3. reload.
4. assert controls restore exact values.
5. click clear saved data and confirm.
6. assert defaults return and only `3bosh.save` is removed.

- [ ] **Step 3: شغّل الاختبارات لإثبات الفشل**

Run:

```bash
npx vitest run tests/unit/AudioService.test.ts
npx playwright test tests/browser/audio-save.spec.ts --project=chromium
```

Expected: FAIL.

- [ ] **Step 4: نفذ synth أصليًا بسيطًا**

Use Web Audio oscillators/noise envelopes to define short original cues:

```ts
export type SoundCue =
  | "jump"
  | "collect"
  | "damage"
  | "enemyDefeat"
  | "victory"
  | "gameOver";
```

Background music uses a quiet procedural loop scheduled after unlock. Keep all oscillator patterns in code with original note/timing data; no downloaded music. Audio failures are non-fatal and reported once.

- [ ] **Step 5: اربط الأحداث والصوت**

Subscribe once:

- accepted jump → `jump`.
- successful collection → `collect`.
- applied damage → `damage`.
- enemy defeated → `enemyDefeat`.
- flow victory/game-over → matching cue and music stop/fade.

Pause suspends scheduling but does not destroy the audio service; leaving the app disposes it.

- [ ] **Step 6: نفذ لوحة الإعدادات ومسح البيانات**

Create Babylon GUI sliders for music and SFX, a mute toggle, and clear-data button with Arabic confirmation. Persist on confirmed changes, debounce slider writes, and update `GameSession` immediately.

- [ ] **Step 7: تحقق وسجل المهمة**

Run:

```bash
npm run test
npx playwright test tests/browser/audio-save.spec.ts --project=chromium
npm run build
git add src/services src/ui src/scenes tests
git commit -m "feat: add procedural audio and persisted settings"
```

---

### Task 12: الأصول البديلة، شاشة الخطأ، الأداء، التنظيف، والتوثيق

**Files:**
- Create: `src/services/AssetService.ts`
- Create: `src/ui/LoadingScreen.ts`
- Create: `src/ui/ErrorScreen.ts`
- Create: `src/core/ResourceDiagnostics.ts`
- Modify: `src/scenes/BootScene.ts`
- Modify: `src/scenes/LevelScene.ts`
- Modify: `src/gameplay/level/LevelBuilder.ts`
- Create: `tests/unit/AssetService.test.ts`
- Create: `tests/browser/error-recovery.spec.ts`
- Create: `tests/browser/resource-cleanup.spec.ts`
- Create: `tests/browser/full-game.spec.ts`
- Create: `README.md`

**Interfaces:**
- Produces: `AssetService.loadOptionalModel(key, url): Promise<Result<AssetContainer, AssetError>>`.
- Produces: `ResourceDiagnostics.snapshot(): ResourceSnapshot`.
- Produces: Arabic loading/error UI with retry and return-to-menu actions.

- [ ] **Step 1: اكتب اختبارات fallback والخطأ**

Unit test asserts missing optional model returns typed failure and primitive factory remains usable.

Browser test uses `?failHavok=1` test hook to assert:

- Arabic error message is visible.
- no level input is active.
- retry removes injected failure and boots successfully.

Never ship the failure hook in production output; guard it with `import.meta.env.DEV || import.meta.env.MODE === "test"`.

- [ ] **Step 2: اكتب اختبار تسرب restart**

`resource-cleanup.spec.ts`:

1. capture diagnostics after first stable level load.
2. restart level 10 times.
3. capture stable snapshot.
4. assert scene count is 1, active input listeners have not grown, event subscriptions have not grown, projectile pool capacity is unchanged, and disposed physics bodies are not active.

Allow bounded cache growth only for reusable engine-level materials/audio, and document exact permitted delta.

- [ ] **Step 3: اكتب اختبار المسار الكامل**

`full-game.spec.ts` must cover:

```text
menu → start → tutorial → collect crystal → defeat patrol enemy
→ activate checkpoint → fall and lose health → respawn
→ avoid shooter projectile → collect health → ride moving platform
→ enter hidden area → collect shield → reach goal → victory
```

Then restart and drive health to zero to assert Game Over. Use deterministic test harness commands, not fixed pixel clicks or long arbitrary sleeps.

- [ ] **Step 4: شغّل الاختبارات لإثبات الفشل**

Run:

```bash
npx vitest run tests/unit/AssetService.test.ts
npx playwright test tests/browser/error-recovery.spec.ts tests/browser/resource-cleanup.spec.ts tests/browser/full-game.spec.ts
```

Expected: FAIL.

- [ ] **Step 5: نفذ AssetService وشاشات التحميل والخطأ**

`AssetService` caches successful engine-level assets, never caches a rejected promise, and returns typed results. `LevelBuilder` requests visuals through an injected visual factory and falls back to primitives on optional model failure.

Register glTF support once with the tree-shakeable side-effect import from `@babylonjs/loaders/glTF`; do not import the Babylon legacy bundle.

Loading screen exposes phase text: تهيئة المحرك، تهيئة الفيزياء، بناء المستوى. Error screen distinguishes WebGL unavailable, Havok initialization failure, and unexpected load failure, with concise Arabic guidance.

- [ ] **Step 6: أضف ResourceDiagnostics والتنظيف**

Track counts at ownership boundaries:

```ts
export interface ResourceSnapshot {
  readonly scenes: number;
  readonly meshes: number;
  readonly physicsBodies: number;
  readonly guiTextures: number;
  readonly inputListeners: number;
  readonly eventSubscriptions: number;
  readonly activeProjectiles: number;
}
```

Expose only in development/test. Ensure `LevelScene.dispose()` order is: stop fixed updates → abort pending loads → dispose GUI/input/event subscriptions → items/projectiles/enemies/player/level → scene.

- [ ] **Step 7: نفذ تحسينات مقاسة**

Use diagnostics and Babylon instrumentation to:

- keep one shadow generator and limit casters.
- freeze static world matrices/materials where safe.
- use crystal instances.
- keep projectile pool fixed at 16 unless test level proves insufficient.
- deactivate enemy AI outside X activation range.
- cap device pixel ratio on mobile through Engine hardware scaling if measured FPS falls below target.

Do not add thin instances or custom shaders unless profiling shows a measured bottleneck.

- [ ] **Step 8: اكتب README التشغيلي**

README must include:

```bash
npm install
npm run dev
npm run test
npm run test:browser
npm run build
npm run preview
```

Document Node requirement, controls, Arabic/English structure, Havok WASM behavior, placeholder asset directories, test strategy, deployment as static `dist/`, and how to add a second `LevelDefinition`.

- [ ] **Step 9: شغّل بوابة الإصدار الكاملة**

Run:

```bash
npm run test
npm run build
npm run test:browser
```

Expected:

- all unit tests PASS.
- Vite production build PASS.
- all Chromium desktop/mobile browser tests PASS.
- no continuous console errors.

- [ ] **Step 10: نفذ تحققًا يدويًا عمليًا**

Run:

```bash
npm run dev -- --host 127.0.0.1
```

Checklist:

- الحركة A/D والأسهم والقفز Space/W/ArrowUp.
- Escape pause، R restart.
- القفز لا يتكرر في الهواء.
- Z لا ينحرف.
- الكاميرا لا تكشف خارج حدود المستوى.
- المنصة تحمل اللاعب.
- الدوس والضرر الجانبي يعملان كما هو محدد.
- checkpoint والسقوط وGame Over والفوز تعمل.
- RTL والجوال وmulti-touch وsafe areas سليمة.
- الصوت ينتظر gesture ويحفظ الإعدادات.
- إعادة المستوى 10 مرات لا تظهر نموًا مستمرًا في الموارد.

- [ ] **Step 11: سجل اكتمال الإصدار**

Run:

```bash
git add .
git commit -m "feat: complete first playable 2.5D platformer"
git status --short
```

Expected: commit ناجح وworking tree نظيف.

---

## نقاط التوقف والمراجعة

لا تنفذ المهام كلها من دون مراجعات. توقف بعد:

1. **Task 3:** اعرض نتيجة بوابة Havok والمنصة المتحركة. إذا فشلت، أصلح adapter قبل المتابعة.
2. **Task 5:** اعرض الشريحة القابلة للعب للحركة والكاميرا واعتمد الإحساس.
3. **Task 8:** اعرض المستوى والتفاعلات قبل بناء الواجهة والصوت.
4. **Task 10:** اعرض RTL والجوال على `360×640`.
5. **Task 12:** سلّم تقرير التحقق النهائي.

## مصادر تقنية مثبتة عند كتابة الخطة

- Babylon.js Character Controller: `checkSupport`, `setVelocity`, `integrate`.
- Babylon EngineOptions: `deterministicLockstep`, `timeStep`, `lockstepMaxSteps`; Scene: `onBeforeStepObservable`, `onAfterStepObservable`.
- `ICharacterControllerCollisionEvent` exposes collider/impulse/impulsePosition but no collision normal; stomp classification therefore uses trigger membership plus swept bounds.
- `@babylonjs/core` و`@babylonjs/gui` و`@babylonjs/loaders`: `9.18.0`.
- `@babylonjs/havok`: `1.3.13`.
- Vite 8: Node.js `20.19+` أو `22.12+`.
- Playwright: `1.61.1`.

## بوابة التنفيذ

هذه الخطة لا تمنح إذنًا بالتنفيذ. بعد اعتمادها يطلب الوكيل من المستخدم اختيار أحد المسارين:

1. **Subagent-Driven (موصى به):** مهمة واحدة في كل مرة مع مراجعة بين المهام ونقاط التوقف أعلاه.
2. **Inline Execution:** تنفيذ داخل الجلسة على دفعات مع توقف إلزامي عند كل checkpoint.

لا يبدأ أي مسار حتى يكتب المستخدم موافقة صريحة على التنفيذ.
