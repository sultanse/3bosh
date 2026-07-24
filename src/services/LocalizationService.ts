import { ar } from "../localization/ar";
import { en } from "../localization/en";
import type { StringKey, TranslationDictionary } from "../localization/strings";

export type Locale = "ar" | "en";

const dictionaries: Readonly<Record<Locale, TranslationDictionary>> = { ar, en };

export class LocalizationService {
  public locale: Locale;

  public constructor(initialLocale: Locale = "ar") {
    this.locale = initialLocale;
  }

  public get direction(): "rtl" | "ltr" {
    return this.locale === "ar" ? "rtl" : "ltr";
  }

  public setLocale(locale: Locale): void {
    this.locale = locale;
  }

  public t(key: StringKey): string {
    return dictionaries[this.locale][key];
  }
}
