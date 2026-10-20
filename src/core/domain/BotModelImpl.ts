import { nanoid } from "nanoid";
import { BotRepository } from "../datasource/S3Repository.js";
import type { DialogEngine } from "../dialog/DialogEngine.js";
import type { SendAs } from "../dialog/ReplyResolver.js";
import { escapeHtml } from "../dialog/html.js";
import {
  BotLogger,
  DialogStep,
  type BotContext,
  type IncomingFile,
  type ContentType,
  type NavigationInstance,
} from "../types.js";
import { fetch, ProxyAgent } from "undici";
import type { IBotModel } from "../IBotModel.js";
import { buildPathRefs, pathRef } from "./pathRefs.js";
import { drawTree } from "./tree.js";
import {
  CREATABLE_EXTENSIONS,
  fileType,
  splitExtension,
} from "../fileTypes.js";
import {
  assignAlbumNames,
  type AlbumCollector,
  type AlbumItem,
} from "./albums.js";
import type { ChangeLog } from "../features/cacheInvalidation.js";

// /list_all: how deep the tree goes and how many S3 objects it reads at most
const TREE_DEPTH = 5;
const TREE_MAX_OBJECTS = 10000;

export class BotModelImpl implements IBotModel {
  constructor(
    private repo: BotRepository,
    private dialog: DialogEngine,
    private logger: BotLogger,
    private token: string,
    private proxyUrl: string | undefined,
    // normalized: "" or "some/folder/"
    private root: string,
    private albums: AlbumCollector,
    // every write to the storage is recorded here, see fileManager
    private changes: ChangeLog,
  ) {}

  // MENUS ================================================

  async mainMenu(ctx: BotContext, shouldReset: boolean = true) {
    if (ctx.chat) {
      if (shouldReset) this.sessionReset(ctx);
      await this.dialog.sendMainMenu(ctx);
    }
  }

  async navMenu(ctx: BotContext): Promise<void> {
    if (!ctx.chat) return;
    const curDir = ctx.session.currentDir;
    try {
      const dirsPaths: string[] = (
        await this.repo.listDirectories(curDir)
      ).filter((it) => {
        return it !== curDir;
      });

      const filesPaths: string[] = (
        await this.repo.listAllFilesHere(curDir)
      ).filter((it) => {
        return it !== curDir;
      });

      let uiInstances: NavigationInstance[] = [
        {
          type: { type: "UI", symbol: "*" },
          msgText: undefined,
          btnText: "⬅️",
          btnCallback: "navDir:..",
          fullPath: "",
          index: 0,
        },
        {
          type: { type: "UI", symbol: "*" },
          msgText: undefined,
          btnText: "➕",
          btnCallback: "newAsk",
          fullPath: "",
          index: 0,
        },
      ];

      const content = [...dirsPaths, ...filesPaths];
      ctx.session.pathRefs = buildPathRefs(content);

      const contentInstances: NavigationInstance[] = content.map(
        (fullPath, i) => {
          const type = this.pathToType(fullPath);
          const isDir = type.type === "Directory";
          const shortName = escapeHtml(this.dialog.shrinkPath(fullPath));
          const msgText = isDir ? "<b>" + shortName + "</b>" : shortName;
          // just the name: no parent folders, trailing slash or extension
          const leaf = this.dialog.leafInPath(fullPath).replace(/\/$/, "");
          const btnText = this.dialog.shrinkPath(
            isDir ? leaf : splitExtension(leaf).name,
          );
          const callback =
            type.type === "Directory"
              ? "dirActions:" + pathRef(fullPath)
              : "fileActions:" + pathRef(fullPath);
          return {
            type: type,
            msgText: msgText,
            btnText: btnText,
            btnCallback: callback,
            fullPath: fullPath,
            index: i + 1,
          };
        },
      );
      if (contentInstances.length) {
        await this.dialog.sendNavigationMenu(
          [...uiInstances, ...contentInstances],
          ctx,
        );
      } else {
        await this.dialog.sendNavigationMenu([...uiInstances], ctx);
      }
    } catch (err) {
      await this.sendError("get directories " + err, ctx, ctx.t.errors.listFailed);
    }
  }

