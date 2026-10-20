import { GrammyError, type InlineKeyboard, type InputFile } from "grammy";

// how a file is sent: a document, or with the player of telegram
export type SendAs = "document" | "audio" | "video";
import type { BotContext } from "../types.js";

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

// replaces the message whose button was pressed
export type EditMessage = {
  type: "edit";
  text: string;
  keyboard?: InlineKeyboard;
};

export type PhotoMessage = {
  type: "photo";
  photo: InputFile;
  caption?: string;
  keyboard?: InlineKeyboard;
};

export type FileMessage = {
  type: SendAs;
  file: InputFile;
  caption?: string;
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
  | FileMessage
  | MenuMessage
  | EditMessage;

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
        // the menu lives in one message: edit it, or send a new one if it's gone
        ctx.session.lastMenuMessageId = await this.editOrReply(
          ctx,
          ctx.session.lastMenuMessageId,
          reply,
        );
        break;

      case "edit":
        await this.editOrReply(
          ctx,
          ctx.callbackQuery?.message?.message_id ?? 0,
          reply,
        );
        break;

      case "photo":
        await ctx.replyWithPhoto(reply.photo, {
          parse_mode: this.parse_mode,
          ...(reply.caption && { caption: reply.caption }),
          ...(reply.keyboard && { reply_markup: reply.keyboard }),
        });
        break;

      case "document":
        await ctx.replyWithDocument(reply.file, {
          parse_mode: this.parse_mode,
          ...(reply.caption && { caption: reply.caption }),
        });
        break;

      case "audio":
        await ctx.replyWithAudio(reply.file, {
          parse_mode: this.parse_mode,
          ...(reply.caption && { caption: reply.caption }),
        });
        break;

      case "video":
        await ctx.replyWithVideo(reply.file, {
          parse_mode: this.parse_mode,
          // plays while loading, without waiting for the whole file
          supports_streaming: true,
          ...(reply.caption && { caption: reply.caption }),
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

  // edits the message, or sends a new one if there is none to edit:
  // deleted, too old, etc. returns the id of the message that shows the text
  private async editOrReply(
    ctx: BotContext,
    messageId: number,
    reply: { text: string; keyboard?: InlineKeyboard },
  ): Promise<number> {
    if (messageId > 0) {
      try {
        await ctx.api.editMessageText(ctx.chatId!, messageId, reply.text, {
          parse_mode: this.parse_mode,
          ...(reply.keyboard && { reply_markup: reply.keyboard }),
        });
        return messageId;
      } catch (error) {
        // the message already looks exactly like this
        if (
          error instanceof GrammyError &&
          error.description.includes("message is not modified")
        ) {
          return messageId;
        }
      }
    }
    const sent = await ctx.reply(reply.text, {
      parse_mode: this.parse_mode,
      ...(reply.keyboard && { reply_markup: reply.keyboard }),
    });
    return sent.message_id;
  }
}
