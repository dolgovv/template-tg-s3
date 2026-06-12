import Logger, { FileTransport } from "zario";
import type { Context, SessionFlavor } from "grammy";

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
  lang: botLanguage;
  dialogStep: DialogStep;
  websiteName: string;
  currentDir: string;
  chosenPath: string;
  lastMenuMessageId: number;
};

export type BotContext = Context & SessionFlavor<SessionData>;

export const SUPPORTED_LANGUAGES = ["ru", "en"] as const;
export type botLanguage = (typeof SUPPORTED_LANGUAGES)[number];

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

  getDetails(ctx: BotContext): string {
    const chat = ctx.chat;
    if (!chat) return "";
    const username = chat.username;
    const result =
      "\nID: " + chat.id + username ? "\tLink: t.me/" + username : "";
    return result;
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
