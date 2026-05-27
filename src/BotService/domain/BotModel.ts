import type { BotContext } from "../BotService.js";
import { BotRepository } from "../datasource/S3Repository.js";
import type { DialogEngine } from "../dialog/DialogEngine.js";
import { getEnv } from "../utils/env_auth.js";
import {
  DialogStep,
  type botLanguage,
  type ContentType,
  type MenuButton,
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
          btnCallback: "add_img",
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

  pathToType(path: string): ContentType {
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

  async actionsMenu(ctx: BotContext, path: string) {
    const isFile = path[path.length - 1] !== "/";
    const buttons: MenuButton[] = [
      { text: "Open", call: isFile ? "openFile:" + path : "navDir:" + path },
      {
        text: "Delete",
        call: isFile ? "deleteFile:" + path : "deleteDir:" + path,
      },
    ];
    this.dialog.sendActionsMenu(buttons, ctx);
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

  // ======================================================

  // UTILS ================================================
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
    await this.dialog.sendAwaitingDocument(ctx);
  }
  // ======================================================

  // FILE MANAGEMENT ======================================
  async addFile(ctx: BotContext) {
    if (!ctx.message) {
      this.dialog.sendError("Unknown error", ctx);
    } else if (!ctx.message.photo) {
      this.dialog.sendError("No file provided", ctx);
    } else if (!ctx.message.photo[ctx.message.photo.length - 1]) {
      this.dialog.sendError("Error reading file", ctx);
    } else if (!ctx.message.caption) {
      this.dialog.sendNoFileNameProvidedError(ctx);
    } else {
      const proxyUrl: string | undefined = getEnv("PROXY_URL");
      const proxyAgent: ProxyAgent | undefined = proxyUrl
        ? new ProxyAgent(proxyUrl)
        : undefined;

      const photoId = ctx.message.photo[ctx.message.photo.length - 1]!.file_id;
      const file = await ctx.api.getFile(photoId);
      const token = getEnv("BOT_TOKEN", true);

      const url = `https://api.telegram.org/file/bot${token}/${file.file_path}`;
      const loadedFile = proxyAgent
        ? await fetch(url, { dispatcher: proxyAgent })
        : await fetch(url);

      const buffer = Buffer.from(await loadedFile.arrayBuffer());
      const fileName: string = this.dialog.sanitizeFileName(
        ctx.message.caption,
      );
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
      }
    }
  }

  async deleteFile(ctx: BotContext, path: string) {
    if (await this.repo.isFileExists(path)) {
      await this.repo.deleteFile(path);
      await this.navMenu(ctx);
    }
  }

  async createDirectory(currentDir: string, name: string): Promise<void> {
    const result = await this.repo.createDirectory(currentDir, name);
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
