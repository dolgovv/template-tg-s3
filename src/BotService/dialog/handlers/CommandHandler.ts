import type { Bot } from "grammy";
import type { BotContext } from "../../BotService.js";
import type { BotModel } from "../../domain/BotModel.js";

export class CommandHandler {
  constructor(
    private bot: Bot<BotContext>,
    private model: BotModel,
  ) {
    this.bot.command("start", async (ctx) => await model.onStart(ctx));
    this.bot.command("help", async (ctx) => await model.onHelp(ctx));
    this.bot.command("nav", async (ctx) => {
      ctx.session.lastMenuMessageId = 0;
      await model.navMenu(ctx);
    });
  }
}
