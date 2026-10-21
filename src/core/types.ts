import Logger, { FileTransport } from "zario";
import type { Context, InputFile, SessionFlavor } from "grammy";
import type { Texts } from "./texts/schema.js";

export enum DialogStep {
  Idle = "idle",
  AwaitingPhoto = "AwaitingDocument",
  AwaitingMultiplePhotos = "AwaitingMultiplePhotos",
  AwaitingAdditionType = "AwaitingDocumentType",
  AwaitingDirectoryName = "AwaitingDirectoryName",
  AwaitingNewName = "AwaitingNewName",
  AwaitingTextFileName = "AwaitingTextFileName",
  AwaitingTextFileContent = "AwaitingTextFileContent",
}

// a file sent to the bot. fileName is its own name if telegram has one:
// documents and music almost always, videos and gifs sometimes,
// photos, voice messages, round videos and stickers never
export type IncomingFile = {
  fileId: string;
  fileName: string | undefined;
};

export type NavigationInstance = {
  type: ContentType;
  msgText: string | undefined;
  btnText: string;
  btnCallback: string;
  fullPath: string;
  index: number;
};

export type ContentType =
  | { type: "UI"; symbol: "*" }
  | { type: "Directory"; symbol: "📁" }
  | { type: "Image"; symbol: "🖼️" }
  | { type: "Document"; symbol: "📄" }
  | { type: "Audio"; symbol: "🎵" }
  | { type: "Video"; symbol: "🎬" }
  | { type: "Unknown"; symbol: "❓" };

export type SessionData = {
  // a language code from the texts, see Locales
  lang: string;
  dialogStep: DialogStep;
  currentDir: string;
  chosenPath: string;
  // the file being created with "Create file": name undefined = generated
  textFile?: { extension: string; name?: string | undefined } | undefined;
  lastMenuMessageId: number;
  // short button refs -> full S3 paths of the current menu (see pathRefs.ts)
  pathRefs: Record<string, string>;
  // the id of the question of ctx.ui.ask: the next text goes to its handler
  awaitingAnswer?: string | undefined;
};

/** a button under a message: `call` comes to bot.callbackQuery(), `url` opens a link */
export type Button = { text: string; call: string } | { text: string; url: string };
/** one array is one row of buttons */
export type Buttons = Button[][];

/** a photo or a file: its content, an InputFile of grammY, a file_id or a URL */
export type MediaSource = Buffer | InputFile | string;

export interface MediaOptions {
  /** HTML, just like the texts */
  caption?: string | undefined;
  buttons?: Buttons | undefined;
}

export interface FileOptions extends MediaOptions {
  /** the name telegram shows, for a Buffer */
  name?: string | undefined;
}

/**
 * replies to the user. every text is HTML: take it from ctx.t,
 * where the {parameters} are escaped, see docs/adding-commands.md
 */
export interface Ui {
  /** a new message */
  text(text: string, buttons?: Buttons): Promise<void>;
  /** the menu message: edited in place, a new one if it's gone */
  menu(text: string, buttons?: Buttons): Promise<void>;
  /** replaces the message whose button was pressed */
  edit(text: string, buttons?: Buttons): Promise<void>;
  /** a question: the next text of the user goes to app.onAnswer(answer, ...).
   * a command or a button press drops it */
  ask(text: string, answer: string, buttons?: Buttons): Promise<void>;
  photo(photo: MediaSource, options?: MediaOptions): Promise<void>;
  /** photos in albums of 10, the caption goes under the first one. nothing for [] */
  album(photos: MediaSource[], options?: { caption?: string | undefined }): Promise<void>;
  document(file: MediaSource, options?: FileOptions): Promise<void>;
  /** with the player of telegram */
  audio(file: MediaSource, options?: FileOptions): Promise<void>;
  video(file: MediaSource, options?: FileOptions): Promise<void>;
}

// context flavors of grammY: each one describes what its middleware puts on ctx,
// BotContext is all of them together. installed in createBot, strictly before any handler

/** ctx.t: texts in the user's language, see src/core/texts */
export interface TextsFlavor {
  readonly t: Texts;
}

/** ctx.ui: replies to the user, see Ui */
export interface UiFlavor {
  readonly ui: Ui;
}

export type BotContext = Context &
  SessionFlavor<SessionData> &
  TextsFlavor &
  UiFlavor;

export class BotLogger {
  infoLogger: Logger;
  errorLogger: Logger;

  constructor(private logPath: string) {
    this.infoLogger = new Logger({
      level: "info",
      transports: [new FileTransport({ path: this.logPath + "/info.log" })],
    });

    this.errorLogger = new Logger({
      level: "error",
      transports: [new FileTransport({ path: this.logPath + "/error.log" })],
    });
  }

  // who made the request: the user, not the chat (they differ in groups)
  getDetails(ctx: Context): string {
    const user = ctx.from;
    if (!user) return "";
    const link = user.username ? "\tLink: t.me/" + user.username : "";
    return "\nID: " + user.id + link;
  }

  info(message: string) {
    this.infoLogger.info(message);
  }

  error(message: string) {
    this.errorLogger.error(message);
  }

  warn(message: string) {
    this.infoLogger.warn(message);
  }
}