  async actionsMenu(ctx: BotContext, path: string) {
    const isFile = !path.endsWith("/");
    await this.dialog.sendActionsMenu(isFile, pathRef(path), ctx);
  }

  async deleteAskMenu(ctx: BotContext, path: string) {
    const isFile = !path.endsWith("/");
    await this.dialog.sendAsksMenu(isFile, pathRef(path), ctx);
  }

  async menuOutdated(ctx: BotContext) {
    await this.dialog.answerMenuOutdated(ctx);
    await this.navMenu(ctx);
  }

  // ======================================================

  // REPLIES ==============================================

  async sendHelp(ctx: BotContext) {
    if (ctx.chat) {
      await this.dialog.sendHelp(ctx);
    }
  }

  async sendError(message: string, ctx: BotContext, text?: string) {
    this.logger.error(message + this.logger.getDetails(ctx));
    await this.dialog.text(ctx, text ?? ctx.t.errors.unexpected);
  }

  async errorCallback(callback: string, ctx: BotContext) {
    this.logger.error(
      "Callback error '" + callback + "'" + this.logger.getDetails(ctx),
    );
  }

  async sendDeletionError(isFile: boolean, path: string, ctx: BotContext) {
    this.logger.error("Deletion error: " + path + this.logger.getDetails(ctx));
    await this.dialog.sendDeletionError(isFile, path, ctx);
  }

  async askForDocumentType(ctx: BotContext) {
    ctx.session.dialogStep = DialogStep.AwaitingAdditionType;
    await this.dialog.addAskType(ctx);
  }

  async askNewName(path: string, ctx: BotContext) {
    ctx.session.chosenPath = path ? path : "";
    ctx.session.dialogStep = DialogStep.AwaitingNewName;
    await this.dialog.askNewName(ctx);
  }

  async sendDeletedSuccessfully(
    ctx: BotContext,
    isFile: boolean,
    path: string,
  ) {
    this.logger.info(
      (isFile ? "File " : "Folder") +
        " was deleted" +
        this.logger.getDetails(ctx),
    );
    await this.dialog.sendDeletedSuccessfully(ctx, isFile, path);
  }

  // ======================================================

  // UTILS ================================================

  incomingFile(ctx: BotContext): IncomingFile | undefined {
    const msg = ctx.message;
    if (!msg) return undefined;

    // the largest size of the photo is the last one
    const photo = msg.photo?.[msg.photo.length - 1];
    // !!! animation before document: a gif comes with both
    const file =
      photo ??
      msg.animation ??
      msg.document ??
      msg.video ??
      msg.audio ??
      msg.voice ??
      msg.video_note ??
      msg.sticker;
    if (!file) return undefined;

    const fileName =
      "file_name" in file && file.file_name ? file.file_name : undefined;
    return { fileId: file.file_id, fileName };
  }

  private pathToType(path: string): ContentType {
    if (path.endsWith("/")) return { type: "Directory", symbol: "📁" };
    switch (fileType(path).icon) {
      case "image":
        return { type: "Image", symbol: "🖼️" };
      case "document":
        return { type: "Document", symbol: "📄" };
      case "audio":
        return { type: "Audio", symbol: "🎵" };
      case "video":
        return { type: "Video", symbol: "🎬" };
      case "other":
        return { type: "Unknown", symbol: "❓" };
    }
  }

  private navigateBack(ctx: BotContext) {
    const path = ctx.session.currentDir;
    const normalizedPath = path.endsWith("/") ? path.slice(0, -1) : path;

    const lastSlashIndex = normalizedPath.lastIndexOf("/");
    const parent =
      lastSlashIndex === -1 ? "" : normalizedPath.slice(0, lastSlashIndex + 1);

    // !!! never go above the root folder
    ctx.session.currentDir = parent.startsWith(this.root) ? parent : this.root;
  }

