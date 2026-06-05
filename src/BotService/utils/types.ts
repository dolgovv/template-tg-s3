import type { Context, SessionFlavor } from "grammy";

export enum DialogStep {
  Idle = "idle",
  AwaitingPhoto = "AwaitingDocument",
  AwaitingMultiplePhotos = "AwaitingMultiplePhotos",
  AwaitingAdditionType = "AwaitingDocumentType",
  AwaitingDirectoryName = "AwaitingDirectoryName",
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
  | { type: "Unknown"; symbol: "?" };

export type SessionData = {
  lang: botLanguage;
  dialogStep: DialogStep;
  websiteName: string;
  currentDir: string;
  lastMenuMessageId: number;
};
export type BotContext = Context & SessionFlavor<SessionData>;

export type botLanguage = "ru" | "en";
