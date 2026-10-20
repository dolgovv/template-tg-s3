import type { BotContext } from "./types.js";
import type { AlbumItem } from "./domain/albums.js";

export interface IBotModel {
  // Menus
  mainMenu(ctx: BotContext, shouldReset?: boolean): Promise<void>;
  navMenu(ctx: BotContext): Promise<void>;
  actionsMenu(ctx: BotContext, path: string): Promise<void>;
  deleteAskMenu(ctx: BotContext, path: string): Promise<void>;
  menuOutdated(ctx: BotContext): Promise<void>;

  // Replies
  // the message goes to the log, the user gets `text` or a generic error
  sendError(message: string, ctx: BotContext, text?: string): Promise<void>;
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
  getFileId(ctx: BotContext): string | undefined;
  // false if there are no texts for this language
  changeLang(ctx: BotContext, newLang: string): Promise<boolean>;
  sessionReset(ctx: BotContext): void;
  navigateTo(ctx: BotContext, dir: string): Promise<void>;
  isAtRoot(ctx: BotContext): boolean;
  resolvePath(ctx: BotContext, ref: string): string | undefined;
  sanitizeName(name: string): string | null;

  // File management
  addFile(fileId: string, ctx: BotContext, name?: string): Promise<boolean>;
  addAlbumItem(ctx: BotContext, fileId: string): void;
  addAlbum(ctx: BotContext, items: AlbumItem[]): Promise<void>;
  deleteFile(path: string): Promise<boolean>;
  createDirectory(currentDir: string, name: string): Promise<string>;
  removeDirectory(path: string): Promise<unknown>;
  // as a photo, page by page or as a document: see fileTypes.ts
  openFile(ctx: BotContext, path: string): Promise<void>;
  sendImage(ctx: BotContext, path: string): Promise<void>;
  sendAllImagesHere(ctx: BotContext): Promise<void>;
  sendTree(ctx: BotContext): Promise<void>;
  sendTextFile(ctx: BotContext, path: string): Promise<void>;
  // edits the message with the file to show another page
  turnTextFilePage(ctx: BotContext, path: string, page: number): Promise<void>;
  rename(oldPath: string, newName: string, ctx: BotContext): Promise<boolean>;
}
