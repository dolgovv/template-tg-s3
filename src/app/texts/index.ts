import { defineTexts, type TextsOverrides } from "../../core/index.js";

// here you can add your own texts for the code of app/: ctx.t.status.ok and so on.
// strictly in the default language (defaultLang), all of them: the keys and
// {placeholders} are taken from here, so TypeScript checks every ctx.t call
// ---  status: { command: "bot status", ok: "Всё работает ✅", objects: "Объектов: {count}" },
// !!! a built-in section (nav, files...) can't be used as a name
export const customTexts = defineTexts({});

type AppTexts = typeof customTexts;
declare module "../../core/index.js" {
  interface CustomTexts extends AppTexts {}
}

// here you can change the built-in texts (src/core/texts/en.ts, ru.ts),
// translate your own ones or add a language. strictly the texts that differ
// are needed: the rest is taken from the built-in ones, then from the default language
// ---  ru: { nav: { empty: "Здесь пока ничего нет" } },
// ---  en: { status: { ok: "All good ✅" } },
// ---  de: { meta: { name: "Deutsch" }, nav: { empty: "Dieser Ordner ist leer" } },
// !!! a wrong key or {placeholder} is reported in the log at startup
export const texts: TextsOverrides = {};
