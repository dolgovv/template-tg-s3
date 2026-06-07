import type { Bot } from "grammy";
import type { BotContext } from "../../utils/types.js";
import type { IBotModel } from "../../controller/IBotModel.js";

export class MediaHandler {
  constructor(
    private bot: Bot<BotContext>,
    model: IBotModel,
  ) {
    this.bot.on(":photo", async (ctx: BotContext) => {
      const bestPhoto = model.getBiggestPhoto(ctx);
      const name = ctx.message?.caption;
      if (bestPhoto) await model.addImage(bestPhoto, ctx, name);
    });
  }
}
