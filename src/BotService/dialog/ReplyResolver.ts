import type { BotContext } from "../utils/types.js";
import type { BotMessage } from "./messages/MessageFactory.js";

export class ReplyResolver {
  constructor(private parse_mode: "HTML" | "MarkdownV2") {}

  async reply(ctx: BotContext, reply: BotMessage) {
    switch (reply.type) {
      case "text":
        await ctx.reply(reply.text, {
          parse_mode: this.parse_mode,
          ...(reply.keyboard && { reply_markup: reply.keyboard }),
        });
        break;

      case "menu":
        if (ctx.session.lastMenuMessageId > 0) {
          try {
            await ctx.api.editMessageText(
              ctx.chatId!,
              ctx.session.lastMenuMessageId,
              reply.text,
              {
                parse_mode: this.parse_mode,
                ...(reply.keyboard
                  ? { reply_markup: reply.keyboard }
                  : undefined),
              },
            );
          } catch (error) {
            ctx.session.lastMenuMessageId = 0;
          }
          // }
        } else {
          const menuSent = await ctx.reply(reply.text, {
            parse_mode: this.parse_mode,
            ...(reply.keyboard && { reply_markup: reply.keyboard }),
          });
          ctx.session.lastMenuMessageId = menuSent.message_id;
        }
        break;

      case "photo":
        await ctx.replyWithPhoto(reply.photo, {
          parse_mode: this.parse_mode,
          ...(reply.caption && { caption: reply.caption }),
          ...(reply.keyboard && { reply_markup: reply.keyboard }),
        });
        break;

      case "mediaGroup":
        const media = reply.photos.map((photo, index) => ({
          type: "photo" as const,
          media: photo,
          other: {
            parse_mode: this.parse_mode,
            ...(index === 0 && reply.caption && { caption: reply.caption }),
          },
        }));
        await ctx.replyWithMediaGroup(media);
        break;
    }
  }
}
