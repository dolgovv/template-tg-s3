import type { Bot } from "grammy";
import type { BotModel } from "../../domain/BotModel.js";
import { DialogStep, type BotContext } from "../../utils/types.js";

export class ButtonHandler {
  constructor(
    private bot: Bot<BotContext>,
    model: BotModel,
  ) {
    this.bot.callbackQuery(/lang=(ru|en)/, async (ctx) => {
      const newLang = ctx.match[1]! === "ru" ? "ru" : "en";
      await model.changeLang(ctx, newLang);
      await model.mainMenu(ctx, false);
    });

    this.bot.callbackQuery(/^navDir:(.+)$/, async (ctx) => {
      const dir = ctx.match[1]!;

      if (ctx.session.currentDir === "" && dir === "..") {
        await ctx.answerCallbackQuery();
      } else {
        await model.navTo(ctx, dir === "root" ? ".." : dir);
        await ctx.answerCallbackQuery();
        await model.navMenu(ctx);
      }
    });

    this.bot.callbackQuery(/^delete(File|Dir):(.+)$/, async (ctx) => {
      const type = ctx.match[1]!;
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
    });

    this.bot.callbackQuery(/^delete(File|Dir)Ask:(.+)$/, async (ctx) => {
      const path = ctx.match[2]!;
      await model.deleteAskMenu(ctx, path);
      await ctx.answerCallbackQuery();
    });

    this.bot.callbackQuery("cancel", async (ctx) => {
      ctx.answerCallbackQuery();
      await model.navMenu(ctx);
    });

    this.bot.callbackQuery(/new(File|Dir)/, async (ctx) => {
      const isFile = ctx.match[1]! === "File";
      console.log("ctx.match = ", ctx.match);

      if (isFile) {
        ctx.session.dialogStep = DialogStep.AwaitingPhoto;
        await ctx.answerCallbackQuery();
        await model.sendAwaitingDocument(ctx);
      } else {
        ctx.session.dialogStep = DialogStep.AwaitingDirectoryName;
        await ctx.answerCallbackQuery();
        await model.sendAwaitingDirectoryName(ctx);
      }
    });

    this.bot.callbackQuery(/rename(?:File|Dir)Ask:(.+)/, async (ctx) => {
      const path = ctx.match[1];
      ctx.session.chosenPath = path ? path : "";
      ctx.session.dialogStep = DialogStep.AwaitingNewName;
      await ctx.answerCallbackQuery();
      console.log("new name required");

      await model.askNewName(ctx);
    });

    this.bot.callbackQuery("newAsk", async (ctx) => {
      ctx.session.dialogStep = DialogStep.AwaitingAdditionType;
      await ctx.answerCallbackQuery();
      await model.askForDocumentType(ctx);
    });

    this.bot.callbackQuery(/^(?:dir|file)Actions:(.+)$/, async (ctx) => {
      const path = ctx.match[1]!;

      await model.actionsMenu(ctx, path);
    });

    this.bot.callbackQuery(/^openFile:(.+)$/, async (ctx) => {
      const path = ctx.match[1]!;

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
            console.log("хуйню какую-то попробовал открыть");
            await model.sendError(
              "Unsupported (yet) file extension: " + path,
              ctx,
            );

            break;
        }

        await ctx.answerCallbackQuery();
      }
    });
  }
}
