import { createI18n } from "vue-i18n";
import uk from "./locales/uk.js";
import en from "./locales/en.js";

export const i18n = createI18n({
  legacy: false, // Composition API mode
  locale: "uk",
  fallbackLocale: "en",
  messages: { uk, en },
});
