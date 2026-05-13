# Добавление inline-кнопок

Кнопки добавляются через файл `src/BotService/dialog/messages/strings.ts` — никакого дополнительного кода писать не нужно. Обработка нажатий регистрируется в `ButtonHandler.ts`.

---

## Шаг 1 — Добавить кнопки в `strings.ts`

Открой `menusTranslates` и добавь кнопки к нужному ключу. Кнопки добавляются для каждого языка отдельно:

```ts
ru: {
  welcome: [
    { text: "📋 Статус", call: "status_show" },
    { text: "⚙️ Настройки", call: "settings_open" },
  ],
  // ...
}
```

Каждая кнопка — объект с двумя полями:

- `text` — надпись, которую видит пользователь
- `call` — уникальный идентификатор нажатия (латиница, без пробелов)

Если массив пустой `[]` — кнопки не появятся. Бот сам решает добавлять их или нет.

---

## Шаг 2 — Обработать нажатие в `ButtonHandler.ts`

Открой `src/BotService/dialog/handlers/ButtonHandler.ts`. В конструкторе зарегистрируй обработчик по значению `call`:

```ts
this.bot.callbackQuery("status_show", (ctx) => this.onStatusShow(ctx));
```

Добавь метод:

```ts
async onStatusShow(ctx: CallbackQueryContext<BotContext>) {
  await ctx.answerCallbackQuery(); // обязательно — убирает индикатор загрузки на кнопке
  const reply = this.dialog.buildStatus(ctx.session.lang);
  await this.resolver.reply(ctx, reply);
}
```

`ctx.answerCallbackQuery()` можно вызвать с текстом — он покажется как всплывающее уведомление:

```ts
await ctx.answerCallbackQuery("Готово!");
```

---

## Кнопки в несколько рядов

> 🚧 Будет описано позже

Сейчас все кнопки добавляются в один ряд. Поддержка нескольких рядов через `InlineKeyboard.row()` будет добавлена в `MessageFactory`.
