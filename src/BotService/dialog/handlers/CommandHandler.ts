import type { Bot, Context } from "grammy";
import type { DialogEngine } from "../DialogEngine.js";

export class CommandHandler {
  constructor(
    private bot: Bot,
    private dialog: DialogEngine,
  ) {
    this.bot.command("start", (ctx) => {
      this.onStart(ctx);
    });
  }
  onStart(ctx: Context) {
    if (ctx.chat) {
      ctx.reply(
        this.dialog
          .mText()
          .greetUser(ctx.chat.first_name || this.dialog.mText().anonName),
      );
    }
  }
}
