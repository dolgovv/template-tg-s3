import type { Bot } from "grammy";

import type { DialogEngine } from "../DialogEngine.js";
import { ReplyResolver } from "../ReplyResolver.js";
import type { BotContext } from "../../BotService.js";
import { DialogState } from "../../utils/types.js";
import { BotRepository } from "../../datasource/S3Repository.js";

const TEMPORARY_POST_UUID = "d420f6dd-99a4-442f-a9fa-ea54b68f2373";

export class CommandHandler {
  constructor(
    private bot: Bot<BotContext>,
    private dialog: DialogEngine,
    private resolver: ReplyResolver,
    private repo: BotRepository,
    private websiteName: string,
  ) {
    this.bot.command("start", (ctx) => this.onStart(ctx));
    this.bot.command("lang", (ctx) => this.onLang(ctx));
    this.bot.command("help", (ctx) => this.onHelp(ctx));
    this.bot.command("get_dirs", (ctx) => this.onGetDirs(ctx));
    this.bot.command("button_echo", (ctx) => this.onButtonEcho(ctx));
    this.bot.command("test_text", (ctx) => this.onTest_text(ctx));
    this.bot.command("test_img", (ctx) => this.onTest_img(ctx));
    this.bot.command("test_imgs", (ctx) => this.onTest_imgs(ctx));
    this.bot.command("test_post", (ctx) => this.onTest_post(ctx));
  }

  async onTest_img(ctx: BotContext) {
    if (ctx.chat) {
      const prefix = "posts";
      const uuid = TEMPORARY_POST_UUID;
      const fileName = "image-1.jpg";
      const path = `${prefix}/${uuid}/${fileName}`;

      try {
        const imageBuffer = await this.repo.getImage(path);

        const reply = this.dialog.buildImg(imageBuffer);
        await this.resolver.reply(ctx, reply);
      } catch (err) {
        const lang = ctx.session.lang;
        const reply = this.dialog.buildError(lang, "get file (image) " + err);
        await this.resolver.reply(ctx, reply);
      }
    }
  }

  async onTest_imgs(ctx: BotContext) {
    if (ctx.chat) {
      const prefix = "posts";
      const uuid = TEMPORARY_POST_UUID;
      const path = `${prefix}/${uuid}/`;

      try {
        const imageBuffers = await this.repo.getImagesInDir(path);

        const reply = this.dialog.buildImgs(imageBuffers);
        await this.resolver.reply(ctx, reply);
      } catch (err) {
        const lang = ctx.session.lang;
        const reply = this.dialog.buildError(
          lang,
          "get files (images): " + err,
        );

        await this.resolver.reply(ctx, reply);
      }
    }
  }

  async onTest_post(ctx: BotContext) {
    if (ctx.chat) {
      const prefix = "posts";
      const uuid = TEMPORARY_POST_UUID;
      const path = `${prefix}/${uuid}/`;

      try {
        const imageBuffers = await this.repo.getImagesInDir(path);
        const textfileContent = await this.repo.getText(`${path}text.txt`);

        const reply = this.dialog.buildImgs(imageBuffers, textfileContent);
        await this.resolver.reply(ctx, reply);
      } catch (err) {
        const lang = ctx.session.lang;
        const reply = this.dialog.buildError(
          lang,
          "get file (image + text) " + err,
        );
        await this.resolver.reply(ctx, reply);
      }
    }
  }

  async onTest_text(ctx: BotContext) {
    const prefix = "posts";
    const uuid = TEMPORARY_POST_UUID;
    const fileName = "text.txt";
    const path = `${prefix}/${uuid}/${fileName}`;
    if (ctx.chat) {
      try {
        const textfileContent = await this.repo.getText(path);
        const reply = this.dialog.buildTextFile(textfileContent);
        await this.resolver.reply(ctx, reply);
      } catch (err) {
        const lang = ctx.session.lang;
        console.error("get-file error:", err);
        const reply = this.dialog.buildError(lang, "get file (text) " + err);
        await this.resolver.reply(ctx, reply);
      }
    }
  }

  async onGetDirs(ctx: BotContext) {
    if (!ctx.chat) return;
    const lang = ctx.session.lang;
    try {
      const dirs = await this.repo.listDirectories();
      const reply = this.dialog.buildDirList(lang, dirs);
      await this.resolver.reply(ctx, reply);
    } catch (err) {
      console.error("get-dirs error:", err);
      const reply = this.dialog.buildError(lang, "get directories " + err);
      await this.resolver.reply(ctx, reply);
    }
  }

  async onStart(ctx: BotContext) {
    if (ctx.chat) {
      const lang = ctx.session.lang;
      const reply = this.dialog.buildWelcome(
        lang,
        ctx.chat.first_name || this.dialog.anonName(lang),
        this.websiteName,
      );
      await this.resolver.reply(ctx, reply);
    }
  }

  async onLang(ctx: BotContext) {
    ctx.session.lang = ctx.session.lang === "ru" ? "en" : "ru";
    if (ctx.chat) {
      const reply = this.dialog.buildLanguageChanged(ctx.session.lang);
      await this.resolver.reply(ctx, reply);
    }
  }

  async onHelp(ctx: BotContext) {
    if (ctx.chat) {
      const reply = this.dialog.buildHelp(ctx.session.lang);
      await this.resolver.reply(ctx, reply);
    }
  }

  async onButtonEcho(ctx: BotContext) {
    if (!ctx.chat) return;
    ctx.session.dialogState = DialogState.AwaitingButtonEcho;
    await ctx.reply("Отправь любое слово, и я пришлю его в виде кнопки.");
  }
}
