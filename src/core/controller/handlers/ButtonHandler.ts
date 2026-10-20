import type { Composer } from "grammy";
import { DialogStep, type BotContext } from "../../types.js";
import type { IBotModel } from "../../IBotModel.js";

export class ButtonHandler {
  constructor(
    private composer: Composer<BotContext>,
    model: IBotModel,
  ) {
    this.composer.callbackQuery(/^lang=(.+)$/, async (ctx) => {
      if (await model.changeLang(ctx, ctx.match[1]!)) {
        await model.mainMenu(ctx, false);
      } else {
        await model.errorCallback(ctx.match[0], ctx);
      }
    });

    // navDir:.. | navDir:root | navDir:<ref>
    this.composer.callbackQuery(/^navDir:(.+)$/, async (ctx) => {
      const target = ctx.match[1]!;

      if (target === ".." && model.isAtRoot(ctx)) {
        await ctx.answerCallbackQuery();
        return;
      }

      const dir =
        target === ".." || target === "root"
          ? target
          : model.resolvePath(ctx, target);
      if (!dir) return await model.menuOutdated(ctx);

      await model.navigateTo(ctx, dir);
      await ctx.answerCallbackQuery();
      await model.navMenu(ctx);
    });

    this.composer.callbackQuery(/^delete(File|Dir):(.+)$/, async (ctx) => {
      if (ctx.match[1]) {
        const type = ctx.match[1];
        const isFile = type === "File";
        const path = model.resolvePath(ctx, ctx.match[2]!);
        if (!path) return await model.menuOutdated(ctx);

        if (type === "File") {
          const result = await model.deleteFile(ctx, path);

          result
            ? await model.sendDeletedSuccessfully(ctx, isFile, path)
            : await model.sendDeletionError(isFile, path, ctx);
        } else if (type === "Dir") {
          const result = await model.removeDirectory(ctx, path);

          result
            ? await model.sendDeletedSuccessfully(ctx, isFile, path)
            : await model.sendDeletionError(isFile, path, ctx);
        }
        await ctx.answerCallbackQuery();
        await model.navMenu(ctx);
      } else {
        await model.errorCallback(ctx.match[0], ctx);
      }
    });

    this.composer.callbackQuery(/^delete(?:File|Dir)Ask:(.+)$/, async (ctx) => {
      if (ctx.match[1]) {
        const path = model.resolvePath(ctx, ctx.match[1]);
        if (!path) return await model.menuOutdated(ctx);
        await model.deleteAskMenu(ctx, path);
        await ctx.answerCallbackQuery();
      } else {
        await model.errorCallback(ctx.match[0], ctx);
      }
    });

    this.composer.callbackQuery("cancel", async (ctx) => {
      await ctx.answerCallbackQuery();
      model.sessionReset(ctx);
      await model.navMenu(ctx);
    });

    this.composer.callbackQuery(/^new(File|Directory)$/, async (ctx) => {
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
        await model.errorCallback(ctx.match[0], ctx);
      }
    });

    this.composer.callbackQuery(/^rename(?:File|Dir)Ask:(.+)$/, async (ctx) => {
      if (ctx.match[1]) {
        const path = model.resolvePath(ctx, ctx.match[1]);
        if (!path) return await model.menuOutdated(ctx);
        await ctx.answerCallbackQuery();
        await model.askNewName(path, ctx);
      } else {
        await model.errorCallback(ctx.match[0], ctx);
      }
    });

    this.composer.callbackQuery("newAsk", async (ctx) => {
      await ctx.answerCallbackQuery();
      await model.askForDocumentType(ctx);
    });

    this.composer.callbackQuery(/^(?:dir|file)Actions:(.+)$/, async (ctx) => {
      if (ctx.match[1]) {
        const path = model.resolvePath(ctx, ctx.match[1]);
        if (!path) return await model.menuOutdated(ctx);
        await ctx.answerCallbackQuery();
        await model.actionsMenu(ctx, path);
      } else {
        await model.errorCallback(ctx.match[0], ctx);
      }
    });

    // filePage:<ref>:<page> — the next/previous page of a text file
    this.composer.callbackQuery(/^filePage:(.+):(\d+)$/, async (ctx) => {
      const path = model.resolvePath(ctx, ctx.match[1]!);
      if (!path) return await model.menuOutdated(ctx);
      await ctx.answerCallbackQuery();
      await model.turnTextFilePage(ctx, path, Number(ctx.match[2]));
    });

    this.composer.callbackQuery(/^openFile:(.+)$/, async (ctx) => {
      const path = model.resolvePath(ctx, ctx.match[1]!);
      if (!path) return await model.menuOutdated(ctx);
      // answer right away: loading and sending a big file takes a while,
      // and a late answer fails as "query is too old"
      await ctx.answerCallbackQuery();
      await model.openFile(ctx, path);
    });
  }
}
