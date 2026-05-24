import type { Bot } from "grammy";
import type { BotContext } from "../../BotService.js";
import type { BotModel } from "../../domain/BotModel.js";

export class TextHandler {
  constructor(
    private bot: Bot<BotContext>,
    model: BotModel,
  ) {
    this.bot.on("message", (ctx) => {
      const step = ctx.session.dialogStep;
      switch (step) {
        case "awaiting_document":
          model.addFile(ctx);
          break;

        default:
          break;
      }
    });
  }
}
