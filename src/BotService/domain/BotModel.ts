import { nanoid } from "nanoid";
import type { BotContext } from "../BotService.js";
import { BotRepository } from "../datasource/S3Repository.js";
import type { DialogEngine } from "../dialog/DialogEngine.js";
import { getEnv } from "../utils/env_auth.js";
import {
  DialogStep,
  type botLanguage,
  type ContentType,
  type NavigationInstance,
} from "../utils/types.js";
import { fetch, ProxyAgent } from "undici";

export class BotModel {
  private pendingAlbums = new Map<string, { filesIds: string[] }>();
  constructor(
    private repo: BotRepository,
    private dialog: DialogEngine,
  ) {}

  // MENUS ================================================

  async mainMenu(ctx: BotContext) {
    if (ctx.chat && ctx.session) {
      this.softResetSession(ctx);
      this.dialog.sendMainMenu(
        ctx.chat.first_name,
        ctx.session.websiteName,
        ctx,
      );
    } else {
      console.log("no session bitches: ", ctx.session);
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
          btnCallback: "addNew",
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
      console.error("get-dirs error:", err);
      this.dialog.sendError("get directories " + err, ctx);
    }
  }

  async actionsMenu(ctx: BotContext, path: string) {
    const isFile = path[path.length - 1] !== "/";
    this.dialog.sendActionsMenu(ctx, isFile, path);
  }

  // ======================================================

  // REPLIES ==============================================

  async onHelp(ctx: BotContext) {
    if (ctx.chat) {
      this.dialog.sendHelp(ctx);
    }
  }

  async sendError(errorText: string, ctx: BotContext) {
    await this.dialog.sendError(errorText, ctx);
  }

  async askForDocumentType(ctx: BotContext) {
    await this.dialog.addAskType(ctx);
  }

  // ======================================================

  // UTILS ================================================

