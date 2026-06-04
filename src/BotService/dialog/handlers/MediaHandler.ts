import type { Bot } from "grammy";
import type { BotContext } from "../../BotService.js";
import type { BotModel } from "../../domain/BotModel.js";

export class MediaHandler {
  constructor(
    private bot: Bot<BotContext>,
    model: BotModel,
  ) {
    this.bot.on(":photo", async (ctx: BotContext) => {
      console.log(":photo activated");
      await model.albumCollector(ctx);
    });
  }
}
