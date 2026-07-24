import { describe, expect, it } from "vitest";

import { ar } from "../../src/localization/ar";
import { en } from "../../src/localization/en";
import { STRINGS, type StringKey } from "../../src/localization/strings";
import { LocalizationService } from "../../src/services/LocalizationService";

describe("LocalizationService", () => {
  it("defaults to Arabic and RTL", () => {
    const localization = new LocalizationService();

    expect(localization.locale).toBe("ar");
    expect(localization.direction).toBe("rtl");
    expect(localization.t("menuPlay")).toBe(ar.menuPlay);
  });

  it("switches to English and LTR", () => {
    const localization = new LocalizationService();

    localization.setLocale("en");

    expect(localization.direction).toBe("ltr");
    expect(localization.t("menuPlay")).toBe(en.menuPlay);
  });

  it("provides every declared string in both dictionaries", () => {
    for (const key of Object.keys(STRINGS) as StringKey[]) {
      expect(ar[key]).toEqual(expect.any(String));
      expect(en[key]).toEqual(expect.any(String));
    }
  });
});
