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

Внутри своих обработчиков доступны встроенные тексты на языке пользователя: `ctx.t` (см. [Тексты и языки](adding-languages.md)).

```ts
app.bot.command("empty", (ctx) => ctx.reply(ctx.t.nav.empty, { parse_mode: "HTML" }));
```

> Свои ключи текстов для кода из `app/` и высокоуровневые функции ответа (`ctx.ui`) появятся следующим шагом.
> Пока для своего переводимого текста используйте способ ниже.

---

## Полная интеграция в диалог — правка ядра

Этот способ меняет файлы в `src/core/`. Он затрагивает пять файлов, и такие правки могут конфликтовать с обновлениями шаблона.

---

## Файлы, с которыми предстоит работать

| Файл                    | Что в нём                                 |
| ----------------------- | ----------------------------------------- |
| `texts/en.ts`, `ru.ts`  | Тексты для каждого языка                  |
| `BotModelImpl.ts`       | Бизнес-логика: отправляет ответ           |
| `IBotModel.ts`          | Интерфейс модели                          |
| `CommandHandler.ts`     | Регистрация команды и вызов метода модели |

---

## Шаг 1 — Добавить текст

Открой `src/core/texts/en.ts` и добавь раздел или ключ. Английский файл — эталон: по нему проверяются остальные языки.

```ts
status: {
  ok: "Everything is working fine ✅",
  objects: "Objects in the bucket: {count}",   // {count} — параметр
  refresh: "Refresh",                           // надпись на кнопке
},
```

Затем тот же ключ в `src/core/texts/ru.ts` — без него TypeScript не соберёт проект:

```ts
status: {
  ok: "Всё работает нормально ✅",
  objects: "Объектов в бакете: {count}",
  refresh: "Обновить",
},
```

Добавь команду в раздел `commands` обоих файлов — так она появится в `/help`:

```ts
commands: {
  // ...
  status: "состояние бота",
},
```

Подробнее о параметрах, текстах по числу и HTML — в [Тексты и языки](adding-languages.md).

---

## Шаг 2 — Добавить метод в `BotModelImpl.ts`

Открой `src/core/domain/BotModelImpl.ts`. Тексты берутся из `ctx.t`, отправка — через `this.dialog.text` (новое сообщение) или `this.dialog.menu` (меню, которое редактируется на месте). Кнопки — массив рядов:

```ts
async sendStatus(ctx: BotContext) {
  const t = ctx.t.status;
  await this.dialog.text(ctx, t.ok, [
    [{ text: t.refresh, call: "status_refresh" }],
  ]);
}
```

Также добавь сигнатуру метода в интерфейс `src/core/IBotModel.ts`:

```ts
sendStatus(ctx: BotContext): Promise<void>;
```

---

## Шаг 3 — Зарегистрировать команду в `CommandHandler.ts`

Открой `src/core/controller/handlers/CommandHandler.ts`. В конструкторе зарегистрируй новую команду,
вызвав нужный метод модели:

```ts
this.composer.command("status", async (ctx) => await model.sendStatus(ctx));
```

Готово. После перезапуска бота команда `/status` будет работать.

---

## Итого — что нужно сделать для новой команды `/status`

1. **`en.ts`, `ru.ts`** — добавить тексты и описание в `commands`
2. **`BotModelImpl.ts`** — добавить метод `sendStatus(ctx)`
3. **`IBotModel.ts`** — добавить сигнатуру `sendStatus(ctx: BotContext): Promise<void>`
4. **`CommandHandler.ts`** — зарегистрировать `composer.command("status", ...)`

---

## Частые вопросы

**Что будет, если забыть добавить ключ в один из языков?**
Для встроенных языков TypeScript подсветит ошибку при сборке. Для языков из `src/app/texts/` недостающий текст возьмётся из языка по умолчанию, а в лог при старте придёт предупреждение.

**Нужно ли экранировать параметры?**
Нет. Значения `{параметров}` экранируются сами. Готовый HTML передавай через `raw()`.

**Как называть `call` у кнопок?**
Любая строка без пробелов, латиницей, до 64 байт. Рекомендуется формат `команда_действие`, например `status_refresh`. Это значение приходит в обработчик нажатия кнопки в `ButtonHandler.ts`.