  isAtRoot(ctx: BotContext): boolean {
    return ctx.session.currentDir === this.root;
  }

  // the root itself is not "within": it can't be deleted or renamed
  private isWithinRoot(path: string): boolean {
    return path.startsWith(this.root) && path !== this.root;
  }

  // a button ref -> the S3 path it was made for, undefined for outdated menus
  resolvePath(ctx: BotContext, ref: string): string | undefined {
    const path = ctx.session.pathRefs?.[ref];
    return path && this.isWithinRoot(path) ? path : undefined;
  }

  async changeLang(ctx: BotContext, newLang: string): Promise<boolean> {
    if (!this.dialog.hasLanguage(newLang)) return false;
    await ctx.answerCallbackQuery();
    ctx.session.lang = newLang;
    return true;
  }

  sessionReset(ctx: BotContext): void {
    ctx.session.dialogStep = DialogStep.Idle;
    ctx.session.lastMenuMessageId = 0;
    ctx.session.chosenPath = "";
    ctx.session.textFile = undefined;
  }

  // dir: "..", "root" or a directory path within the root
  async navigateTo(ctx: BotContext, dir: string) {
    if (dir === "..") {
      this.navigateBack(ctx);
    } else if (dir === "root") {
      ctx.session.currentDir = this.root;
    } else if (dir.endsWith("/") && this.isWithinRoot(dir)) {
      ctx.session.currentDir = dir;
    } else {
      await this.sendError(
        "callback nav error: no such location",
        ctx,
        ctx.t.nav.noSuchFolder,
      );
    }
  }

  async sendAwaitingDocument(ctx: BotContext) {
    ctx.session.dialogStep = DialogStep.AwaitingPhoto;
    await this.dialog.sendAwaitingFile(ctx);
  }

  // "Create file": extension -> name (or skip) -> content from the next message
  async askTextFileType(ctx: BotContext) {
    await this.dialog.askTextFileType(ctx, CREATABLE_EXTENSIONS);
  }

  async askTextFileName(ctx: BotContext, extension: string) {
    if (!CREATABLE_EXTENSIONS.includes(extension)) {
      return await this.errorCallback("createTextFile" + extension, ctx);
    }
    ctx.session.textFile = { extension };
    ctx.session.dialogStep = DialogStep.AwaitingTextFileName;
    await this.dialog.askTextFileName(ctx, extension);
  }

  // undefined name = generated. edit: the prompt replaces the message with the button
  async askTextFileContent(ctx: BotContext, name?: string, edit = false) {
    const textFile = ctx.session.textFile;
    if (!textFile) return await this.menuOutdated(ctx);
    textFile.name = name;
    ctx.session.dialogStep = DialogStep.AwaitingTextFileContent;
    await this.dialog.askTextFileContent(ctx, textFile.extension, edit);
  }

  async setTextFileName(ctx: BotContext, raw: string) {
    const name = this.sanitizeName(raw);
    // the step stays: the user just sends another name
    if (!name) return await this.sendInvalidNameError(ctx);
    await this.askTextFileContent(ctx, name);
  }

  async createTextFile(ctx: BotContext, content: string) {
    const textFile = ctx.session.textFile;
    if (!textFile) return await this.sendError("No text file in session", ctx);

    if (textFile.extension === ".json") {
      try {
        JSON.parse(content);
      } catch (err) {
        // the step stays: the user sends the fixed content
        return await this.dialog.text(
          ctx,
          ctx.t.files.invalidJson({ error: (err as Error).message }),
        );
      }
    }

    const fileName = await this.storeFile(
      ctx,
      Buffer.from(content, "utf-8"),
      textFile.name,
      textFile.extension,
    );
    if (!fileName) {
      return await this.sendError("Text file was not stored", ctx);
    }
    await this.dialog.text(ctx, ctx.t.files.created({ name: fileName }));
    this.sessionReset(ctx);
    await this.navMenu(ctx);
  }

