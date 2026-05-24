import type { Bot } from "grammy";
import type { BotContext } from "../../BotService.js";
import type { BotModel } from "../../domain/BotModel.js";

export class ButtonHandler {
  constructor(
    private bot: Bot<BotContext>,
    model: BotModel,
  ) {
    this.bot.callbackQuery("lang=ru", async (ctx) => {
      await model.changeLang(ctx, "ru");
    });

    this.bot.callbackQuery(
      "lang=en",
      async (ctx) => await model.changeLang(ctx, "en"),
    );

    this.bot.callbackQuery(/^navDir:(.+)$/, async (ctx) => {
      const dir = ctx.match[1]!;

      if (ctx.session.currentDir === "" && dir === "..") {
        await ctx.answerCallbackQuery();
      } else {
        await model.navTo(ctx, dir === "root" ? ".." : dir);
        await model.navMenu(ctx);
      }
    });

    this.bot.callbackQuery(/^openFile:(.+)$/, async (ctx) => {
      const path = ctx.match[1]!;
      console.log("/OPENFILE CALLED");

      if (ctx.session.currentDir === "" && path === "..") {
        await ctx.answerCallbackQuery();
      } else {
        const extensionIndex: number = path.lastIndexOf(".");
        const fileExtension = path.slice(extensionIndex);
        console.log("ТОЛЬКО ЧТО ТЫ ПОПРОБОВАЛ ОТКРЫТЬ", fileExtension, " файл");

        switch (fileExtension) {
          case ".jpg":
          case ".png":
            await model.sendImage(ctx, path);
            break;

          case ".txt":
            await model.sendTextFile(ctx, path);
            break;

          default:
            console.log("хуйня какя-то");
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
