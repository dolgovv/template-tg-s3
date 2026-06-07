import type { botLanguage, BotContext } from "../utils/types.js";

export interface IBotModel {
  // Menus
  mainMenu(ctx: BotContext, shouldReset?: boolean): Promise<void>;
  navMenu(ctx: BotContext): Promise<void>;
  actionsMenu(ctx: BotContext, path: string): Promise<void>;
  deleteAskMenu(ctx: BotContext, path: string): Promise<void>;
  asksMenu(ctx: BotContext, path: string): Promise<void>;

  // Replies
  onHelp(ctx: BotContext): Promise<void>;
  sendError(errorText: string, ctx: BotContext): Promise<void>;
  errorCallback(callback: string, ctx: BotContext): Promise<void>;
  sendDeletionError(
    isFile: boolean,
    path: string,
    ctx: BotContext,
  ): Promise<void>;
  askForDocumentType(ctx: BotContext): Promise<void>;
  askNewName(ctx: BotContext): Promise<void>;
  sendDeletedSuccessfully(
    ctx: BotContext,
    isFile: boolean,
    path: string,
  ): Promise<void>;
  sendAwaitingDocument(ctx: BotContext): Promise<void>;
  sendAwaitingDirectoryName(ctx: BotContext): Promise<void>;

  // Utils
  getBestPhoto(ctx: BotContext): string;
  changeLang(ctx: BotContext, newLang: botLanguage): Promise<void>;
  sessionReset(ctx: BotContext, hard: boolean): void;
  navTo(ctx: BotContext, dir: string): Promise<void>;

  // File management
  addPhoto(
    fileId: string,
    ctx: BotContext,
    name?: string,
  ): Promise<true | undefined>;
  deleteFile(ctx: BotContext, path: string): Promise<boolean>;
  createDirectory(
    currentDir: string,
    name: string | undefined,
  ): Promise<string>;
  removeDirectory(path: string): Promise<unknown>;
  sendImage(ctx: BotContext, path: string): Promise<void>;
  sendAllImages(ctx: BotContext): Promise<void>;
  sendTextFile(ctx: BotContext, path: string): Promise<void>;
  renameDir(oldPath: string, newPath: string): Promise<unknown>;
}