  async sendAwaitingDirectoryName(ctx: BotContext) {
    await this.dialog.text(ctx, ctx.t.files.awaitingFolderName);
  }

  async sendInvalidNameError(ctx: BotContext) {
    await this.dialog.text(ctx, ctx.t.files.invalidName);
  }

  async sendNameAlreadyExistsError(isFile: boolean, ctx: BotContext) {
    await this.dialog.sendNameAlreadyExistsError(isFile, ctx);
  }

  sanitizeName(raw: string): string | null {
    const sanitized = this.dialog.sanitizeFileName(raw.trim());
    if (!sanitized || sanitized.length === 0) return null;
    return sanitized;
  }

  // ======================================================

  // FILE MANAGEMENT ======================================

  async fetchFileFromTelegram(
    fileId: string,
    ctx: BotContext,
  ): Promise<{ buffer: Buffer; extension: string }> {
    const proxyAgent: ProxyAgent | undefined = this.proxyUrl
      ? new ProxyAgent(this.proxyUrl)
      : undefined;

    const file = await ctx.api.getFile(fileId);

    // file_path looks like "photos/file_123.jpg" — grab the extension from it
    const filePath = file.file_path ?? "";
    const dotIndex = filePath.lastIndexOf(".");
    const extension = dotIndex !== -1 ? filePath.slice(dotIndex) : "";

    const url = `https://api.telegram.org/file/bot${this.token}/${filePath}`;
    const loadedFile = proxyAgent
      ? await fetch(url, { dispatcher: proxyAgent })
      : await fetch(url);

    const buffer = Buffer.from(await loadedFile.arrayBuffer());
    return { buffer, extension };
  }

  async addFile(
    file: IncomingFile,
    ctx: BotContext,
    name?: string,
  ): Promise<boolean> {
    if (name !== undefined && name.trim() !== "" && !this.sanitizeName(name)) {
      await this.sendInvalidNameError(ctx);
      return false;
    }

    const fileName = await this.uploadFile(file, ctx, name);
    if (!fileName) return false;

    await this.dialog.text(ctx, ctx.t.files.uploaded({ name: fileName }));
    this.sessionReset(ctx);
    await this.navMenu(ctx);
    return true;
  }

  // album items are collected first, the whole album is handled by addAlbum
  addAlbumItem(ctx: BotContext, file: IncomingFile) {
    const msg = ctx.message!;
    this.albums.add(
      msg.chat.id + "_" + msg.media_group_id,
      { messageId: msg.message_id, ...file, caption: msg.caption },
      ctx.update,
    );
  }

  async addAlbum(ctx: BotContext, items: AlbumItem[]) {
    const ordered = [...items].sort((a, b) => a.messageId - b.messageId);
    const { names, extraNames } = assignAlbumNames(ordered);
    const uploaded: string[] = [];
    const failed: string[] = [];

    for (const [i, item] of ordered.entries()) {
      try {
        const fileName = await this.uploadFile(item, ctx, names[i]);
        if (fileName) uploaded.push(fileName);
        else failed.push(names[i] ?? item.fileName ?? "#" + (i + 1));
      } catch (err) {
        this.logger.error(
          "Album upload error: " + err + this.logger.getDetails(ctx),
        );
        failed.push(names[i] ?? item.fileName ?? "#" + (i + 1));
      }
    }

    await this.dialog.sendAlbumResult(ctx, { uploaded, failed, extraNames });
    this.sessionReset(ctx);
    await this.navMenu(ctx);
  }

