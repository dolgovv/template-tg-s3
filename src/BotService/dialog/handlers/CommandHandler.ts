import type { Bot, Context } from "grammy";
import type { DialogEngine } from "../DialogEngine.js";
import { ReplyResolver } from "../ReplyResolver.js";

export class CommandHandler {
  constructor(
    private bot: Bot,
    private dialog: DialogEngine,
    private resolver: ReplyResolver,
    private websiteName: string,
  ) {
    this.bot.command("start", (ctx) => {
      this.onStart(ctx);
    });

    this.bot.command("lang", (ctx) => {
      this.onLang(ctx);
    });

    this.bot.command("help", (ctx) => {
      this.onHelp(ctx);
    });
  }

  onStart(ctx: Context) {
    if (ctx.chat) {
      const reply = this.dialog.buildWelcome(
        ctx.chat.first_name || this.dialog.mText().anonName,
        this.websiteName,
      );
      this.resolver.reply(ctx, reply);
    }
  }

  onLang(ctx: Context) {
    this.dialog.setLanguage(this.dialog.getLanguage() === "ru" ? "en" : "ru");
    if (ctx.chat) {
      const reply = this.dialog.buildLanguageChanged();
      this.resolver.reply(ctx, reply);
    }
  }

  onHelp(ctx: Context) {
    if (ctx.chat) {
      const reply = this.dialog.buildHelp();
      this.resolver.reply(ctx, reply);
    }
  }
}
