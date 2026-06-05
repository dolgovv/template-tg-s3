import type { Bot } from "grammy";
import type { BotContext } from "../../utils/types.js";
import type { BotModel } from "../../domain/BotModel.js";

export class MediaHandler {
  constructor(
    private bot: Bot<BotContext>,
    model: BotModel,
  ) {
    this.bot.on(":photo", async (ctx: BotContext) => {
      const bestPhoto = model.getBestPhoto(ctx);
      const name = ctx.message?.caption;
      if (bestPhoto) await model.addPhoto(bestPhoto, ctx, name);
    });
  }
}
