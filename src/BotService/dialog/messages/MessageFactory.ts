import { InlineKeyboard } from "grammy";
import type { MenuButton } from "../../utils/types.js";

export type TextMessage = {
  type: "text";
  text: string;
  keyboard?: InlineKeyboard;
};

export type PhotoMessage = {
  type: "photo";
  photo: string; // url или file_id
  caption?: string;
  keyboard?: InlineKeyboard;
};

export type BotMessage = TextMessage | PhotoMessage;

export class MessageFactory {
  text(text: string, buttons: MenuButton[] = []): TextMessage {
    const keyboard = this.buildKeyboard(buttons);
    const msg: TextMessage = { type: "text", text };
    if (keyboard) msg.keyboard = keyboard;
    return msg;
  }

  // photo(
  //   url: string,
  //   caption?: string,
  //   buttons: MenuButton[] = [],
  // ): PhotoMessage {
  //   const keyboard = buildKeyboard(buttons);
  //   const msg: PhotoMessage = { type: "photo", photo: url };
  //   if (caption) msg.caption = caption;
  //   if (keyboard) msg.keyboard = keyboard;
  //   return msg;
  // }

  private buildKeyboard(buttons: MenuButton[]): InlineKeyboard | undefined {
    if (!buttons || buttons.length === 0) return undefined;
    const keyboard = new InlineKeyboard();
    buttons.forEach((btn) => keyboard.text(btn.text, btn.call));
    return keyboard;
  }
}
