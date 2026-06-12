import { InputFile } from "grammy/types";
import { InlineKeyboard } from "grammy";
import type {
  MediaGroupMessage,
  MenuButton,
  MenuMessage,
  PhotoMessage,
  TextMessage,
} from "../ReplyResolver.js";

export class MessageFactory {
  text(text: string, buttons: MenuButton[] = []): TextMessage {
    const keyboard = this.buildKeyboard(buttons);
    const msg: TextMessage = { type: "text", text: text };
    if (keyboard) msg.keyboard = keyboard;
    return msg;
  }

  menu(text: string, buttons: MenuButton[] = []): MenuMessage {
    const keyboard = this.buildKeyboard(buttons);
    const msg: MenuMessage = { type: "menu", text: text };
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
    buttons.forEach((btn, i) => {
      const fixedText = btn.text.length > 15 ? `${i - 1}` : btn.text;
      keyboard.text(fixedText, btn.call);
      if ((i + 1) % 2 === 0) keyboard.row();
    });
    return keyboard;
  }
}
