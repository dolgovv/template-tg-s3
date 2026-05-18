import type { Bot } from "grammy";
import type { BotContext } from "../../BotService.js";
import type { BotModel } from "../../domain/BotModel.js";

export class CommandHandler {
  constructor(
    private bot: Bot<BotContext>,
    private model: BotModel,
  ) {
    this.bot.command("start", async (ctx) => await model.onStart(ctx));
    this.bot.command("help", async (ctx) => await model.onHelp(ctx));
    this.bot.command("nav", async (ctx) => await model.navMenu(ctx));
    // //                new_post
    // //                delete_post
    // //                add_image
    // //                add_file
    // //                remove_file
    // // tests
    // this.bot.command(
    //   "button_echo",
    //   async (ctx) => await this.onButtonEcho(ctx),
    // );
    // // this.bot.command("test_text", async (ctx) => await this.onTest_text(ctx));
    // this.bot.command("test_img", async (ctx) => await this.onTest_img(ctx));
    // this.bot.command("test_imgs", async (ctx) => await this.onTest_imgs(ctx));
    // this.bot.command("test_post", async (ctx) => await this.onTest_post(ctx));
  }
}
