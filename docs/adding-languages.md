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
  },
};
```

Затем добавь кнопки в `menusTranslates` с теми же ключами:

```ts
export const menusTranslates: Record<string, MenuSection> = {
  ru: { ... },
  en: { ... },
  de: {
    welcome: [],
    notAdmin: [],
    unknownCommand: [],
    anonName: [],
    langChanged: [
      { text: "Deutsch", call: "lang=de" },
      { text: "Русский", call: "lang=ru" },
      { text: "English", call: "lang=en" },
    ],
    help: [],
  },
};
```

---

## Шаг 2 — Зарегистрировать тип языка в `types.ts`

Открой `src/BotService/utils/types.ts` и добавь новый язык в тип `botLanguage`:

```ts
export type botLanguage = "ru" | "en" | "de";
```

TypeScript теперь будет проверять что все методы `DialogEngine` поддерживают новый язык.

---

## Шаг 3 — Добавить обработчик кнопки в `ButtonHandler.ts`

Открой `src/BotService/dialog/handlers/ButtonHandler.ts` и добавь обработчик для новой кнопки смены языка:

```ts
this.bot.callbackQuery("lang=de", (ctx) => this.onSetLang(ctx, "de"));
```

---

## Как переключить язык по умолчанию

Язык по умолчанию задаётся в `BotService.ts` при инициализации сессии:

```ts
initial: (): SessionData => ({ lang: "ru" }),  // ← поменяй на нужный
```

Каждый новый пользователь начнёт с этого языка. Уже существующие сессии не изменятся.
