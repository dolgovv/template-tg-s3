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
    let i = 0;
    do {
      i++;
    } while (
      ctx.session.currentDir[i] !== "/" &&
      ctx.session.currentDir.length > 0
    );
    ctx.session.currentDir = ctx.session.currentDir.substring(0, -i);
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
    } else {
      console.log("no session bitches: ", ctx.session);
    }
  }

  async onHelp(ctx: BotContext) {
    if (ctx.chat) {
      this.dialog.sendHelp(ctx.session.lang, ctx);
    }
  }

  async navMenu(ctx: BotContext): Promise<void> {
    if (!ctx.chat) return;
    const lang = ctx.session.lang;
    try {
      const dirs = await this.repo.listDirectories(ctx.session.currentDir);
      const buttons = this.dirListToButtons(dirs);

      this.dialog.sendNavigationMenu(lang, dirs, buttons, ctx);
    } catch (err) {
      console.error("get-dirs error:", err);
      this.dialog.sendError(lang, "get directories " + err, ctx);
    }
  }

  async navTo(ctx: BotContext, dir: string) {
    const lang = ctx.session.lang;
    await ctx.answerCallbackQuery();
    if (dir) {
      if (dir === "..") {
        this.navigateBack(ctx);
      } else {
        ctx.session.currentDir = ctx.session.currentDir.concat(dir);
      }
      await this.dialog.sendDirChanged(lang, ctx.session.currentDir, ctx);
    } else {
      console.error("callback nav error: no such location");
      this.dialog.sendError(lang, "callback nav error: no such location", ctx);
    }
  }

  async listDirectories(currentDir: string = ""): Promise<string[]> {
    const result = await this.repo.listDirectories(currentDir);
    return result;
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

  private dirListToButtons(dirList: string[]): MenuButton[] {
    let result: MenuButton[] = [{ text: "<-", call: "navDir:.." }];
    dirList.map((dir) => {
      result.push({ text: `navDir:${dir}`, call: `navDir:${dir}` });
    });
    return result;
  }
}
