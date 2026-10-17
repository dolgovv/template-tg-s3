import type { Composer } from "grammy";
import {
  DialogStep,
  SUPPORTED_LANGUAGES,
  type BotContext,
  type botLanguage,
} from "../../types.js";
import type { IBotModel } from "../../IBotModel.js";

export class ButtonHandler {
  constructor(
    private composer: Composer<BotContext>,
    model: IBotModel,
  ) {
    this.composer.callbackQuery(/lang=(.+)/, async (ctx) => {
      const candidate = ctx.match[1];
      if (
        candidate &&
        (SUPPORTED_LANGUAGES as readonly string[]).includes(candidate)
      ) {
        await model.changeLang(ctx, candidate as botLanguage);
        await model.mainMenu(ctx, false);
      } else {
        model.errorCallback(ctx.match[0], ctx);
      }
    });

    this.composer.callbackQuery(/^navDir:(.+)$/, async (ctx) => {
      if (ctx.match[1]) {
        const dir = ctx.match[1];

        if (ctx.session.currentDir === "" && dir === "..") {
          await ctx.answerCallbackQuery();
        } else {
          await model.navigateTo(ctx, dir === "root" ? ".." : dir);
          await ctx.answerCallbackQuery();
          await model.navMenu(ctx);
        }
      } else {
        model.errorCallback(ctx.match[0], ctx);
      }
    });

    this.composer.callbackQuery(/^delete(File|Dir):(.+)$/, async (ctx) => {
      if (ctx.match[1]) {
        const type = ctx.match[1];
        const isFile = type === "File";
        const path = ctx.match[2]!;
        if (!path) {
          await model.sendDeletionError(isFile, path, ctx);
        }

        if (type === "File") {
          const result = await model.deleteFile(ctx, path);

          result
            ? await model.sendDeletedSuccessfully(ctx, isFile, path)
            : await model.sendDeletionError(isFile, path, ctx);
        } else if (type === "Dir") {
          const result = await model.removeDirectory(path);

          result
            ? await model.sendDeletedSuccessfully(ctx, isFile, path)
            : await model.sendDeletionError(isFile, path, ctx);
        }
        await ctx.answerCallbackQuery();
        await model.navMenu(ctx);
      } else {
        model.errorCallback(ctx.match[0], ctx);
      }
    });

    this.composer.callbackQuery(/^delete(?:File|Dir)Ask:(.+)$/, async (ctx) => {
      if (ctx.match[1]) {
        const path = ctx.match[1];
        await model.deleteAskMenu(ctx, path);
        await ctx.answerCallbackQuery();
      } else {
        model.errorCallback(ctx.match[0], ctx);
      }
    });

    this.composer.callbackQuery("cancel", async (ctx) => {
      ctx.answerCallbackQuery();
      model.sessionReset(ctx, true);
      await model.navMenu(ctx);
    });

    this.composer.callbackQuery(/new(File|Dir)/, async (ctx) => {
      if (ctx.match[1]) {
        const isFile = ctx.match[1] === "File";
        if (isFile) {
          await ctx.answerCallbackQuery();
          await model.sendAwaitingDocument(ctx);
        } else {
          ctx.session.dialogStep = DialogStep.AwaitingDirectoryName;
          await ctx.answerCallbackQuery();
          await model.sendAwaitingDirectoryName(ctx);
        }
      } else {
        model.errorCallback(ctx.match[0], ctx);
      }
    });

    this.composer.callbackQuery(/rename(?:File|Dir)Ask:(.+)/, async (ctx) => {
      if (ctx.match[1]) {
        const path = ctx.match[1];
        await ctx.answerCallbackQuery();
        await model.askNewName(path, ctx);
      } else {
        model.errorCallback(ctx.match[0], ctx);
      }
    });

    this.composer.callbackQuery("newAsk", async (ctx) => {
      await ctx.answerCallbackQuery();
      await model.askForDocumentType(ctx);
    });

    this.composer.callbackQuery(/^(?:dir|file)Actions:(.+)$/, async (ctx) => {
      if (ctx.match[1]) {
        const path = ctx.match[1];
        await model.actionsMenu(ctx, path);
      } else {
        model.errorCallback(ctx.match[0], ctx);
      }
    });

    this.composer.callbackQuery(/^openFile:(.+)$/, async (ctx) => {
      if (ctx.match[1]) {
        const path = ctx.match[1];

        if (ctx.session.currentDir === "" && path === "..") {
          await ctx.answerCallbackQuery();
        } else {
          const extensionIndex: number = path.lastIndexOf(".");
          const fileExtension = path.slice(extensionIndex);

          switch (fileExtension) {
            case ".jpg":
            case ".png":
              await model.sendImage(ctx, path);
              await model.navMenu(ctx);
              break;

            case ".txt":
              await model.sendTextFile(ctx, path);
              await model.navMenu(ctx);
              break;

            default:
              await model.sendError(
                "Unsupported (yet) file extension: " + path,
                ctx,
              );

              break;
          }

          await ctx.answerCallbackQuery();
        }
      } else {
        model.errorCallback(ctx.match[0], ctx);
      }
    });
  }
}
