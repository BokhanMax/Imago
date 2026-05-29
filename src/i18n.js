import { createI18n } from "vue-i18n";
import uk from "./locales/uk.js";
import en from "./locales/en.js";

function detectLocale() {
  const lang = (navigator.language || "").toLowerCase();
  return lang === "uk" || lang.startsWith("uk-") ? "uk" : "en";
}

export const i18n = createI18n({
  legacy: false, // Composition API mode
  locale: detectLocale(),
  fallbackLocale: "en",
  messages: { uk, en },
});
