import { InlineKeyboard, InputFile } from "grammy";
import type { MenuButton } from "../../utils/types.js";

export type TextMessage = {
  type: "text";
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

export type BotMessage = TextMessage | PhotoMessage | MediaGroupMessage;

export class MessageFactory {
  text(text: string, buttons: MenuButton[] = []): TextMessage {
    const keyboard = this.buildKeyboard(buttons);
    const msg: TextMessage = { type: "text", text };
    if (keyboard) msg.keyboard = keyboard;
    return msg;
  }

  photo(
    buffer: Buffer,
    caption?: string,
    buttons: MenuButton[] = [],
  ): PhotoMessage {
    const keyboard = this.buildKeyboard(buttons);
    const msg: PhotoMessage = { type: "photo", photo: new InputFile(buffer) };
    if (caption) msg.caption = caption;
    if (keyboard) msg.keyboard = keyboard;
    return msg;
  }

  mediaGroup(buffers: Buffer[], caption?: string): MediaGroupMessage {
    const msg: MediaGroupMessage = {
      type: "mediaGroup",
      photos: buffers.map((buffer) => new InputFile(buffer)),
    };
    if (caption) msg.caption = caption;
    return msg;
  }

  private buildKeyboard(buttons: MenuButton[]): InlineKeyboard | undefined {
    if (!buttons || buttons.length === 0) return undefined;
    const keyboard = new InlineKeyboard();
    buttons.forEach((btn) => keyboard.text(btn.text, btn.call));
    return keyboard;
  }
}
