import { nanoid } from "nanoid";
import { BotRepository } from "../datasource/S3Repository.js";
import type { DialogEngine } from "../dialog/DialogEngine.js";
import { escapeHtml } from "../dialog/html.js";
import {
  BotLogger,
  DialogStep,
  type BotContext,
  type botLanguage,
  type ContentType,
  type NavigationInstance,
} from "../types.js";
import { fetch, ProxyAgent } from "undici";
import type { IBotModel } from "../IBotModel.js";
import { buildPathRefs, pathRef } from "./pathRefs.js";
import { drawTree } from "./tree.js";
import {
  assignAlbumNames,
  type AlbumCollector,
  type AlbumItem,
} from "./albums.js";

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
      await this.dialog.sendError("get directories " + err, ctx);
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

  async sendError(message: string, ctx: BotContext) {
    this.logger.error(message + this.logger.getDetails(ctx));
    await this.dialog.sendError(message, ctx);
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

  getFileId(ctx: BotContext): string | undefined {
    const msg = ctx.message;
    if (!msg) return undefined;

    if (msg.photo?.length) {
      const lastPhoto = msg.photo[msg.photo.length - 1];
      if (lastPhoto) return lastPhoto.file_id;
    }
    if (msg.document) return msg.document.file_id;
    if (msg.video) return msg.video.file_id;
    if (msg.audio) return msg.audio.file_id;
    if (msg.voice) return msg.voice.file_id;
    if (msg.video_note) return msg.video_note.file_id;
    if (msg.sticker) return msg.sticker.file_id;
    if (msg.animation) return msg.animation.file_id;

    return undefined;
  }

  private pathToType(path: string): ContentType {
    const imageExtensions = [".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp"];
    const textExtensions = [".txt", ".pdf", ".doc", ".docx"];

    if (path.endsWith("/")) {
      return { type: "Directory", symbol: "📁" };
    } else if (imageExtensions.some((ext) => path.endsWith(ext))) {
      return { type: "Image", symbol: "🖼️" };
    } else if (textExtensions.some((ext) => path.endsWith(ext))) {
      return { type: "Text", symbol: "📄" };
    } else {
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

  async changeLang(ctx: BotContext, newLang: botLanguage) {
    await ctx.answerCallbackQuery();
    if (newLang !== ctx.session.lang) {
      ctx.session.lang = newLang;
    }
  }

  sessionReset(ctx: BotContext): void {
    ctx.session.dialogStep = DialogStep.Idle;
    ctx.session.lastMenuMessageId = 0;
    ctx.session.chosenPath = "";
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
      await this.sendError("callback nav error: no such location", ctx);
    }
  }

  async sendAwaitingDocument(ctx: BotContext) {
    ctx.session.dialogStep = DialogStep.AwaitingPhoto;
    await this.dialog.sendAwaitingImage(ctx);
  }

  async sendAwaitingDirectoryName(ctx: BotContext) {
    await this.dialog.sendAwaitingDirectoryName(ctx);
  }

  async sendInvalidNameError(ctx: BotContext) {
    await this.dialog.sendInvalidNameError(ctx);
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
    fileId: string,
    ctx: BotContext,
    name?: string,
  ): Promise<boolean> {
    if (name !== undefined && name.trim() !== "" && !this.sanitizeName(name)) {
      await this.sendInvalidNameError(ctx);
      return false;
    }

    const fileName = await this.uploadFile(fileId, ctx, name);
    if (!fileName) return false;

    await this.dialog.sendFileUploadSuccessful(ctx);
    this.sessionReset(ctx);
    await this.navMenu(ctx);
    return true;
  }

  // album items are collected first, the whole album is handled by addAlbum
  addAlbumItem(ctx: BotContext, fileId: string) {
    const msg = ctx.message!;
    this.albums.add(
      msg.chat.id + "_" + msg.media_group_id,
      { messageId: msg.message_id, fileId, caption: msg.caption },
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
        const fileName = await this.uploadFile(item.fileId, ctx, names[i]);
        if (fileName) uploaded.push(fileName);
        else failed.push(names[i] ?? "#" + (i + 1));
      } catch (err) {
        this.logger.error(
          "Album upload error: " + err + this.logger.getDetails(ctx),
        );
        failed.push(names[i] ?? "#" + (i + 1));
      }
    }

    await this.dialog.sendAlbumResult(ctx, { uploaded, failed, extraNames });
    this.sessionReset(ctx);
    await this.navMenu(ctx);
  }

  // downloads a file from telegram and puts it into the current folder,
  // returns the stored file name or null if it was not stored
  private async uploadFile(
    fileId: string,
    ctx: BotContext,
    name?: string,
  ): Promise<string | null> {
    const { buffer, extension } = await this.fetchFileFromTelegram(fileId, ctx);
    const dir = ctx.session.currentDir;

    // no name or an unusable one -> autogenerate
    const finalName =
      (name && this.sanitizeName(name)) ||
      (await this.getRandomName((candidate) =>
        this.repo.isFileExists(dir + candidate + extension),
      ));

    const stored = await this.repo.putFile(buffer, dir, finalName, extension);
    return stored ? finalName + extension : null;
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

  async deleteFile(path: string): Promise<boolean> {
    if (!this.isWithinRoot(path)) return false;
    return await this.repo.deleteFile(path);
  }

  async createDirectory(currentDir: string, name: string): Promise<string> {
    if (!name.trim()) {
      const generated = await this.getRandomName((name) =>
        this.repo.isDirectoryExists(currentDir + name + "/"),
      );
      return await this.repo.createDirectory(currentDir, generated);
    }
    let sanitized = this.sanitizeName(name);
    if (!sanitized) return "";
    // if (!sanitized.endsWith("/")) sanitized = sanitized.concat("/");
    return await this.repo.createDirectory(currentDir, sanitized);
  }

  async removeDirectory(path: string) {
    if (!this.isWithinRoot(path)) return false;
    return await this.repo.removeDirectory(path);
  }

  async sendImage(ctx: BotContext, path: string) {
    const imageName = this.dialog.leafInPath(path);
    const result = await this.repo.getImage(path);

    if (result) {
      await this.dialog.sendImg(result, ctx, imageName);
    } else {
      await this.sendError(
        "Изображения '" + imageName + "' не существует",
        ctx,
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
    const fileContent: string = await this.repo.getTextFileContent(path);
    const reducedPath: string = this.dialog.leafInPath(path);
    await this.dialog.sendTextFile(reducedPath, fileContent, ctx);
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
      const result = await this.repo.renameFile(oldPath, newKey);
      if (!result) await this.renameFailed(oldPath, ctx);
      return result;
    }
  }

  private async renameFailed(path: string, ctx: BotContext) {
    this.logger.error("Rename error: " + path + this.logger.getDetails(ctx));
    await this.dialog.sendRenameError(ctx);
  }

  // ======================================================
}

// "photo.jpg" -> { name: "photo", extension: ".jpg" }, "README" -> no extension,
// ".env" is a name, not an extension
function splitExtension(fileName: string): { name: string; extension: string } {
  const dotIndex = fileName.lastIndexOf(".");
  if (dotIndex <= 0) return { name: fileName, extension: "" };
  return {
    name: fileName.slice(0, dotIndex),
    extension: fileName.slice(dotIndex),
  };
}
