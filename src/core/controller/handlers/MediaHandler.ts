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
      if (!fileId) return;

      // an album comes as several messages: collect them and name together
      if (ctx.message?.media_group_id) {
        model.addAlbumItem(ctx, fileId);
        return;
      }
      await model.addFile(fileId, ctx, ctx.message?.caption);
    });
  }
}