  // downloads a file from telegram and puts it into the current folder,
  // returns the stored file name or null if it was not stored.
  // the name: from the caption, else its own name, else a generated one
  // !!! a taken name gets a number: an existing file is never replaced
  private async uploadFile(
    file: IncomingFile,
    ctx: BotContext,
    name?: string,
  ): Promise<string | null> {
    const fetched = await this.fetchFileFromTelegram(file.fileId, ctx);

    // "Report Q3.pdf" -> "Report_Q3" + ".pdf"
    const own = file.fileName ? splitExtension(file.fileName) : undefined;
    const extension = own?.extension || fetched.extension;
    const wanted =
      (name && this.sanitizeName(name)) ||
      (own && this.sanitizeName(own.name)) ||
      undefined;

    return await this.storeFile(ctx, fetched.buffer, wanted, extension);
  }

  // puts a file into the current folder, returns its name or null if not stored:
  // a taken name gets a number, no name -> generated
  private async storeFile(
    ctx: BotContext,
    buffer: Buffer,
    name: string | undefined,
    extension: string,
  ): Promise<string | null> {
    const dir = ctx.session.currentDir;
    const finalName = name
      ? await this.freeName(dir, name, extension)
      : await this.getRandomName((candidate) =>
          this.repo.isFileExists(dir + candidate + extension),
        );

    this.changes.add(ctx, { keys: [dir + finalName + extension] });
    const stored = await this.repo.putFile(buffer, dir, finalName, extension);
    return stored ? finalName + extension : null;
  }

  // "scan" if it is free in the folder, else "scan_2", "scan_3"...
  private async freeName(
    dir: string,
    name: string,
    extension: string,
  ): Promise<string> {
    const taken = (candidate: string) =>
      this.repo.isFileExists(dir + candidate + extension);
    if (!(await taken(name))) return name;
    for (let n = 2; n <= 100; n++) {
      if (!(await taken(`${name}_${n}`))) return `${name}_${n}`;
    }
    return `${name}_${nanoid(8)}`;
  }

  // exists() gets a candidate name and checks the full key it would make
  private async getRandomName(
    exists: (name: string) => Promise<boolean>,
  ): Promise<string> {
    for (let attempt = 0; attempt < 3; attempt++) {
      const name = nanoid(8);
      if (!(await exists(name))) return name;
    }
    throw new Error("Could not generate a free name in 3 attempts");
  }

  async deleteFile(ctx: BotContext, path: string): Promise<boolean> {
    if (!this.isWithinRoot(path)) return false;
    this.changes.add(ctx, { keys: [path] });
    return await this.repo.deleteFile(path);
  }

  async createDirectory(
    ctx: BotContext,
    currentDir: string,
    name: string,
  ): Promise<string> {
    const finalName = name.trim()
      ? this.sanitizeName(name)
      : await this.getRandomName((candidate) =>
          this.repo.isDirectoryExists(currentDir + candidate + "/"),
        );
    if (!finalName) return "";
    this.changes.add(ctx, { prefixes: [currentDir + finalName + "/"] });
    return await this.repo.createDirectory(currentDir, finalName);
  }

  async removeDirectory(ctx: BotContext, path: string) {
    if (!this.isWithinRoot(path)) return false;
    this.changes.add(ctx, { prefixes: [path] });
    return await this.repo.removeDirectory(path);
  }

  // the way to open a file comes from fileTypes.ts, the navigation menu goes after it
  async openFile(ctx: BotContext, path: string) {
    switch (fileType(path).open) {
      case "photo":
        await this.sendImage(ctx, path);
        break;
      case "text":
        await this.sendTextFile(ctx, path);
        break;
      case "audio":
        await this.sendFile(ctx, path, "audio");
        break;
      case "video":
        await this.sendFile(ctx, path, "video");
        break;
      case "file":
        await this.sendFile(ctx, path, "document");
        break;
    }
    await this.navMenu(ctx);
  }

