import type { Bot } from "grammy";
import type { IBotModel } from "../../controller/IBotModel.js";
import type { BotContext } from "../../utils/types.js";

export class CommandHandler {
  constructor(
    private bot: Bot<BotContext>,
    model: IBotModel,
  ) {
    this.bot.command("start", async (ctx) => await model.mainMenu(ctx));

    this.bot.command("help", async (ctx) => await model.sendHelp(ctx));

    this.bot.command(
      "all_imgs_here",
      async (ctx) => await model.sendAllImagesHere(ctx),
    );
    this.bot.command("nav", async (ctx) => {
      ctx.session.lastMenuMessageId = 0;
      await model.navMenu(ctx);
    });
  }
}
