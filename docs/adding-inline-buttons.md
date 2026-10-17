# Добавление inline-кнопок

Кнопки добавляются через файл `src/core/dialog/messages/strings.ts` — никакого дополнительного кода писать не нужно. Обработка нажатий регистрируется в `ButtonHandler.ts`.

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

Если массив пустой `[]` — кнопки не появятся.

---

## Шаг 2 — Добавить метод в `BotModelImpl.ts`

Открой `src/core/domain/BotModelImpl.ts` и добавь метод для обработки нажатия:

```ts
async onStatusShow(ctx: BotContext) {
  await this.dialog.sendStatus(ctx);
}
```

Добавь сигнатуру в `src/core/IBotModel.ts`:

```ts
onStatusShow(ctx: BotContext): Promise<void>;
```

---

## Шаг 3 — Обработать нажатие в `ButtonHandler.ts`

Открой `src/core/controller/handlers/ButtonHandler.ts`. В конструкторе зарегистрируй обработчик по значению `call`:

```ts
this.bot.callbackQuery("status_show", async (ctx) => {
  await ctx.answerCallbackQuery(); // обязательно — убирает индикатор загрузки на кнопке
  await model.onStatusShow(ctx);
});
```

`ctx.answerCallbackQuery()` можно вызвать с текстом — он покажется как всплывающее уведомление:

```ts
await ctx.answerCallbackQuery("Готово!");
```

---

## Кнопки в несколько рядов

> 🚧 Будет описано позже

Сейчас все кнопки добавляются в один ряд. Поддержка нескольких рядов через `InlineKeyboard.row()` будет добавлена в `MessageFactory`.
