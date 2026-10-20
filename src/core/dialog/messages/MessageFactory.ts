import { InputFile } from "grammy/types";
import { InlineKeyboard } from "grammy";
import type {
  DocumentMessage,
  EditMessage,
  MediaGroupMessage,
  MenuButton,
  MenuMessage,
  PhotoMessage,
  TextMessage,
} from "../ReplyResolver.js";

export class MessageFactory {
  text(text: string, rows: MenuButton[][] = []): TextMessage {
    const keyboard = this.buildKeyboard(rows);
    const msg: TextMessage = { type: "text", text: text };
    if (keyboard) msg.keyboard = keyboard;
    return msg;
  }

  menu(text: string, rows: MenuButton[][] = []): MenuMessage {
    const keyboard = this.buildKeyboard(rows);
    const msg: MenuMessage = { type: "menu", text: text };
    if (keyboard) msg.keyboard = keyboard;
    return msg;
  }

  edit(text: string, rows: MenuButton[][] = []): EditMessage {
    const keyboard = this.buildKeyboard(rows);
    const msg: EditMessage = { type: "edit", text: text };
    if (keyboard) msg.keyboard = keyboard;
    return msg;
  }

  photo(
    buffer: Buffer,
    caption?: string,
    rows: MenuButton[][] = [],
  ): PhotoMessage {
    const keyboard = this.buildKeyboard(rows);
    const msg: PhotoMessage = { type: "photo", photo: new InputFile(buffer) };
    if (caption) msg.caption = caption;
    if (keyboard) msg.keyboard = keyboard;
    return msg;
  }

  document(buffer: Buffer, fileName: string, caption?: string): DocumentMessage {
    const msg: DocumentMessage = {
      type: "document",
      document: new InputFile(buffer, fileName),
    };
    if (caption) msg.caption = caption;
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

  // one array is one row of buttons
  private buildKeyboard(rows: MenuButton[][]): InlineKeyboard | undefined {
    const filled = rows.filter((row) => row.length > 0);
    if (filled.length === 0) return undefined;
    return InlineKeyboard.from(
      filled.map((row) =>
        row.map((btn) => InlineKeyboard.text(btn.text, btn.call)),
      ),
    );
  }
}
