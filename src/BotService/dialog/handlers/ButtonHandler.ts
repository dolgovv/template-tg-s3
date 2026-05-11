import type { Bot, CallbackQueryContext, Context } from "grammy";
import type { DialogEngine } from "../DialogEngine.js";
import type { ReplyResolver } from "../ReplyResolver.js";
import type { botLanguage } from "../../utils/types.js";

export class ButtonHandler {
  constructor(
    private bot: Bot,
    private dialog: DialogEngine,
    private resolver: ReplyResolver,
    private websiteName: string,
  ) {
    this.bot.callbackQuery("lang=ru", (ctx) => this.onSetLang(ctx, "ru"));
    this.bot.callbackQuery("lang=en", (ctx) => this.onSetLang(ctx, "en"));
  }
  async onSetLang(ctx: CallbackQueryContext<Context>, newLang: botLanguage) {
    if (newLang != this.dialog.getLanguage()) {
      this.dialog.setLanguage(newLang);
      await ctx.answerCallbackQuery();
      const reply = this.dialog.buildLanguageChanged();
      await this.resolver.reply(ctx, reply);
    } else {
      await ctx.answerCallbackQuery();
    }
  }
}
