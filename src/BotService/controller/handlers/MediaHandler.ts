import type { Bot } from "grammy";
import type { BotContext } from "../../utils/types.js";
import type { IBotModel } from "../../controller/IBotModel.js";

export class MediaHandler {
  constructor(
    private bot: Bot<BotContext>,
    model: IBotModel,
  ) {
    this.bot.on(":file", async (ctx: BotContext) => {
      const fileId = model.getFileId(ctx);
      const name = ctx.message?.caption;
      if (fileId) await model.addFile(fileId, ctx, name);
    });
  }
}
