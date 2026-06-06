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

export class BotModel {
  constructor(
    private repo: BotRepository,
    private dialog: DialogEngine,
  ) {}

  // MENUS ================================================

  async mainMenu(ctx: BotContext) {
    if (ctx.chat && ctx.session) {
      this.softResetSession(ctx);
      await this.dialog.sendMainMenu(
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
      console.error("get-dirs error:", err);
      await this.dialog.sendError("get directories " + err, ctx);
    }
  }

  async actionsMenu(ctx: BotContext, path: string) {
    const isFile = path[path.length - 1] !== "/";
    await this.dialog.sendActionsMenu(ctx, isFile, path);
  }

  async deleteAskMenu(ctx: BotContext, path: string) {
    const isFile = path[path.length - 1] !== "/";
    await this.dialog.sendAsksMenu(ctx, isFile, path);
  }

  async asksMenu(ctx: BotContext, path: string) {
    const isFile = path[path.length - 1] !== "/";
    await this.dialog.sendAsksMenu(ctx, isFile, path);
  }

  // ======================================================

  // REPLIES ==============================================

  async onHelp(ctx: BotContext) {
    if (ctx.chat) {
      await this.dialog.sendHelp(ctx);
    }
  }

  async sendError(errorText: string, ctx: BotContext) {
    await this.dialog.sendError(errorText, ctx);
  }

  async askForDocumentType(ctx: BotContext) {
    await this.dialog.addAskType(ctx);
  }

  async askNewName(ctx: BotContext) {
    await this.dialog.askNewName(ctx);
  }

  // ======================================================

  // UTILS ================================================

  getBestPhoto(ctx: BotContext): string {
    const msg = ctx.message;
    if (!msg) return "";
    const photo = msg.photo;
    if (!photo) return "";
    const bestPhoto = photo[photo.length - 1];
    if (!bestPhoto) return "";
    return bestPhoto?.file_id;
  }

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
    ctx.session.chosenPath = "";
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
      await this.dialog.sendError("callback nav error: no such location", ctx);
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

  async addPhoto(fileId: string, ctx: BotContext, name?: string) {
    const buffer = await this.fetchPhotoFromTelegram(fileId, ctx);
    const extension = ".jpg"; // ИСПРАВИТЬ
    const finalName = name
      ? name
      : await this.getRandomName(ctx.session.currentDir);

    const result = await this.repo.putImage(
      buffer,
      ctx.session.currentDir,
      finalName,
      extension,
    );

    if (result) {
      await this.dialog.sendImageUploadSuccessful(ctx);
      this.softResetSession(ctx);
      await this.navMenu(ctx);
      return true;
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
    const result = await this.repo.deleteFile(path);
    const resultCode = result.$metadata.httpStatusCode;
    if (resultCode && resultCode - 200 < 100 && resultCode - 200 > 0) {
      await this.navMenu(ctx);
    } else {
      await this.sendError("Ошибка удаления файла", ctx);
      await this.sendError(resultCode!.toString(), ctx);
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

  async sendAllImages(ctx: BotContext) {
    const path = ctx.session.currentDir;
    const loadedImages = await this.repo.getImagesInDir(path);
    await this.dialog.sendImgs(loadedImages, ctx);
  }

  async sendTextFile(ctx: BotContext, path: string) {
    const fileContent: string = await this.repo.getTextFileContent(path);
    const reducedPath: string = this.dialog.leafInPath(path);
    await this.dialog.sendTextFile(reducedPath, fileContent, ctx);
  }

  async renameDir(prefix: string, oldName: string, newName: string) {
    await this.repo.renameDir(prefix, oldName, newName);
  }

  // ======================================================
}
