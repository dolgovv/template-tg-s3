import { GrammyError, type InlineKeyboard, type InputFile } from "grammy";
import type { BotContext } from "../types.js";

export type MenuSection = Record<string, MenuButton[]>;

export type MenuButton = {
  text: string;
  call: string;
};

export type TextMessage = {
  type: "text";
  text: string;
  keyboard?: InlineKeyboard;
};

export type MenuMessage = {
  type: "menu";
  text: string;
  keyboard?: InlineKeyboard;
};

export type PhotoMessage = {
  type: "photo";
  photo: InputFile;
  caption?: string;
  keyboard?: InlineKeyboard;
};

export type MediaGroupMessage = {
  type: "mediaGroup";
  photos: InputFile[];
  caption?: string;
};

export type BotMessage =
  | TextMessage
  | PhotoMessage
  | MediaGroupMessage
  | MenuMessage;

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

      case "menu": {
        // the menu lives in one message: edit it, or send a new one if it's gone
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
            break;
          } catch (error) {
            // the menu already looks exactly like this
            if (
              error instanceof GrammyError &&
              error.description.includes("message is not modified")
            ) {
              break;
            }
            // deleted, too old to edit, etc: fall through and send a new one
          }
        }
        const menuSent = await ctx.reply(reply.text, {
          parse_mode: this.parse_mode,
          ...(reply.keyboard && { reply_markup: reply.keyboard }),
        });
        ctx.session.lastMenuMessageId = menuSent.message_id;
        break;
      }

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
