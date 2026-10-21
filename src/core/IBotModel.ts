import type { BotContext, IncomingFile } from "./types.js";
import type { AlbumItem } from "./domain/albums.js";

export interface IBotModel {
  // Menus
  navMenu(ctx: BotContext): Promise<void>;
  actionsMenu(ctx: BotContext, path: string): Promise<void>;
  deleteAskMenu(ctx: BotContext, path: string): Promise<void>;
  menuOutdated(ctx: BotContext): Promise<void>;

  // Replies
  // the message goes to the log, the user gets `text` or a generic error
  sendError(message: string, ctx: BotContext, text?: string): Promise<void>;
  errorCallback(callback: string, ctx: BotContext): Promise<void>;
  askForDocumentType(ctx: BotContext): Promise<void>;
  askNewName(path: string, ctx: BotContext): Promise<void>;
  sendAwaitingDocument(ctx: BotContext): Promise<void>;
  // "Create file": extension -> name -> content
  askTextFileType(ctx: BotContext): Promise<void>;
  askTextFileName(ctx: BotContext, extension: string): Promise<void>;
  askTextFileContent(
    ctx: BotContext,
    name?: string,
    edit?: boolean,
  ): Promise<void>;
  setTextFileName(ctx: BotContext, raw: string): Promise<void>;
  createTextFile(ctx: BotContext, content: string): Promise<void>;

  // Utils
  incomingFile(ctx: BotContext): IncomingFile | undefined;
  sessionReset(ctx: BotContext): void;
  navigateTo(ctx: BotContext, dir: string): Promise<void>;
  isAtRoot(ctx: BotContext): boolean;
  resolvePath(ctx: BotContext, ref: string): string | undefined;
  sanitizeName(name: string): string | null;

  // File management
  addFile(file: IncomingFile, ctx: BotContext, name?: string): Promise<boolean>;
  addAlbumItem(ctx: BotContext, file: IncomingFile): void;
  addAlbum(ctx: BotContext, items: AlbumItem[]): Promise<void>;
  // writes: each one is recorded for the cache reset, see fileManager
  // a file or a folder with everything in it, the user is told how it went
  delete(ctx: BotContext, path: string): Promise<void>;
  createDirectory(
    ctx: BotContext,
    currentDir: string,
    name: string,
  ): Promise<string>;
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
