import type { CommandMiddleware, Composer } from "grammy";
import type { BotContext } from "../../types.js";
import type { IBotModel } from "../../IBotModel.js";
import type { CommandDescription, Commands } from "../commands.js";

// /start and /help belong to the core, see createBot
export class CommandHandler {
  constructor(
    private composer: Composer<BotContext>,
    model: IBotModel,
    commands: Commands,
  ) {
    // in /help and the hints of telegram in this order
    const command = (
      name: string,
      description: CommandDescription,
      handler: CommandMiddleware<BotContext>,
    ) => {
      commands.add(name, description);
      this.composer.command(name, handler);
    };

    command("nav", (t) => t.commands.nav, async (ctx) => {
      ctx.session.lastMenuMessageId = 0;
      await model.navMenu(ctx);
    });
    command(
      "all_imgs_here",
      (t) => t.commands.all_imgs_here,
      async (ctx) => await model.sendAllImagesHere(ctx),
    );
    command(
      "list_all",
      (t) => t.commands.list_all,
      async (ctx) => await model.sendTree(ctx),
    );
  }
}
