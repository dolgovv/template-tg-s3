import type { Composer } from "grammy";
import type { BotContext } from "../../types.js";
import type { IBotModel } from "../../IBotModel.js";

export class MediaHandler {
  constructor(
    private composer: Composer<BotContext>,
    model: IBotModel,
  ) {
    this.composer.on(":file", async (ctx: BotContext) => {
      const fileId = model.getFileId(ctx);
      const name = ctx.message?.caption;
      if (fileId) await model.addFile(fileId, ctx, name);
    });
  }
}
