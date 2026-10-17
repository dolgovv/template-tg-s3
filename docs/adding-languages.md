# Добавление нового языка

Все тексты и кнопки хранятся в `src/core/dialog/messages/strings.ts`. Добавить новый язык — значит добавить новый раздел в оба объекта и зарегистрировать его тип.

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

## Шаг 2 — Зарегистрировать язык в `types.ts`

Открой `src/core/types.ts` и добавь код языка в `SUPPORTED_LANGUAGES`:

```ts
export const SUPPORTED_LANGUAGES = ["ru", "en", "de"] as const;
```

Тип `botLanguage` выводится из этого списка автоматически, а обработчик кнопок `lang=...` принимает только языки из него — больше ничего менять не нужно.

---

## Как переключить язык по умолчанию

Язык по умолчанию задаётся в `src/app/main.ts`:

```ts
const app = createBot({ ...config.bot, defaultLang: "ru" });
```

Каждый новый пользователь начнёт с этого языка. Уже существующие сессии не изменятся — язык хранится в файлах сессий в папке `sessions/`.
