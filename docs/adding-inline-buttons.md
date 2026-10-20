# Добавление inline-кнопок

Надпись на кнопке — это текст, он переводится. Действие (`call`) и раскладка по рядам — это код, они одни на все языки.

---

## Шаг 1 — Добавить надписи

В `src/core/texts/en.ts` и `ru.ts`, например, в раздел `buttons`:

```ts
// en.ts
buttons: {
  // ...
  status: "📋 Status",
  settings: "⚙️ Settings",
},

// ru.ts
buttons: {
  // ...
  status: "📋 Статус",
  settings: "⚙️ Настройки",
},
```

---

## Шаг 2 — Показать кнопки

Кнопки передаются в `this.dialog.text` или `this.dialog.menu` массивом рядов: каждый вложенный массив — один ряд.

```ts
async sendSettings(ctx: BotContext) {
  const b = ctx.t.buttons;
  await this.dialog.menu(ctx, ctx.t.settings.title, [
    [
      { text: b.status, call: "status_show" },     // два в одном ряду
      { text: b.settings, call: "settings_open" },
    ],
    [{ text: b.back, call: "cancel" }],            // одна во втором ряду
  ]);
}
```

Каждая кнопка — объект с двумя полями:

- `text` — надпись из `ctx.t`
- `call` — идентификатор нажатия (латиница, без пробелов, до 64 байт)

`dialog.menu` редактирует сообщение с меню на месте, `dialog.text` отправляет новое.

Чтобы добавить кнопку в главное меню, правится `sendMainMenu` в `src/core/dialog/DialogEngine.ts`.

---

## Шаг 3 — Обработать нажатие в `ButtonHandler.ts`

Открой `src/core/controller/handlers/ButtonHandler.ts`. В конструкторе зарегистрируй обработчик по значению `call`:

```ts
this.composer.callbackQuery("status_show", async (ctx) => {
  await ctx.answerCallbackQuery(); // убирает индикатор загрузки на кнопке
  await model.onStatusShow(ctx);
});
```

`ctx.answerCallbackQuery()` можно вызвать с текстом — он покажется как всплывающее уведомление (простой текст, без HTML):

```ts
await ctx.answerCallbackQuery(ctx.t.nav.outdated);
```

Если обработчик забудет ответить, ядро ответит за него, но лучше отвечать сразу.

Сигнатуру нового метода модели добавь в `src/core/IBotModel.ts`:

```ts
onStatusShow(ctx: BotContext): Promise<void>;
```
