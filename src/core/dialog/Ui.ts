import { GrammyError, InlineKeyboard, InputFile } from "grammy";
import {
  DialogStep,
  type BotContext,
  type Buttons,
  type FileOptions,
  type MediaOptions,
  type MediaSource,
  type Ui,
} from "../types.js";

// telegram accepts strictly 2-10 items in one album
const MAX_ALBUM_SIZE = 10;
const HTML = { parse_mode: "HTML" } as const;

// ctx.ui: one per update, see createBot
export class ContextUi implements Ui {
  constructor(
    private ctx: BotContext,
    // false for an answer nobody handles, see app.onAnswer
    private isAnswer: (id: string) => boolean,
  ) {}

  async text(text: string, buttons: Buttons = []) {
    await this.ctx.reply(text, { ...HTML, ...markup(buttons) });
  }

  async menu(text: string, buttons: Buttons = []) {
    const session = this.ctx.session;
    session.lastMenuMessageId = await this.editOrReply(
      session.lastMenuMessageId,
      text,
      buttons,
    );
  }

  async edit(text: string, buttons: Buttons = []) {
    const messageId = this.ctx.callbackQuery?.message?.message_id ?? 0;
    await this.editOrReply(messageId, text, buttons);
  }

  async ask(text: string, answer: string, buttons: Buttons = []) {
    if (!this.isAnswer(answer)) {
      throw new Error(`No handler for the answer "${answer}": add app.onAnswer()`);
    }
    await this.text(text, buttons);
    // one question at a time: a step of the file manager is dropped
    this.ctx.session.dialogStep = DialogStep.Idle;
    this.ctx.session.awaitingAnswer = answer;
  }

  async photo(photo: MediaSource, options: MediaOptions = {}) {
    await this.ctx.replyWithPhoto(input(photo), {
      ...HTML,
      ...caption(options.caption),
      ...markup(options.buttons),
    });
  }

  async album(photos: MediaSource[], options: { caption?: string | undefined } = {}) {
    for (let i = 0; i < photos.length; i += MAX_ALBUM_SIZE) {
      const chunk = photos.slice(i, i + MAX_ALBUM_SIZE);
      const text = i === 0 ? options.caption : undefined;
      // telegram refuses an album of one
      if (chunk.length === 1) {
        await this.photo(chunk[0]!, { caption: text });
        continue;
      }
      await this.ctx.replyWithMediaGroup(
        chunk.map((photo, index) => ({
          type: "photo" as const,
          media: input(photo),
          ...HTML,
          ...(index === 0 && caption(text)),
        })),
      );
    }
  }

  async document(file: MediaSource, options: FileOptions = {}) {
    await this.ctx.replyWithDocument(input(file, options.name), {
      ...HTML,
      ...caption(options.caption),
      ...markup(options.buttons),
    });
  }

  async audio(file: MediaSource, options: FileOptions = {}) {
    await this.ctx.replyWithAudio(input(file, options.name), {
      ...HTML,
      ...caption(options.caption),
      ...markup(options.buttons),
    });
  }

  async video(file: MediaSource, options: FileOptions = {}) {
    await this.ctx.replyWithVideo(input(file, options.name), {
      ...HTML,
      // plays while loading, without waiting for the whole file
      supports_streaming: true,
      ...caption(options.caption),
      ...markup(options.buttons),
    });
  }

  // edits the message, or sends a new one if there is none to edit:
  // deleted, too old, etc. returns the id of the message that shows the text
  private async editOrReply(
    messageId: number,
    text: string,
    buttons: Buttons,
  ): Promise<number> {
    if (messageId > 0) {
      try {
        await this.ctx.api.editMessageText(this.ctx.chatId!, messageId, text, {
          ...HTML,
          ...markup(buttons),
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
    const sent = await this.ctx.reply(text, { ...HTML, ...markup(buttons) });
    return sent.message_id;
  }
}

// the name is kept: telegram shows it on the document and the player
function input(source: MediaSource, name?: string): InputFile | string {
  return Buffer.isBuffer(source) ? new InputFile(source, name) : source;
}

function caption(text: string | undefined) {
  return text ? { caption: text } : {};
}

// empty rows are skipped, no rows - no keyboard
function markup(buttons: Buttons = []) {
  const rows = buttons.filter((row) => row.length > 0);
  if (rows.length === 0) return {};
  const keyboard = InlineKeyboard.from(
    rows.map((row) =>
      row.map((button) =>
        "url" in button
          ? InlineKeyboard.url(button.text, button.url)
          : InlineKeyboard.text(button.text, button.call),
      ),
    ),
  );
  return { reply_markup: keyboard };
}
