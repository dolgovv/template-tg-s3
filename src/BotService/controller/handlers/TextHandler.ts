import type { Bot } from "grammy";
import type { BotContext } from "../../utils/types.js";
import type { BotModel } from "../../domain/BotModel.js";
import { DialogStep } from "../../utils/types.js";

export class TextHandler {
  constructor(
    private bot: Bot<BotContext>,
    model: BotModel,
  ) {
    this.bot.on("message:text", async (ctx) => {
      const step = ctx.session.dialogStep;

      switch (step) {
        case DialogStep.AwaitingAdditionType:
          model.askForDocumentType(ctx);
          ctx.session.dialogStep = DialogStep.Idle;
          break;

        case DialogStep.AwaitingPhoto:
          const bestPhoto = model.getBestPhoto(ctx);
          if (bestPhoto) {
            const result = await model.addPhoto(bestPhoto, ctx);
            if (result) ctx.session.dialogStep = DialogStep.Idle;
          }
          break;

        case DialogStep.AwaitingDirectoryName:
          if (ctx.message.text) {
            const result = await model.createDirectory(
              ctx.session.currentDir,
              ctx.message.text,
            );
            if (result === "") {
              model.sendError("Error while creating directory", ctx);
            }
            await model.navMenu(ctx);
          }
          ctx.session.dialogStep = DialogStep.Idle;
          break;

        default:
          break;
      }
    });
  }
}
