import type { Bot } from "grammy";
import type { BotContext } from "../../utils/types.js";
import type { IBotModel } from "../../controller/IBotModel.js";
import { DialogStep } from "../../utils/types.js";

export class TextHandler {
  constructor(
    private bot: Bot<BotContext>,
    model: IBotModel,
  ) {
    this.bot.on("message:text", async (ctx) => {
      const step = ctx.session.dialogStep;

      switch (step) {
        case DialogStep.AwaitingAdditionType:
          await model.askForDocumentType(ctx);
          ctx.session.dialogStep = DialogStep.Idle;
          break;

        case DialogStep.AwaitingNewName:
          if (ctx.message.text) {
            const sanitized = model.sanitizeName(ctx.message.text);
            if (!sanitized) {
              await model.sendInvalidNameError(ctx);
            } else {
              await model.renameDir(
                ctx.session.chosenPath,
                ctx.session.currentDir + sanitized + "/",
                ctx,
              );
              await model.navMenu(ctx);
            }
          }
          ctx.session.dialogStep = DialogStep.Idle;
          break;

        case DialogStep.AwaitingPhoto:
          const bestPhoto = model.getBiggestPhoto(ctx);
          if (bestPhoto) {
            const result = await model.addFile(bestPhoto, ctx);
            if (result) ctx.session.dialogStep = DialogStep.Idle;
          }
          break;

        case DialogStep.AwaitingDirectoryName:
          if (ctx.message.text !== undefined) {
            const raw = ctx.message.text.trim();
            if (raw === "") {
              const result = await model.createDirectory(
                ctx.session.currentDir,
                "",
              );
              if (result === "") {
                model.sendError("Error while creating directory", ctx);
              }
            } else {
              const sanitized = model.sanitizeName(raw);
              if (!sanitized) {
                await model.sendInvalidNameError(ctx);
              } else {
                const result = await model.createDirectory(
                  ctx.session.currentDir,
                  sanitized,
                );
                if (result === "") {
                  model.sendError("Error while creating directory", ctx);
                }
              }
            }
            await model.navMenu(ctx);
          }
          ctx.session.dialogStep = DialogStep.Idle;
          break;

        default:
          await model.sendHelp(ctx);
          break;
      }
    });
  }
}
