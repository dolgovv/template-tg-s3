import type {
  textTranslates,
  menusTranslates,
} from "../dialog/messages/strings.js";

export type botLanguage = "ru" | "en";
export type mText = typeof textTranslates.ru;
export type mMenus = typeof menusTranslates.ru;

export type MenuButton = {
  text: string;
  call: string;
};

export type MenuSection = Record<string, MenuButton[]>;

export enum DialogStep {
  Idle = "idle",
  AwaitingDocument = "awaiting_document",
}

export type SessionData = {
  lang: botLanguage;
  dialogStep: DialogStep;
  websiteName: string;
  currentDir: string;
  lastMenuMessageId: number;
};

export type Post = {
  image?: Buffer[];
  text?: string;
};

export type ContentType =
  | { type: "UI"; symbol: "*" }
  | { type: "Directory"; symbol: "📁" }
  | { type: "Image"; symbol: "🖼️" }
  | { type: "Text"; symbol: "📄" }
  | { type: "Unknown"; symbol: "?" };

export type NavigationInstance = {
  type: ContentType;
  msgText: string | undefined;
  btnText: string;
  btnCallback: string;
  fullPath: string;
  index: number;
};
