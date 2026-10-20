import type { TextsOverrides } from "../../core/index.js";

// here you can change the built-in texts (src/core/texts/en.ts, ru.ts)
// or add a language. strictly the texts that differ are needed:
// the rest is taken from the built-in ones, then from the default language
// ---  ru: { nav: { empty: "Здесь пока ничего нет" } },
// ---  de: { meta: { name: "Deutsch" }, nav: { empty: "Dieser Ordner ist leer" } },
// !!! a wrong key or {placeholder} is reported in the log at startup
export const texts: TextsOverrides = {};
