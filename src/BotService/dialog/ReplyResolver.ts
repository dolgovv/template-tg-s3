import type { BotContext } from "../BotService.js";
import type { BotMessage } from "./messages/MessageFactory.js";

export class ReplyResolver {
  async reply(ctx: BotContext, reply: BotMessage) {
    switch (reply.type) {
      case "text":
        await ctx.reply(
          reply.text,
          reply.keyboard ? { reply_markup: reply.keyboard } : undefined,
        );
        break;

        // case "photo":
        //   await ctx.replyWithPhoto(reply.photo, {
        //     caption: reply.caption,
        //     reply_markup: reply.keyboard,
        //   });
        break;
    }
  }
}