  private pathToType(path: string): ContentType {
    const imageExtensions = [".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp"];

    if (path.endsWith("/")) {
      return { type: "Directory", symbol: "📁" };
    } else if (imageExtensions.some((ext) => path.endsWith(ext))) {
      return { type: "Image", symbol: "🖼️" };
    } else if (path.endsWith(".txt")) {
      return { type: "Text", symbol: "📄" };
    } else {
      return { type: "Unknown", symbol: "?" };
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

  softResetSession(ctx: BotContext) {
    ctx.session.dialogStep = DialogStep.Idle;
    ctx.session.lastMenuMessageId = 0;
  }

  hardResetSession(ctx: BotContext) {
    ctx.session.dialogStep = DialogStep.Idle;
    ctx.session.currentDir = "";
    ctx.session.lang = "en";
    ctx.session.lastMenuMessageId = 0;
  }

  async navTo(ctx: BotContext, dir: string) {
    await ctx.answerCallbackQuery();
    if (dir) {
      if (dir === "..") {
        this.navigateBack(ctx);
      } else {
        ctx.session.currentDir = dir;
      }
    } else {
      console.error("callback nav error: no such location");
      this.dialog.sendError("callback nav error: no such location", ctx);
    }
  }

  async sendAwaitingDocument(ctx: BotContext) {
    await this.dialog.sendAwaitingImage(ctx);
  }

  async sendAwaitingDirectoryName(ctx: BotContext) {
    await this.dialog.sendAwaitingDirectoryName(ctx);
  }

  // ======================================================

  // FILE MANAGEMENT ======================================
  async sendAwaitingMultiplePhotos(ctx: BotContext) {
    await this.dialog.sendAwaitingMultiplePhotos(ctx);
  }

  async fetchPhotoFromTelegram(photoId: string, ctx: BotContext) {
    const proxyUrl: string | undefined = getEnv("PROXY_URL");
    const proxyAgent: ProxyAgent | undefined = proxyUrl
      ? new ProxyAgent(proxyUrl)
      : undefined;

    const file = await ctx.api.getFile(photoId);
    const token = getEnv("BOT_TOKEN", true);

    const url = `https://api.telegram.org/file/bot${token}/${file.file_path}`;
    const loadedFile = proxyAgent
      ? await fetch(url, { dispatcher: proxyAgent })
      : await fetch(url);

    const buffer = Buffer.from(await loadedFile.arrayBuffer());
    return buffer;
  }

  async addPhoto(ctx: BotContext): Promise<boolean> {
    if (!ctx.message) {
      this.dialog.sendError("Unknown error", ctx);
    } else if (!ctx.message.photo) {
      this.dialog.sendError("No file provided", ctx);
    } else if (!ctx.message.photo[ctx.message.photo.length - 1]) {
      this.dialog.sendError("Error reading file", ctx);
    } else if (!ctx.message.caption) {
      this.dialog.sendNoFileNameProvidedError(ctx);
    } else {
      const photoId = ctx.message.photo[ctx.message.photo.length - 1]!.file_id;
      const fileName: string = this.dialog.sanitizeFileName(
        ctx.message.caption,
      );
      const buffer = await this.fetchPhotoFromTelegram(photoId, ctx);
      const extension = ".jpg"; // ИСПРАВИТЬ
      const result = await this.repo.putImage(
        buffer,
        ctx.session.currentDir,
        fileName,
        extension,
      );

      if (result) {
        this.dialog.sendImageUploadSuccessful(ctx);
        this.softResetSession(ctx);
        this.navMenu(ctx);
        return true;
      }
    }
    return false;
  }

  albumTimers = new Map<string, NodeJS.Timeout>();

  async albumCollector(ctx: BotContext) {
    const msg = ctx.message;
    if (!msg) return;
    if (!msg.photo) return;

    const groupId = msg.media_group_id;
    if (!groupId) return;

    const key = msg.chat.id + "_" + groupId;
    if (this.albumTimers.has(key)) {
      clearTimeout(this.albumTimers.get(key)!);
      this.albumTimers.delete(key);
    }

    const pending: Map<string, { filesIds: string[] }> = this.pendingAlbums;
    console.log("pending:::", pending);

    if (!pending.has(key)) {
      pending.set(key, { filesIds: [] });
    }

    const album = pending.get(key)!;

    const bestPhoto = msg.photo[msg.photo.length - 1]!;
    const fileId = bestPhoto.file_id;

    album.filesIds.push(fileId);

    const timer = setTimeout(async () => {
      console.log(`Альбом ${key} собран: ${album.filesIds.length} фото`);
      console.log("album.filesIds: ", album.filesIds);

      this.handleAlbum(album.filesIds, ctx);
      pending.delete(key);
      this.albumTimers.delete(key);
    }, 1500);

    this.albumTimers.set(key, timer);
  }

  async handleAlbum(filesIds: string[], ctx: BotContext) {
    console.log(`Обработка альбома из ${filesIds.length} фото`);

    for (const fileId of filesIds) {
      console.log("fileId = ", fileId);
      await this.handlePhoto(fileId, ctx);
    }
  }

  async handlePhoto(fileId: string, ctx: BotContext) {
    const buffer = await this.fetchPhotoFromTelegram(fileId, ctx);
    const extension = ".jpg"; // ИСПРАВИТЬ
    const result = await this.repo.putImage(
      buffer,
      ctx.session.currentDir,
      await this.getRandomName(ctx.session.currentDir),
      extension,
    );

    if (result) {
      this.dialog.sendImageUploadSuccessful(ctx);
      this.softResetSession(ctx);
      this.navMenu(ctx);
      return true;
    }
  }

  async addMultiplePhotos(ctx: BotContext) {
    if (!ctx.message) {
      this.dialog.sendError("Unknown error", ctx);
    } else if (!ctx.message.caption) {
      this.dialog.sendNoFileNameProvidedError(ctx);
    } else if (!ctx.message.photo) {
      this.dialog.sendError("No files provided", ctx);
    } else {
      const album = new Map<string, [{ chatId: string; fileId: string }]>();
      const groupId = ctx.message.media_group_id;

      // if (groupId) {
      //   if (!album.has(groupId)) {
      //     album.set(groupId, [{}]);
      //   }
      // }

      const photos = ctx.message.photo;
      const fileNames: string[] = ctx.message.caption
        .split(" ")
        .map((it) => this.dialog.sanitizeFileName(it));

      for (let i = photos.length - fileNames.length; i > 0; i--) {
        const genName = await this.getRandomName(ctx.session.currentDir, 8);
        console.log("genName = ", genName);
        console.log("photos.length = ", photos.length);
        console.log("fileNames.length = ", fileNames.length);
        fileNames.push(genName);
      }

      const imageBuffers: Buffer[] = [];

      for (let i = 0; i < photos.length; i++) {
        if (i % 2 === 1) {
          const photoId = photos[i]!.file_id;
          const buffer = await this.fetchPhotoFromTelegram(photoId, ctx);
          imageBuffers.push(buffer);
        }
      }

      const result = await this.repo.putImages(
        imageBuffers,
        ctx.session.currentDir,
        fileNames,
      );

      if (result) {
        await this.dialog.sendImageUploadSuccessful(ctx);
        this.softResetSession(ctx);
        await this.navMenu(ctx);
      }
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

  async deleteFile(ctx: BotContext, path: string) {
    if (await this.repo.isFileExists(path)) {
      await this.repo.deleteFile(path);
      await this.navMenu(ctx);
    }
  }

  async createDirectory(
    currentDir: string,
    name: string | undefined,
  ): Promise<string> {
    if (!name?.trim()) name = await this.getRandomName(currentDir);
    const result = await this.repo.createDirectory(currentDir, name);
    return result;
  }

  async removeDirectory(path: string) {
    const result = await this.repo.removeDirectory(path);
    return result;
  }

  async loadImage(path: string): Promise<Buffer> {
    const result = await this.repo.getImage(path);
    return result;
  }

  async loadImagesInDir(path: string): Promise<Buffer[]> {
    const images: Promise<Buffer[]> = this.repo.getImagesInDir(path);
    return images;
  }

  async sendImage(ctx: BotContext, path: string) {
    const loadedImage = await this.loadImage(path);
    this.dialog.sendImg(loadedImage, ctx);
  }

  async sendAllImages(ctx: BotContext) {
    const path = ctx.session.currentDir;
    const loadedImages = await this.loadImagesInDir(path);
    this.dialog.sendImgs(loadedImages, ctx);
  }

  async sendTextFile(ctx: BotContext, path: string) {
    const fileContent: string = await this.repo.getTextFileContent(path);
    const reducedPath: string = this.dialog.leafInPath(path);
    this.dialog.sendTextFile(reducedPath, fileContent, ctx);
  }

  // ======================================================
}
