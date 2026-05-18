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
    // Change language
    this.bot.callbackQuery("lang=ru", (ctx) => this.onSetLang(ctx, "ru"));
    this.bot.callbackQuery("lang=en", (ctx) => this.onSetLang(ctx, "en"));

    // Navigate to :dir
    this.bot.callbackQuery(/^navDir:(.+)$/, async (ctx) => {
      const dir = ctx.match[1]!;
      console.log(`dir='${dir}'`);
      await this.onNav(ctx, dir);
    });
  }

  private navigateBack(ctx: CallbackQueryContext<BotContext>) {
    let i = 0;
    do {
      i++;
    } while (
      ctx.session.currentDir[i] !== "/" &&
      ctx.session.currentDir.length > 0
    );
    ctx.session.currentDir = ctx.session.currentDir.substring(0, -i);

    console.log("new dir = ", ctx.session.currentDir);
  }
  async onNav(ctx: CallbackQueryContext<BotContext>, dir: string) {
    const lang = ctx.session.lang;
    await ctx.answerCallbackQuery();
    if (dir) {
      if (dir === "..") {
        this.navigateBack(ctx);
      } else {
        ctx.session.currentDir = ctx.session.currentDir.concat(dir);
      }
      const reply = this.dialog.buildDirChanged(lang, ctx.session.currentDir);
      await this.resolver.reply(ctx, reply);
    } else {
      console.error("callback nav error: no such location");
      const reply = this.dialog.buildError(
        lang,
        "callback nav error: no such location",
      );
      await this.resolver.reply(ctx, reply);
    }
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
