import type { Context } from "grammy";
import type { BotMessage } from "./messages/MessageFactory.js";

export class ReplyResolver {
  async reply(ctx: Context, reply: BotMessage) {
    switch (reply.type) {
      case "text":
        if (reply.keyboard) {
          await ctx.reply(reply.text, { reply_markup: reply.keyboard });
        } else {
          await ctx.reply(reply.text);
        }
        break;

      // case "photo":
      //   if (reply.keyboard) {
      //     ctx.reply(reply.text, { reply_markup: reply.keyboard });
      //   } else {
      //     ctx.reply(reply.text);
      //   }
      //   break;

      default:
        break;
    }
  }
}
