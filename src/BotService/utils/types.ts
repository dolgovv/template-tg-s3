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

export enum DialogState {
  Idle = "idle",
  AwaitingButtonEcho = "awaiting_button_echo",
}

export type SessionData = {
  lang: botLanguage;
  dialogState: DialogState;
  currentDir: string;
};

export type Post = {
  image?: Buffer<ArrayBufferLike>;
  text?: string;
};
