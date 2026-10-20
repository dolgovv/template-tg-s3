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

        // files are handled by MediaHandler, a text here means the user
        // didn't get what to send, so remind them
        case DialogStep.AwaitingPhoto:
          await model.sendAwaitingDocument(ctx);
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
                await model.sendError(
                  "Error while creating directory",
                  ctx,
                  ctx.t.errors.createFolderFailed,
                );
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
                  await model.sendError(
                  "Error while creating directory",
                  ctx,
                  ctx.t.errors.createFolderFailed,
                );
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
                await model.sendError(
                  "Error while creating directory",
                  ctx,
                  ctx.t.errors.createFolderFailed,
                );
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
