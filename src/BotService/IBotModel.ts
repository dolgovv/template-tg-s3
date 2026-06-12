import type { BotContext, botLanguage } from "./types.js";

export interface IBotModel {
  // Menus
  mainMenu(ctx: BotContext, shouldReset?: boolean): Promise<void>;
  navMenu(ctx: BotContext): Promise<void>;
  actionsMenu(ctx: BotContext, path: string): Promise<void>;
  deleteAskMenu(ctx: BotContext, path: string): Promise<void>;

  // Replies
  sendError(message: string, ctx: BotContext): Promise<void>;
  errorCallback(callback: string, ctx: BotContext): Promise<void>;
  sendHelp(ctx: BotContext): Promise<void>;
  sendDeletionError(
    isFile: boolean,
    path: string,
    ctx: BotContext,
  ): Promise<void>;
  askForDocumentType(ctx: BotContext): Promise<void>;
  askNewName(path: string, ctx: BotContext): Promise<void>;
  sendDeletedSuccessfully(
    ctx: BotContext,
    isFile: boolean,
    path: string,
  ): Promise<void>;
  sendAwaitingDocument(ctx: BotContext): Promise<void>;
  sendAwaitingDirectoryName(ctx: BotContext): Promise<void>;
  sendInvalidNameError(ctx: BotContext): Promise<void>;
  sendNameAlreadyExistsError(isFile: boolean, ctx: BotContext): Promise<void>;

  // Utils
  getBiggestPhoto(ctx: BotContext): string;
  getFileId(ctx: BotContext): string | undefined;
  changeLang(ctx: BotContext, newLang: botLanguage): Promise<void>;
  sessionReset(ctx: BotContext, hard: boolean): void;
  navigateTo(ctx: BotContext, dir: string): Promise<void>;
  sanitizeName(name: string): string | null;

  // File management
  addFile(fileId: string, ctx: BotContext, name?: string): Promise<boolean>;
  deleteFile(ctx: BotContext, path: string): Promise<boolean>;
  createDirectory(currentDir: string, name: string): Promise<string>;
  removeDirectory(path: string): Promise<unknown>;
  sendImage(ctx: BotContext, path: string): Promise<void>;
  sendAllImagesHere(ctx: BotContext): Promise<void>;
  sendTextFile(ctx: BotContext, path: string): Promise<void>;
  rename(oldPath: string, newName: string, ctx: BotContext): Promise<boolean>;
}
