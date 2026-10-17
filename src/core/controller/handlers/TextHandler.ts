import type { Composer } from "grammy";
import type { BotContext } from "../../types.js";
import { DialogStep } from "../../types.js";
import type { IBotModel } from "../../IBotModel.js";

export class TextHandler {
  constructor(
    private composer: Composer<BotContext>,
    model: IBotModel,
  ) {
    this.composer.on("message:text", async (ctx) => {
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
              await model.rename(ctx.session.chosenPath, sanitized, ctx);
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
          if (ctx.message.text !== undefined) {
            const raw = ctx.message.text.trim();
            if (raw.endsWith("/")) {
              const result = await model.createDirectory(
                ctx.session.currentDir,
                raw.slice(0, raw.length - 1),
              );

              if (result === "") {
                model.sendError("Error while creating directory", ctx);
              } else {
                await model.navMenu(ctx);
              }
            } else {
              await model.sendHelp(ctx);
            }
          }
          break;
      }
    });
  }
}
