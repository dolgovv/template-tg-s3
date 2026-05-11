import type { Bot, Context } from "grammy";
import type { DialogEngine } from "../DialogEngine.js";

export class CommandHandler {
  constructor(
    private bot: Bot,
    private dialog: DialogEngine,
  ) {
    this.bot.command("start", (ctx) => {
      this.onStart(ctx);
    });

    this.bot.command("lang", (ctx) => {
      this.onLang(ctx);
    });
  }
  onLang(ctx: Context) {
    this.dialog.setLanguage(this.dialog.getLanguage() === "ru" ? "en" : "ru");
    if (ctx.chat) {
      ctx.reply(this.dialog.mText().langChanged);
    }
  }

  onStart(ctx: Context) {
    if (ctx.chat) {
      ctx.reply(
        this.dialog
          .mText()
          .greetUser(ctx.chat.first_name || this.dialog.mText().anonName),
      );
    }
  }
}
