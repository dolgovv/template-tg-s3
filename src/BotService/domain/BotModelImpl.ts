import { nanoid } from "nanoid";
import { BotRepository } from "../datasource/S3Repository.js";
import type { DialogEngine } from "../dialog/DialogEngine.js";
import { getEnv } from "../utils/env_auth.js";
import {
  DialogStep,
  type BotContext,
  type botLanguage,
  type ContentType,
  type NavigationInstance,
} from "../utils/types.js";
import { fetch, ProxyAgent } from "undici";
import type { BotLogger } from "../BotService.js";
import type { IBotModel } from "../controller/IBotModel.js";

export class BotModelImpl implements IBotModel {
  constructor(
    private repo: BotRepository,
    private dialog: DialogEngine,
    private logger: BotLogger,
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
      const dirsPaths: string[] = await this.repo.listDirectories(curDir);
      const filesPaths: string[] = await this.repo.listAllFilesHere(curDir);

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
      const contentInstances: NavigationInstance[] = content.map(
        (fullPath, i) => {
          const type = this.pathToType(fullPath);
          const msgText =
            type.type === "Directory"
              ? "<b>" + this.dialog.shrinkPath(fullPath) + "</b>"
              : this.dialog.shrinkPath(fullPath);
          const btnText = this.dialog.shrinkPath(
            fullPath.slice(0, fullPath.indexOf(".")),
          );
          const callback =
            type.type === "Directory"
              ? "dirActions:" + fullPath
              : "fileActions:" + fullPath;
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

      await this.dialog.sendNavigationMenu(
        [...uiInstances, ...contentInstances],
        ctx,
      );
    } catch (err) {
      await this.dialog.sendError("get directories " + err, ctx);
    }
  }

  async actionsMenu(ctx: BotContext, path: string) {
    const isFile = !path.endsWith("/");
    await this.dialog.sendActionsMenu(isFile, path, ctx);
  }

  async deleteAskMenu(ctx: BotContext, path: string) {
    const isFile = !path.endsWith("/");
    console.log("from delete ask menu:", path, isFile);

    await this.dialog.sendAsksMenu(isFile, path, ctx);
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
    await this.dialog.addAskType(ctx);
  }

  async askNewName(ctx: BotContext) {
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

  getBiggestPhoto(ctx: BotContext): string {
    const msg = ctx.message;
    if (!msg) return "";
    const photo = msg.photo;
    if (!photo) return "";
    const bestPhoto = photo[photo.length - 1];
    if (!bestPhoto) return "";
    return bestPhoto?.file_id;
  }

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

    if (lastSlashIndex === -1) {
      ctx.session.currentDir = "";
    } else {
      ctx.session.currentDir = normalizedPath.slice(0, lastSlashIndex + 1);
    }
  }

  async changeLang(ctx: BotContext, newLang: botLanguage) {
    await ctx.answerCallbackQuery();
    if (newLang !== ctx.session.lang) {
      ctx.session.lang = newLang;
    }
  }

  sessionReset(ctx: BotContext, hard: boolean = false): void {
    ctx.session.dialogStep = DialogStep.Idle;
    ctx.session.lastMenuMessageId = 0;
    if (hard) {
      ctx.session.currentDir = "";
      ctx.session.lang = "en";
      ctx.session.chosenPath = "";
    }
  }

  async navigateTo(ctx: BotContext, dir: string) {
    if (dir) {
      if (dir === "..") {
        this.navigateBack(ctx);
      } else {
        ctx.session.currentDir = dir;
      }
    } else {
      await this.dialog.sendError("callback nav error: no such location", ctx);
    }
  }

  async sendAwaitingDocument(ctx: BotContext) {
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
    const proxyUrl: string | undefined = getEnv("PROXY_URL");
    const proxyAgent: ProxyAgent | undefined = proxyUrl
      ? new ProxyAgent(proxyUrl)
      : undefined;

    const file = await ctx.api.getFile(fileId);
    const token = getEnv("BOT_TOKEN", true);

    // file_path looks like "photos/file_123.jpg" — grab the extension from it
    const filePath = file.file_path ?? "";
    const dotIndex = filePath.lastIndexOf(".");
    const extension = dotIndex !== -1 ? filePath.slice(dotIndex) : "";

    const url = `https://api.telegram.org/file/bot${token}/${filePath}`;
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
    const { buffer, extension } = await this.fetchFileFromTelegram(fileId, ctx);

    let finalName: string;
    if (name !== undefined && name.trim() !== "") {
      // user provided a name — validate it
      const sanitized = this.sanitizeName(name);
      if (!sanitized) {
        await this.sendInvalidNameError(ctx);
        return false;
      }
      finalName = sanitized;
    } else {
      // no name or empty string → autogenerate
      finalName = await this.getRandomName(ctx.session.currentDir);
    }

    const result = await this.repo.putImage(
      buffer,
      ctx.session.currentDir,
      finalName,
      extension,
    );

    if (result) {
      await this.dialog.sendFileUploadSuccessful(ctx);
      this.sessionReset(ctx);
      await this.navMenu(ctx);
      return true;
    } else {
      return false;
    }
  }

  async getRandomName(
    prefix: string,
    length: number = 8,
    retries: number = 3,
  ): Promise<string> {
    let name = nanoid(length);
    while ((await this.repo.isFileExists(prefix + name)) && retries--) {
      name = nanoid(length);
    }

    return retries ? name : "";
  }

  async deleteFile(ctx: BotContext, path: string): Promise<boolean> {
    const result = await this.repo.deleteFile(path);
    const resultCode = result.$metadata.httpStatusCode;
    if (resultCode && resultCode - 200 < 100 && resultCode - 200 > 0) {
      await this.navMenu(ctx);
      return true;
    } else {
      await this.sendError("Ошибка удаления файла", ctx);
      await this.sendError(resultCode!.toString(), ctx);
      return false;
    }
  }

  async createDirectory(currentDir: string, name: string): Promise<string> {
    // empty name → autogenerate; non-empty but invalid → return "" to signal error
    if (!name.trim()) {
      const generated = await this.getRandomName(currentDir);
      return await this.repo.createDirectory(currentDir, generated);
    }
    const sanitized = this.sanitizeName(name);
    if (!sanitized) return "";
    return await this.repo.createDirectory(currentDir, sanitized);
  }

  async removeDirectory(path: string) {
    const result = await this.repo.removeDirectory(path);
    return result;
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
      // Build new path: replace last segment name, keep parent prefix and trailing slash
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
      return await this.repo.renameDir(oldPath, newPath);
    } else {
      // File: preserve extension from the original key
      const dotIndex = oldPath.lastIndexOf(".");
      const extension = dotIndex !== -1 ? oldPath.slice(dotIndex) : "";
      const parentPrefix = oldPath.includes("/")
        ? oldPath.slice(0, oldPath.lastIndexOf("/") + 1)
        : "";
      const newKey = parentPrefix + newName + extension;

      const alreadyExists = await this.repo.isFileExists(newKey);
      if (alreadyExists) {
        await this.sendNameAlreadyExistsError(isFile, ctx);
        return false;
      }
      return await this.repo.renameFile(oldPath, newKey);
    }
  }

  // ======================================================
}
