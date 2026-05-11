import type { Bot, CallbackQueryContext } from "grammy";
import type { DialogEngine } from "../DialogEngine.js";
import type { ReplyResolver } from "../ReplyResolver.js";
import type { botLanguage } from "../../utils/types.js";
import type { BotContext } from "../../BotService.js";

export class ButtonHandler {
  constructor(
    private bot: Bot<BotContext>,
    private dialog: DialogEngine,
    private resolver: ReplyResolver,
  ) {
    this.bot.callbackQuery("lang=ru", (ctx) => this.onSetLang(ctx, "ru"));
    this.bot.callbackQuery("lang=en", (ctx) => this.onSetLang(ctx, "en"));
  }

  async onSetLang(ctx: CallbackQueryContext<BotContext>, newLang: botLanguage) {
    await ctx.answerCallbackQuery();
    if (newLang !== ctx.session.lang) {
      ctx.session.lang = newLang;
      const reply = this.dialog.buildLanguageChanged(newLang);
      await this.resolver.reply(ctx, reply);
    }
  }
}