  // with its own name: as a document or with the player of telegram
  async sendFile(ctx: BotContext, path: string, as: SendAs) {
    const name = this.dialog.leafInPath(path);
    const file = await this.repo.getFile(path);

    if (file) {
      await this.dialog.sendFile(ctx, file, name, as);
    } else {
      await this.sendError(
        "File not found: " + path,
        ctx,
        ctx.t.files.notFound({ name }),
      );
    }
  }

  async sendImage(ctx: BotContext, path: string) {
    const imageName = this.dialog.leafInPath(path);
    const result = await this.repo.getFile(path);

    if (result) {
      await this.dialog.sendImg(result, ctx, imageName);
    } else {
      await this.sendError(
        "Image not found: " + path,
        ctx,
        ctx.t.files.notFound({ name: imageName }),
      );
    }
  }

  async sendTree(ctx: BotContext) {
    const base = ctx.session.currentDir;
    const { keys, truncated } = await this.repo.listKeysRecursive(
      base,
      TREE_MAX_OBJECTS,
    );
    const tree = drawTree(base || "/", keys, base, TREE_DEPTH);
    await this.dialog.sendTree(
      tree,
      { depth: TREE_DEPTH, objects: TREE_MAX_OBJECTS, truncated },
      ctx,
    );
  }

  async sendAllImagesHere(ctx: BotContext) {
    const path = ctx.session.currentDir;
    const loadedImages = await this.repo.getImagesInDir(path);
    await this.dialog.sendImgs(loadedImages, ctx);
  }

  async sendTextFile(ctx: BotContext, path: string) {
    await this.showTextFile(ctx, path, 1, false);
  }

  async turnTextFilePage(ctx: BotContext, path: string, page: number) {
    await this.showTextFile(ctx, path, page, true);
  }

  // the file is read again for every page: no cache, nothing in the session
  private async showTextFile(
    ctx: BotContext,
    path: string,
    page: number,
    edit: boolean,
  ) {
    const fileContent: string = await this.repo.getTextFileContent(path);
    await this.dialog.sendTextFile(ctx, {
      name: this.dialog.leafInPath(path),
      text: fileContent,
      ref: pathRef(path),
      page,
      edit,
    });
  }

  async rename(
    oldPath: string,
    newName: string,
    ctx: BotContext,
  ): Promise<boolean> {
    const isFile: boolean = !oldPath.endsWith("/");

    if (!isFile) {
      const withoutTrailing = oldPath.slice(0, -1);
      const parentPrefix = withoutTrailing.includes("/")
        ? withoutTrailing.slice(0, withoutTrailing.lastIndexOf("/") + 1)
        : "";
      const newPath = parentPrefix + newName + "/";

      const alreadyExists = await this.repo.isDirectoryExists(newPath);
      if (alreadyExists) {
        await this.sendNameAlreadyExistsError(isFile, ctx);
        return false;
      }
      this.changes.add(ctx, { prefixes: [oldPath, newPath] });
      const result = await this.repo.renameDir(oldPath, newPath);
      if (!result) await this.renameFailed(oldPath, ctx);
      return result;
    } else {
      const parentPrefix = oldPath.includes("/")
        ? oldPath.slice(0, oldPath.lastIndexOf("/") + 1)
        : "";
      const { extension } = splitExtension(oldPath.slice(parentPrefix.length));
      const newKey = parentPrefix + newName + extension;

      const alreadyExists = await this.repo.isFileExists(newKey);
      if (alreadyExists) {
        await this.sendNameAlreadyExistsError(isFile, ctx);
        return false;
      }
      this.changes.add(ctx, { keys: [oldPath, newKey] });
      const result = await this.repo.renameFile(oldPath, newKey);
      if (!result) await this.renameFailed(oldPath, ctx);
      return result;
    }
  }

  private async renameFailed(path: string, ctx: BotContext) {
    this.logger.error("Rename error: " + path + this.logger.getDetails(ctx));
    await this.dialog.text(ctx, ctx.t.files.renameFailed);
  }

  // ======================================================
}
