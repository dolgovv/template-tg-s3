import type { Bot } from "grammy";
import type { BotContext } from "../../BotService.js";
import type { BotModel } from "../../domain/BotModel.js";
import { DialogStep } from "../../utils/types.js";

export class TextHandler {
  constructor(
    private bot: Bot<BotContext>,
    model: BotModel,
  ) {
    this.bot.on("message", async (ctx) => {
      const step = ctx.session.dialogStep;
      switch (step) {
        case DialogStep.AwaitingAdditionType:
          model.askForDocumentType(ctx);
          ctx.session.dialogStep = DialogStep.Idle;
          break;

        case DialogStep.AwaitingPhoto:
          await model.addPhoto(ctx);
          ctx.session.dialogStep = DialogStep.Idle;
          break;

        case DialogStep.AwaitingDirectoryName:
          if (ctx.message.text) {
            await model.createDirectory(
              ctx.session.currentDir,
              ctx.message.text,
            );
            await model.navMenu(ctx);
          }
          ctx.session.dialogStep = DialogStep.Idle;
          break;

        case DialogStep.AwaitingMultiplePhotos:
          await model.addMultiplePhotos(ctx);
          ctx.session.dialogStep = DialogStep.Idle;
          break;

        default:
          break;
      }
    });
  }
}
