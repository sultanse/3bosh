# تقرير Task 1: تثبيت الأساس والأدوات ودورة حياة التطبيق

## المنفذ

- ثُبّتت حزم Babylon المحددة: `@babylonjs/core` و`gui` و`havok` و`loaders`، مع Vitest وPlaywright و`@types/node`.
- أضيفت scripts البناء والاختبارات وملفات إعداد Vite وVitest وPlaywright، مع إعداد TypeScript الصارم المطلوب.
- استُبدل قالب Vite بصفحة RTL تحتوي canvas اللعبة وCSS كامل الإطار ومدخل `GameApp`.
- أُضيف `DisposableBag` و`GameApp` ذوا دورة الحياة القابلة للإتلاف، حيث Babylon Engine هو scheduler الوحيد بــ deterministic lockstep عند 60Hz.
- أُزيلت ملفات قالب Vite غير المستخدمة.

## TDD

1. أُنشئ اختبارا `DisposableBag` أولًا.
2. شُغّل `npx vitest run tests/unit/DisposableBag.test.ts` وكانت النتيجة RED المتوقعة: الوحدة `src/core/DisposableBag` غير موجودة.
3. أُضيف التنفيذ الأدنى، ثم أعيد تشغيل الاختبار وكانت النتيجة GREEN: اختباران ناجحان.

## التحقق

- `npm run test` — ناجح: اختباران.
- `npm run build` — ناجح: TypeScript وVite.
- `npm run build:test` — ناجح.
- smoke test عبر Chromium — ناجح: canvas بمقاس `1280×720` ودون أخطاء صفحة.

## ملاحظة البيئة

كانت نسخة Node المتاحة `v26.5.0`، وهي أحدث من النطاق الموصى به في الخطة (`20.19+` أو `22.12+`). اكتملت كل أوامر التثبيت والبناء والاختبارات بنجاح عليها.
