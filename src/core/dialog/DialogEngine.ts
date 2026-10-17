import type { BotContext, NavigationInstance } from "../types.js";
import { MessageFactory } from "./messages/MessageFactory.js";
import type { BotTexts } from "./messages/strings.js";
import { ReplyResolver } from "./ReplyResolver.js";

export class DialogEngine {
  private factory: MessageFactory = new MessageFactory();
  private resolver: ReplyResolver = new ReplyResolver("HTML");

  constructor(private texts: BotTexts) {}

  async sendMainMenu(ctx: BotContext) {
    const lang = ctx.session.lang;
    const t = this.texts.text[lang];
    const m = this.texts.menus[lang] ?? {};
    const reply = this.factory.menu(
      t.greetUser(ctx.chat?.first_name ?? t.anonName, ctx.session.websiteName),
      m.welcome,
    );
    await this.resolver.reply(ctx, reply);
  }

  async sendImg(image: Buffer, ctx: BotContext, caption?: string) {
    const reply = this.factory.photo(image, caption);
    await this.resolver.reply(ctx, reply);
  }

  async sendImgs(images: Buffer[], ctx: BotContext, caption?: string) {
    const reply = this.factory.mediaGroup(images, caption);
    await this.resolver.reply(ctx, reply);
  }

  async sendTextFile(path: string, text: string, ctx: BotContext) {
    const lang = ctx.session.lang;
    const t = this.texts.text[lang];
    const reply = this.factory.text(
      t.fileContent(path) + "<pre>" + text + "</pre>",
    );
    await this.resolver.reply(ctx, reply);
  }

  leafInPath(path: string) {
    const normalizedPath = path.endsWith("/") ? path.slice(0, -1) : path;
    const lastSlashIndex = normalizedPath.lastIndexOf("/");
    if (lastSlashIndex === -1) {
      return path;
    } else {
      const result = path.slice(lastSlashIndex + 1);
      return result;
    }
  }

  async sendHelp(ctx: BotContext) {
    const lang = ctx.session.lang;
    const t = this.texts.text[lang];
    const m = this.texts.menus[lang] ?? {};
    const reply = this.factory.text(t.help, m.help);
    await this.resolver.reply(ctx, reply);
  }

  async sendFileUploadSuccessful(ctx: BotContext) {
    const lang = ctx.session.lang;
    const t = this.texts.text[lang];
    const reply = this.factory.text(t.addFileSuccessful);
    await this.resolver.reply(ctx, reply);
  }

  async sendAwaitingImage(ctx: BotContext) {
    const lang = ctx.session.lang;
    const t = this.texts.text[lang];
    const reply = this.factory.text(t.awaitingImage);
    await this.resolver.reply(ctx, reply);
  }

  async sendAwaitingDirectoryName(ctx: BotContext) {
    const lang = ctx.session.lang;
    const t = this.texts.text[lang];
    const reply = this.factory.text(t.awaitingDirectoryName);
    await this.resolver.reply(ctx, reply);
  }

  async sendActionsMenu(isFile: boolean, path: string, ctx: BotContext) {
    const lang = ctx.session.lang;
    const t = this.texts.text[lang].chooseAction;
    const m = this.texts.menus[lang].actionsMenu(isFile, path);

    const reply = this.factory.menu(t, m);
    await this.resolver.reply(ctx, reply);
  }

  async sendAsksMenu(isFile: boolean, path: string, ctx: BotContext) {
    const lang = ctx.session.lang;
    const t = this.texts.text[lang].deleteAsk(isFile);
    const m = this.texts.menus[lang].deleteAskMenu(isFile, path);

    const reply = this.factory.menu(t, m);
    await this.resolver.reply(ctx, reply);
  }

  async sendDeletedSuccessfully(
    ctx: BotContext,
    isFile: boolean,
    path: string,
  ) {
    const lang = ctx.session.lang;
    const t = this.texts.text[lang].deletedSuccessfully(
      isFile,
      this.leafInPath(path),
    );

    const reply = this.factory.text(t);
    await this.resolver.reply(ctx, reply);
  }

  async sendNavigationMenu(content: NavigationInstance[], ctx: BotContext) {
    const lang = ctx.session.lang;
    const t = this.texts.text[lang];

    const buttons = content.map((it) => {
      return { text: it.btnText, call: it.btnCallback };
    });

    if (content.length < 3) {
      const reply = this.factory.menu(t.dirEmpty, buttons);

      await this.resolver.reply(ctx, reply);
    } else {
      const list = content
        .map((c, i) => {
          if (c.msgText) {
            return `${c.type.symbol} ${c.index}) ${c.msgText}`;
          }
        })
        .join("\n");

      const reply = this.factory.menu(list, buttons);

      await this.resolver.reply(ctx, reply);
    }
  }

  async sendError(description: string, ctx: BotContext) {
    const lang = ctx.session.lang;
    const reply = this.factory.text(
      `${this.texts.text[lang].error} ${description}`,
    );
    await this.resolver.reply(ctx, reply);
  }

  async sendDeletionError(isFile: boolean, path: string, ctx: BotContext) {
    const lang = ctx.session.lang;
    const reply = this.factory.text(
      this.texts.text[lang].errorDeletion(isFile, path),
    );
    await this.resolver.reply(ctx, reply);
  }

  async sendAuthError(ctx: BotContext) {
    const lang = ctx.session.lang;
    const reply = this.factory.text(this.texts.text[lang].notAdmin);
    await this.resolver.reply(ctx, reply);
  }

  async sendNoFileNameProvidedError(ctx: BotContext) {
    const lang = ctx.session.lang;
    const reply = this.factory.text(this.texts.text[lang].noFilename);
    await this.resolver.reply(ctx, reply);
  }

  async sendInvalidNameError(ctx: BotContext) {
    const lang = ctx.session.lang;
    const reply = this.factory.text(this.texts.text[lang].invalidName);
    await this.resolver.reply(ctx, reply);
  }

  async sendNameAlreadyExistsError(isFile: boolean, ctx: BotContext) {
    const lang = ctx.session.lang;
    const reply = this.factory.text(
      this.texts.text[lang].nameAlreadyExists(isFile),
    );
    await this.resolver.reply(ctx, reply);
  }

  async addAskType(ctx: BotContext) {
    const lang = ctx.session.lang;
    const t = this.texts.text[lang];
    const m = this.texts.menus[lang];
    const reply = this.factory.menu(t.addAskType, m.addAskType);
    await this.resolver.reply(ctx, reply);
  }

  async askNewName(ctx: BotContext) {
    const lang = ctx.session.lang;
    const t = this.texts.text[lang];
    const m = this.texts.menus[lang];
    const reply = this.factory.menu(t.askNewName, m.askNewName);
    await this.resolver.reply(ctx, reply);
  }

  shrinkPath(path: string): string {
    let result = this.leafInPath(path);

    if (result.length > 20) result = result.substring(0, 17).concat(".../");

    if (result[0] === "/") result = result.slice(1, result.length);

    return result;
  }

  sanitizeFileName(name: string): string {
    const res = name
      .replace(/[^a-zA-Z0-9а-яА-ЯёЁ._-]/g, "_")
      .replace(/\.{2,}/g, ".")
      .replace(/^\./, "_")
      .slice(0, 200);
    return res.endsWith("/") ? res.slice(0, -1) : res;
  }
}
