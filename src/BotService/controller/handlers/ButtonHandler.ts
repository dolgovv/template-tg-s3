import type { Bot } from "grammy";
import type { IBotModel } from "../../controller/IBotModel.js";
import { DialogStep, type BotContext } from "../../utils/types.js";

export class ButtonHandler {
  constructor(
    private bot: Bot<BotContext>,
    model: IBotModel,
  ) {
    this.bot.callbackQuery(/lang=(ru|en)/, async (ctx) => {
      if (ctx.match[1]) {
        const newLang = ctx.match[1] === "ru" ? "ru" : "en";
        await model.changeLang(ctx, newLang);
        await model.mainMenu(ctx, false);
      } else {
        model.errorCallback(ctx.match[0], ctx);
      }
    });

    this.bot.callbackQuery(/^navDir:(.+)$/, async (ctx) => {
      if (ctx.match[1]) {
        const dir = ctx.match[1];

        if (ctx.session.currentDir === "" && dir === "..") {
          await ctx.answerCallbackQuery();
        } else {
          await model.navTo(ctx, dir === "root" ? ".." : dir);
          await ctx.answerCallbackQuery();
          await model.navMenu(ctx);
        }
      } else {
        model.errorCallback(ctx.match[0], ctx);
      }
    });

    this.bot.callbackQuery(/^delete(File|Dir):(.+)$/, async (ctx) => {
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

    this.bot.callbackQuery(/^delete(:?File|Dir)Ask:(.+)$/, async (ctx) => {
      if (ctx.match[1]) {
        const path = ctx.match[1];
        await model.deleteAskMenu(ctx, path);
        await ctx.answerCallbackQuery();
      } else {
        model.errorCallback(ctx.match[0], ctx);
      }
    });

    this.bot.callbackQuery("cancel", async (ctx) => {
      ctx.answerCallbackQuery();
      await model.navMenu(ctx);
    });

    this.bot.callbackQuery(/new(File|Dir)/, async (ctx) => {
      if (ctx.match[1]) {
        const isFile = ctx.match[1] === "File";
        if (isFile) {
          ctx.session.dialogStep = DialogStep.AwaitingPhoto;
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

    this.bot.callbackQuery(/rename(?:File|Dir)Ask:(.+)/, async (ctx) => {
      if (ctx.match[1]) {
        const path = ctx.match[1];
        ctx.session.chosenPath = path ? path : "";
        ctx.session.dialogStep = DialogStep.AwaitingNewName;
        await ctx.answerCallbackQuery();
        await model.askNewName(ctx);
      } else {
        model.errorCallback(ctx.match[0], ctx);
      }
    });

    this.bot.callbackQuery("newAsk", async (ctx) => {
      ctx.session.dialogStep = DialogStep.AwaitingAdditionType;
      await ctx.answerCallbackQuery();
      await model.askForDocumentType(ctx);
    });

    this.bot.callbackQuery(/^(?:dir|file)Actions:(.+)$/, async (ctx) => {
      if (ctx.match[1]) {
        const path = ctx.match[1];
        await model.actionsMenu(ctx, path);
      } else {
        model.errorCallback(ctx.match[0], ctx);
      }
    });

    this.bot.callbackQuery(/^openFile:(.+)$/, async (ctx) => {
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
