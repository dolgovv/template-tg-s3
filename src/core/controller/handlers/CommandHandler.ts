import type { Composer } from "grammy";
import type { BotContext } from "../../types.js";
import type { IBotModel } from "../../IBotModel.js";

export class CommandHandler {
  constructor(
    private composer: Composer<BotContext>,
    model: IBotModel,
  ) {
    this.composer.command("start", async (ctx) => await model.mainMenu(ctx));

    this.composer.command("help", async (ctx) => await model.sendHelp(ctx));

    this.composer.command(
      "all_imgs_here",
      async (ctx) => await model.sendAllImagesHere(ctx),
    );
    this.composer.command("list_all", async (ctx) => await model.sendTree(ctx));

    this.composer.command("nav", async (ctx) => {
      ctx.session.lastMenuMessageId = 0;
      await model.navMenu(ctx);
    });
  }
}
