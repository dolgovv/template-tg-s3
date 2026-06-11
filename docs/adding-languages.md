# Добавление нового языка

Все тексты и кнопки хранятся в `src/BotService/dialog/messages/strings.ts`. Добавить новый язык — значит добавить новый раздел в оба объекта и зарегистрировать его тип.

---

## Шаг 1 — Добавить тексты в `strings.ts`

Открой `textTranslates` и добавь новый языковой раздел по аналогии с `ru` и `en`:

```ts
export const textTranslates = {
  ru: { ... },
  en: { ... },
  de: {                                          // ← новый язык
    welcome: "Willkommen! Bot läuft.",
    notAdmin: "Kein Zugang.",
    unknownCommand: "Unbekannter Befehl.",
    anonName: "Anonymer Benutzer",
    langChanged: "Sprache erfolgreich geändert!",
    help: "Hier wird der /help-Text stehen.",
    greetUser: (name: string, websiteName: string) =>
      `Hallo, ${name}!\nWillkommen im Admin-Panel von ${websiteName}`,
    yourId: (id: number) => `Deine ID: ${id}`,
    // ... остальные ключи по аналогии с ru/en
  },
};
```

Затем добавь кнопки в `menusTranslates` с теми же ключами:

```ts
export const menusTranslates = {
  ru: { ... },
  en: { ... },
  de: {
    welcome: [
      { text: "Deutsch", call: "lang=de" },
      { text: "Русский", call: "lang=ru" },
      { text: "English", call: "lang=en" },
      { text: "Navigation", call: "navDir:root" },
    ],
    langChanged: [
      { text: "Deutsch", call: "lang=de" },
      { text: "Русский", call: "lang=ru" },
      { text: "English", call: "lang=en" },
    ],
    help: [],
    // ... остальные ключи по аналогии с ru/en
  },
};
```

---

## Шаг 2 — Зарегистрировать тип языка в `types.ts`

Открой `src/BotService/utils/types.ts` и добавь новый язык в тип `botLanguage`:

```ts
export type botLanguage = "ru" | "en" | "de";
```

TypeScript теперь будет проверять что все обращения к `textTranslates[lang]` и `menusTranslates[lang]` покрывают новый язык.

---

## Шаг 3 — Расширить regex в `ButtonHandler.ts`

Открой `src/BotService/controller/handlers/ButtonHandler.ts`. Смена языка обрабатывается одним regex-обработчиком. Добавь новый код языка в выражение:

```ts
// было
this.bot.callbackQuery(/lang=(ru|en)/, async (ctx) => {
  const newLang = ctx.match[1] === "ru" ? "ru" : "en";
  // ...
});

// стало
this.bot.callbackQuery(/lang=(ru|en|de)/, async (ctx) => {
  const newLang = ctx.match[1] as botLanguage;
  // ...
});
```

---

## Как переключить язык по умолчанию

Язык по умолчанию задаётся в `BotService.ts` при инициализации сессии:

```ts
initial: (): SessionData => ({
  lang: "en",  // ← поменяй на нужный
  // ...
}),
```

Каждый новый пользователь начнёт с этого языка. Уже существующие сессии не изменятся — язык хранится в файлах сессий в папке `sessions/`.
