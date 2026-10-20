import Logger, { FileTransport } from "zario";
import type { Context, SessionFlavor } from "grammy";
import type { Texts } from "./texts/schema.js";

export enum DialogStep {
  Idle = "idle",
  AwaitingPhoto = "AwaitingDocument",
  AwaitingMultiplePhotos = "AwaitingMultiplePhotos",
  AwaitingAdditionType = "AwaitingDocumentType",
  AwaitingDirectoryName = "AwaitingDirectoryName",
  AwaitingNewName = "AwaitingNewName",
}

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
  | { type: "Text"; symbol: "📄" }
  | { type: "Unknown"; symbol: "❓" };

export type SessionData = {
  // a language code from the texts, see Locales
  lang: string;
  dialogStep: DialogStep;
  currentDir: string;
  chosenPath: string;
  lastMenuMessageId: number;
  // short button refs -> full S3 paths of the current menu (see pathRefs.ts)
  pathRefs: Record<string, string>;
};

export type BotContext = Context &
  SessionFlavor<SessionData> & {
    /** texts in the user's language, see src/core/texts */
    readonly t: Texts;
  };

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
