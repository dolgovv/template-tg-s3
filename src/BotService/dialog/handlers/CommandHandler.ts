import type { Bot } from "grammy";
import type { BotContext } from "../../BotService.js";
import type { BotModel } from "../../domain/BotModel.js";
import { DialogStep } from "../../utils/types.js";

export class CommandHandler {
  constructor(
    private bot: Bot<BotContext>,
    model: BotModel,
  ) {
    this.bot.command("start", async (ctx) => await model.mainMenu(ctx));

    this.bot.command("help", async (ctx) => await model.onHelp(ctx));

    this.bot.command("add_mult_photos", async (ctx) => {
      ctx.session.dialogStep = DialogStep.AwaitingMultiplePhotos;
      await model.sendAwaitingMultiplePhotos(ctx);
    });

    this.bot.command(
      "all_imgs_here",
      async (ctx) => await model.sendAllImages(ctx),
    );
    this.bot.command("nav", async (ctx) => {
      ctx.session.lastMenuMessageId = 0;
      await model.navMenu(ctx);
    });
  }
}
