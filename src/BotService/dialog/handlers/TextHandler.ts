import type { Bot } from "grammy";
import type { BotContext } from "../../BotService.js";
import type { DialogEngine } from "../DialogEngine.js";
import type { ReplyResolver } from "../ReplyResolver.js";
import { DialogState } from "../../utils/types.js";

export class TextHandler {
  constructor(
    private bot: Bot<BotContext>,
    private dialog: DialogEngine,
    private resolver: ReplyResolver,
  ) {
    this.bot.on("message:text", (ctx) => this.onText(ctx));
  }

  async onText(ctx: BotContext) {
    const text = ctx.message?.text;
    if (!text) return;

    switch (ctx.session.dialogState) {
      case DialogState.AwaitingButtonEcho:
        await this.handleButtonEcho(ctx, text);
        break;

      case DialogState.Idle:
      default:
        break;
    }
  }

  private async handleButtonEcho(ctx: BotContext, text: string) {
    ctx.session.dialogState = DialogState.Idle;
    const reply = this.dialog.buildButtonEchoReply(ctx.session.lang, text);
    await this.resolver.reply(ctx, reply);
  }
}
