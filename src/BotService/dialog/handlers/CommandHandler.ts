import type { DialogEngine } from "../DialogEngine.js";
import { ReplyResolver } from "../ReplyResolver.js";
import type { BotContext } from "../../BotService.js";
import type { Bot } from "grammy";

export class CommandHandler {
  constructor(
    private bot: Bot<BotContext>,
    private dialog: DialogEngine,
    private resolver: ReplyResolver,
    private websiteName: string,
  ) {
    this.bot.command("start", (ctx) => this.onStart(ctx));
    this.bot.command("lang", (ctx) => this.onLang(ctx));
    this.bot.command("help", (ctx) => this.onHelp(ctx));
  }

  async onStart(ctx: BotContext) {
    if (ctx.chat) {
      const lang = ctx.session.lang;
      const reply = this.dialog.buildWelcome(
        lang,
        ctx.chat.first_name || this.dialog.anonName(lang),
        this.websiteName,
      );
      await this.resolver.reply(ctx, reply);
    }
  }

  async onLang(ctx: BotContext) {
    ctx.session.lang = ctx.session.lang === "ru" ? "en" : "ru";
    if (ctx.chat) {
      const reply = this.dialog.buildLanguageChanged(ctx.session.lang);
      await this.resolver.reply(ctx, reply);
    }
  }

  async onHelp(ctx: BotContext) {
    if (ctx.chat) {
      const reply = this.dialog.buildHelp(ctx.session.lang);
      await this.resolver.reply(ctx, reply);
    }
  }
}
