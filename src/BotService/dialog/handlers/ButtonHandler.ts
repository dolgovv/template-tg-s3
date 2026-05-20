import type { Bot } from "grammy";
import type { BotContext } from "../../BotService.js";
import type { BotModel } from "../../domain/BotModel.js";

export class ButtonHandler {
  constructor(
    private bot: Bot<BotContext>,
    // private dialog: DialogEngine,
    model: BotModel,
  ) {
    // Change language
    this.bot.callbackQuery("lang=ru", async (ctx) => {
      await model.changeLang(ctx, "ru");
    });
    this.bot.callbackQuery(
      "lang=en",
      async (ctx) => await model.changeLang(ctx, "en"),
    );
    // Navigate to :dir
    this.bot.callbackQuery(/^navDir:(.+)$/, async (ctx) => {
      const dir = ctx.match[1]!;
      console.log(`dir from navTo (btn)= '${dir}'`);
      await model.navTo(ctx, dir);
      await model.navMenu(ctx);
    });
  }
}
