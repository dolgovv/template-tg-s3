import type { Bot, CommandContext } from "grammy";

import type { DialogEngine } from "../DialogEngine.js";
import { ReplyResolver } from "../ReplyResolver.js";
import type { BotContext } from "../../BotService.js";
import { DialogStep, type MenuButton } from "../../utils/types.js";
import { BotRepository } from "../../datasource/S3Repository.js";

const TEMPORARY_POST_UUID = "d420f6dd-99a4-442f-a9fa-ea54b68f2373";

export class CommandHandler {
  constructor(
    private bot: Bot<BotContext>,
    private dialog: DialogEngine,
    private repo: BotRepository,
    private websiteName: string,
  ) {
    this.bot.command("start", async (ctx) => await this.onStart(ctx));
    this.bot.command("lang", async (ctx) => await this.onLang(ctx));
    this.bot.command("help", async (ctx) => await this.onHelp(ctx));
    this.bot.command("nav", async (ctx) => await this.onNav(ctx));
    //                new_post
    //                delete_post
    //                add_image
    //                add_file
    //                remove_file
    // tests
    this.bot.command(
      "button_echo",
      async (ctx) => await this.onButtonEcho(ctx),
    );
    // this.bot.command("test_text", async (ctx) => await this.onTest_text(ctx));
    this.bot.command("test_img", async (ctx) => await this.onTest_img(ctx));
    this.bot.command("test_imgs", async (ctx) => await this.onTest_imgs(ctx));
    this.bot.command("test_post", async (ctx) => await this.onTest_post(ctx));
  }

  async onNav(ctx: CommandContext<BotContext>): Promise<void> {
    if (!ctx.chat) return;
    const lang = ctx.session.lang;
    try {
      const dirs = await this.repo.listDirectories(ctx.session.currentDir);
      const buttons = this.dirListToButtons(dirs);

      this.dialog.sendNavigationMenu(lang, dirs, buttons, ctx);
    } catch (err) {
      console.error("get-dirs error:", err);
      this.dialog.sendError(lang, "get directories " + err, ctx);
    }
  }

  private dirListToButtons(dirList: string[]): MenuButton[] {
    let result: MenuButton[] = [{ text: "<-", call: "navDir:.." }];
    dirList.map((dir) => {
      result.push({ text: `navDir:${dir}`, call: `navDir:${dir}` });
    });
    return result;
  }

  // async onGetDirs(ctx: BotContext): Promise<void> {
  //   if (!ctx.chat) return;
  //   const lang = ctx.session.lang;
  //   try {
  //     const dirs = await this.repo.listDirectories();
  //     this.dialog.sendDirList(lang, dirs);
  //
  //   } catch (err) {
  //     console.error("get-dirs error:", err);
  //     this.dialog.sendError(lang, "get directories " + err);
  //
  //   }
  // }

  async onTest_img(ctx: BotContext) {
    if (ctx.chat) {
      const prefix = "posts";
      const uuid = TEMPORARY_POST_UUID;
      const fileName = "image-1.jpg";
      const path = `${prefix}/${uuid}/${fileName}`;

      try {
        const imageBuffer = await this.repo.getImage(path);

        this.dialog.sendImg(imageBuffer, ctx);
      } catch (err) {
        const lang = ctx.session.lang;
        this.dialog.sendError(lang, "get file (image) " + err, ctx);
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

        this.dialog.sendImgs(imageBuffers, ctx);
      } catch (err) {
        const lang = ctx.session.lang;
        this.dialog.sendError(lang, "get files (images): " + err, ctx);
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

        this.dialog.sendImgs(imageBuffers, ctx, textfileContent);
      } catch (err) {
        const lang = ctx.session.lang;
        this.dialog.sendError(lang, "get file (image + text) " + err, ctx);
      }
    }
  }

  // async onTest_text(ctx: BotContext) {
  //   const prefix = "posts";
  //   const uuid = TEMPORARY_POST_UUID;
  //   const fileName = "text.txt";
  //   const path = `${prefix}/${uuid}/${fileName}`;
  //   if (ctx.chat) {
  //     try {
  //       const textfileContent = await this.repo.getText(path);
  //       this.dialog.sendTextFile(textfileContent);
  //
  //     } catch (err) {
  //       const lang = ctx.session.lang;
  //       console.error("get-file error:", err);
  //       this.dialog.sendError(lang, "get file (text) " + err);
  //
  //     }
  //   }
  // }

  async onStart(ctx: BotContext) {
    if (ctx.chat && ctx.session) {
      const lang = ctx.session.lang;
      this.dialog.sendWelcome(lang, ctx.chat.first_name, this.websiteName, ctx);
    } else {
      console.log("no session bitches: ", ctx.session);
    }
  }

  async onLang(ctx: BotContext) {
    ctx.session.lang = ctx.session.lang === "ru" ? "en" : "ru";
    if (ctx.chat) {
      this.dialog.sendLanguageChanged(ctx.session.lang, ctx);
    }
  }

  async onHelp(ctx: BotContext) {
    if (ctx.chat) {
      this.dialog.sendHelp(ctx.session.lang, ctx);
    }
  }

  async onButtonEcho(ctx: BotContext) {
    if (!ctx.chat) return;
    ctx.session.dialogStep = DialogStep.AwaitingButtonEcho;
    await ctx.reply("Отправь любое слово, и я пришлю его в виде кнопки.");
  }
}
