# Как добавить новый ответ на команду бота

## Простой способ — в `src/app/main.ts`

Свои команды регистрируются в `main.ts` на `app.bot` — это обычный бот [grammY](https://grammy.dev), доступно всё его API.
Ядро при этом не правится, поэтому обновления шаблона приходят без конфликтов.

```ts
app.bot.command("status", (ctx) => ctx.reply("Всё работает нормально ✅"));

app.bot.callbackQuery("status_refresh", async (ctx) => {
  await ctx.answerCallbackQuery("Обновлено");
});

// fileManager подключается ПОСЛЕ своих команд:
// на любой нераспознанный текст он отвечает справкой
app.use(fileManager({ storage: s3Storage(config.s3), ...config.fileManager }));
```

> Высокоуровневые функции ответа (меню, переводы) для кода из `app/` появятся следующим шагом.
> Пока для полной интеграции в диалог бота (переводы, общее меню) используйте способ ниже.

---

## Полная интеграция в диалог — правка ядра

Этот способ меняет файлы в `src/core/`. Он затрагивает пять файлов, и такие правки могут конфликтовать с обновлениями шаблона.

---

## Файлы, с которыми предстоит работать

| Файл                | Что в нём                                 |
| ------------------- | ----------------------------------------- |
| `strings.ts`        | Тексты и кнопки для каждого языка         |
| `DialogEngine.ts`   | Методы отправки сообщений пользователю    |
| `BotModelImpl.ts`   | Бизнес-логика: вызывает DialogEngine      |
| `CommandHandler.ts` | Регистрация команды и вызов метода модели |

---

## Шаг 1 — Добавить текст в `strings.ts`

Открой файл `src/core/dialog/messages/strings.ts`. Там два объекта: `textTranslates` (тексты) и `menusTranslates` (кнопки).

### Добавить текст

В `textTranslates` добавь новую строку в каждый язык (`ru`, `en` и другие, если есть).
Ключ — это внутреннее название, по нему потом обращаются в коде.

```ts
// было
ru: {
  help: "Здесь будет /help текст.",
  // ...
}

// стало — добавили ключ "status"
ru: {
  help: "Здесь будет /help текст.",
  status: "Всё работает нормально ✅",
  // ...
}
```

Не забудь добавить тот же ключ в английский раздел:

```ts
en: {
  help: "Here will be /help text.",
  status: "Everything is working fine ✅",
  // ...
}
```

### Добавить кнопки (необязательно)

Если под сообщением нужны кнопки — добавь их в `menusTranslates` с тем же ключом.
Каждая кнопка — это объект с двумя полями:

- `text` — надпись на кнопке, которую видит пользователь
- `call` — внутренний идентификатор нажатия (латиница, без пробелов)

```ts
// в menusTranslates → ru
ru: {
  help: [],
  status: [
    { text: "Обновить", call: "status_refresh" },
    { text: "Подробнее", call: "status_details" },
  ],
  // ...
}
```

Если кнопки не нужны — оставь пустой массив `[]`.

---

## Шаг 2 — Добавить метод отправки в `DialogEngine.ts`

Открой `src/core/dialog/DialogEngine.ts`. Там уже есть примеры — `sendHelp`, `sendMainMenu` и другие.
Добавь новый async-метод по той же схеме. Методы принимают `ctx: BotContext` и сами выполняют отправку.

```ts
async sendStatus(ctx: BotContext) {
  const lang = ctx.session.lang;
  const t = textTranslates[lang];
  const m = menusTranslates[lang] ?? {};
  const reply = this.factory.text(t.status, m.status);
  await this.resolver.reply(ctx, reply);
}
```

---

## Шаг 3 — Добавить метод в `BotModelImpl.ts`

Открой `src/core/domain/BotModelImpl.ts` и добавь метод, который вызывает `DialogEngine`:

```ts
async sendStatus(ctx: BotContext) {
  if (ctx.chat) {
    await this.dialog.sendStatus(ctx);
  }
}
```

Также добавь сигнатуру метода в интерфейс `src/core/IBotModel.ts`:

```ts
sendStatus(ctx: BotContext): Promise<void>;
```

---

## Шаг 4 — Зарегистрировать команду в `CommandHandler.ts`

Открой `src/core/controller/handlers/CommandHandler.ts`. В конструкторе зарегистрируй новую команду,
вызвав нужный метод модели:

```ts
this.bot.command("status", async (ctx) => await model.sendStatus(ctx));
```

Готово. После перезапуска бота команда `/status` будет работать.

---

## Итого — что нужно сделать для новой команды `/status`

1. **`strings.ts`** — добавить ключ `status` с текстом в `textTranslates` (для каждого языка) и массив кнопок в `menusTranslates` (можно пустой `[]`)
2. **`DialogEngine.ts`** — добавить async-метод `sendStatus(ctx: BotContext)`
3. **`BotModelImpl.ts`** — добавить метод `sendStatus(ctx)`, делегирующий в `dialog.sendStatus`
4. **`IBotModel.ts`** — добавить сигнатуру `sendStatus(ctx: BotContext): Promise<void>`
5. **`CommandHandler.ts`** — зарегистрировать `bot.command("status", ...)`

---

## Частые вопросы

**Можно ли добавить кнопки позже, не меняя остальной код?**
Да. Просто заполни пустой массив `[]` в `menusTranslates` — кнопки появятся автоматически без изменений в `DialogEngine` или `CommandHandler`.

**Что будет, если забыть добавить ключ в один из языков?**
TypeScript подсветит ошибку при сборке — все языки должны иметь одинаковый набор ключей.

**Как называть `call` у кнопок?**
Любая строка без пробелов, латиницей. Рекомендуется формат `команда_действие`, например `status_refresh`. Это значение приходит в обработчик нажатия кнопки в `ButtonHandler.ts`.

**Почему `DialogEngine` сам отправляет сообщение, не возвращая его?**
Все методы `DialogEngine` — async и получают `ctx` напрямую. Это упрощает код в хендлерах и модели: не нужно передавать результат через несколько слоёв.
