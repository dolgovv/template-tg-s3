import type { BotContext } from "../BotService.js";
import { BotRepository } from "../datasource/S3Repository.js";
import type { DialogEngine } from "../dialog/DialogEngine.js";
import type { botLanguage, MenuButton } from "../utils/types.js";

export class BotModel {
  constructor(
    private repo: BotRepository,
    private dialog: DialogEngine,
  ) {}

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
      this.dialog.sendLanguageChanged(newLang, ctx);
    }
  }

  async onStart(ctx: BotContext) {
    if (ctx.chat && ctx.session) {
      const lang = ctx.session.lang;
      this.dialog.sendWelcome(
        lang,
        ctx.chat.first_name,
        ctx.session.websiteName,
        ctx,
      );
      this.resetSession(ctx);
    } else {
      console.log("no session bitches: ", ctx.session);
    }
  }

  resetSession(ctx: BotContext) {
    ctx.session.currentDir = "";
    ctx.session.lastMenuMessageId = 0;
  }

  async onHelp(ctx: BotContext) {
    if (ctx.chat) {
      this.dialog.sendHelp(ctx.session.lang, ctx);
    }
  }

  async navMenu(ctx: BotContext): Promise<void> {
    if (!ctx.chat) return;
    const lang = ctx.session.lang;
    const curDir = ctx.session.currentDir;
    try {
      const dirsPaths: string[] = await this.repo.listDirectories(curDir);
      const filesPaths: string[] = await this.repo.listAllFilesHere(curDir);

      const filesText: string[] = filesPaths.map((file) => {
        return this.dialog.leafInPath(file);
      });

      const dirsButtonText: string[] = dirsPaths.map((dir) => {
        return this.dialog.shrinkPath(dir);
      });

      const dirsText = dirsButtonText.map((dir) => {
        return "<b>" + dir + "</b>";
      });

      dirsButtonText.push(
        ...filesText.map((filePath) => {
          return this.dialog.shrinkPath(
            filePath.slice(0, filePath.indexOf(".")),
          );
        }),
      );

      const buttons = this.dirContentToButtons(dirsButtonText, [
        ...dirsPaths,
        ...filesPaths,
      ]);

      await this.dialog.sendNavigationMenu(
        lang,
        [...dirsText, ...filesText],
        buttons,
        ctx,
      );
    } catch (err) {
      console.error("get-dirs error:", err);
      this.dialog.sendError(lang, "get directories " + err, ctx);
    }
  }

  async sendError(errorText: string, ctx: BotContext) {
    const lang = ctx.session.lang;
    await this.dialog.sendError(lang, errorText, ctx);
  }

  async navTo(ctx: BotContext, dir: string) {
    const lang = ctx.session.lang;
    await ctx.answerCallbackQuery();
    if (dir) {
      if (dir === "..") {
        this.navigateBack(ctx);
      } else {
        // ctx.session.currentDir = ctx.session.currentDir.concat(dir);
        ctx.session.currentDir = dir;
      }
    } else {
      console.error("callback nav error: no such location");
      this.dialog.sendError(lang, "callback nav error: no such location", ctx);
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

  async sendImage(ctx: BotContext, path: string) {
    const loadedImage = await this.loadImage(path);
    this.dialog.sendImg(loadedImage, ctx);
  }

  async sendTextFile(ctx: BotContext, path: string) {
    const lang = ctx.session.lang;

    const fileContent: string = await this.repo.getTextFileContent(path);
    const reducedPath: string = this.dialog.leafInPath(path);
    this.dialog.sendTextFile(lang, reducedPath, fileContent, ctx);
  }

  async loadImagesInDir(path: string): Promise<Buffer[]> {
    const images: Promise<Buffer[]> = this.repo.getImagesInDir(path);
    return images;
  }

  private dirListToButtons(dirText: string[], dirPath: string[]): MenuButton[] {
    let result: MenuButton[] = [{ text: "<-", call: "navDir:.." }];
    if (dirText.length !== dirPath.length) {
      return result;
    }

    dirText.map((text, i) => {
      result.push({
        text: text,
        call: `navDir:${dirPath[i] ? dirPath[i] : "WRONG_PATH_FROM_BUTTON"}`,
      });
    });
    return result;
  }

  private dirContentToButtons(names: string[], paths: string[]): MenuButton[] {
    let result: MenuButton[] = [{ text: "<-", call: "navDir:.." }];
    if (names.length !== paths.length) {
      return result;
    }

    names.map((name, i) => {
      const actionType: string = name.endsWith("/") ? "navDir" : "openFile";
      result.push({
        text: name,
        call: `${actionType}:${paths[i] ? paths[i] : "WRONG_PATH_FROM_BUTTON"}`,
      });
    });
    return result;
  }
}
