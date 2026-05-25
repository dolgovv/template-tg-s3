import type { Bot } from "grammy";
import type { BotContext } from "../../BotService.js";
import type { BotModel } from "../../domain/BotModel.js";
import { DialogStep } from "../../utils/types.js";

export class ButtonHandler {
  constructor(
    private bot: Bot<BotContext>,
    model: BotModel,
  ) {
    this.bot.callbackQuery("lang=ru", async (ctx) => {
      await model.changeLang(ctx, "ru");
      await model.mainMenu(ctx);
    });

    this.bot.callbackQuery("lang=en", async (ctx) => {
      await model.changeLang(ctx, "en");
      await model.mainMenu(ctx);
    });

    this.bot.callbackQuery(/^deleteFile:(.+)$/, async (ctx) => {
      const path = ctx.match[1]!;
      if (path) {
        await ctx.answerCallbackQuery();
        await model.deleteFile(ctx, path);
      } else {
        await model.sendError("Delete file error: " + path, ctx);
      }
    });

    this.bot.callbackQuery(/^deleteDir:(.+)$/, async (ctx) => {
      const path = ctx.match[1]!;
      if (path) {
        await ctx.answerCallbackQuery();
        await model.sendError(
          "Removing directories is not implemented yet: " + path,
          ctx,
        );
      } else {
        await model.sendError("Delete file error: " + path, ctx);
      }
    });

    this.bot.callbackQuery("add_img", async (ctx) => {
      ctx.session.dialogStep = DialogStep.AwaitingDocument;
      await ctx.answerCallbackQuery();
      await model.sendAwaitingDocument(ctx);
    });

    this.bot.callbackQuery(/^navDir:(.+)$/, async (ctx) => {
      const dir = ctx.match[1]!;

      if (ctx.session.currentDir === "" && dir === "..") {
        await ctx.answerCallbackQuery();
      } else {
        await model.navTo(ctx, dir === "root" ? ".." : dir);
        await model.navMenu(ctx);
      }
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
