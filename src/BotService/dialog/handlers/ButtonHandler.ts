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

  async onNav(ctx: CallbackQueryContext<BotContext>, dir: string) {
    const lang = ctx.session.lang;
    await ctx.answerCallbackQuery();
    if (dir) {
      if (dir === "..") {
        let slashes: number = 0;
        let newDir = ctx.session.currentDir.substring(0);
        let i = newDir.length;
        for (; i > 0 && slashes < 2; i--) {
          if (newDir[i] === "/") {
            slashes++;
          }
        }
        newDir = newDir.substring(0, -i);
        ctx.session.currentDir = newDir;
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
