import type { Bot } from "grammy";
import type { BotContext } from "../../BotService.js";
import type { BotModel } from "../../domain/BotModel.js";

export class ButtonHandler {
  constructor(
    private bot: Bot<BotContext>,
    model: BotModel,
  ) {
    this.bot.callbackQuery("lang=ru", async (ctx) => {
      await model.changeLang(ctx, "ru");
    });

    this.bot.callbackQuery(
      "lang=en",
      async (ctx) => await model.changeLang(ctx, "en"),
    );

    this.bot.callbackQuery(/^navDir:(.+)$/, async (ctx) => {
      const dir = ctx.match[1]!;

      if (ctx.session.currentDir === "" && dir === "..") {
        await ctx.answerCallbackQuery();
      } else {
        await model.navTo(ctx, dir === "root" ? ".." : dir);
        await model.navMenu(ctx);
      }
    });
  }
}
