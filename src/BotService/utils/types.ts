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
