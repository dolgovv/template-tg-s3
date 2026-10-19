import type { BotContext, botLanguage, NavigationInstance } from "../types.js";
import type { DrawnTree } from "../domain/tree.js";
import { escapeHtml } from "./html.js";
import { MessageFactory } from "./messages/MessageFactory.js";
import type { BotTexts } from "./messages/strings.js";
import { ReplyResolver } from "./ReplyResolver.js";

// telegram limits a message strictly to 4096 characters,
// the rest of the limit is left for the file name and the note
const MAX_FILE_PREVIEW = 3500;
// telegram accepts strictly 2-10 items in one album
const MAX_ALBUM_SIZE = 10;
// a longer tree is sent as a file instead of a message (4096 limit)
const MAX_TREE_MESSAGE = 3800;

export class DialogEngine {
  private factory: MessageFactory = new MessageFactory();
  private resolver: ReplyResolver = new ReplyResolver("HTML");

  constructor(private texts: BotTexts) {}

  async sendMainMenu(ctx: BotContext) {
    const lang = ctx.session.lang;
    const t = this.texts.text[lang];
    const m = this.texts.menus[lang] ?? {};
    const reply = this.factory.menu(
      t.greetUser(
        escapeHtml(ctx.chat?.first_name ?? t.anonName),
        escapeHtml(ctx.session.websiteName),
      ),
      m.welcome,
    );
    await this.resolver.reply(ctx, reply);
  }

  async sendImg(image: Buffer, ctx: BotContext, caption?: string) {
    const reply = this.factory.photo(image, caption);
    await this.resolver.reply(ctx, reply);
  }

  async sendImgs(images: Buffer[], ctx: BotContext) {
    if (images.length === 0) {
      const t = this.texts.text[ctx.session.lang];
      await this.resolver.reply(ctx, this.factory.text(t.noImages));
      return;
    }

    for (let i = 0; i < images.length; i += MAX_ALBUM_SIZE) {
      const chunk = images.slice(i, i + MAX_ALBUM_SIZE);
      const reply =
        chunk.length === 1
          ? this.factory.photo(chunk[0]!)
          : this.factory.mediaGroup(chunk);
      await this.resolver.reply(ctx, reply);
    }
  }

  async sendTextFile(path: string, text: string, ctx: BotContext) {
    const lang = ctx.session.lang;
    const t = this.texts.text[lang];
    const preview = text.slice(0, MAX_FILE_PREVIEW);
    const note =
      text.length > MAX_FILE_PREVIEW
        ? t.fileTruncated(MAX_FILE_PREVIEW, text.length)
        : "";
    const reply = this.factory.text(
      t.fileContent(escapeHtml(path)) +
        "<pre>" +
        escapeHtml(preview) +
        "</pre>" +
        note,
    );
    await this.resolver.reply(ctx, reply);
  }

  async sendTree(
    tree: DrawnTree,
    limits: { depth: number; objects: number; truncated: boolean },
    ctx: BotContext,
  ) {
    const t = this.texts.text[ctx.session.lang];
    if (tree.dirs + tree.files === 0) {
      await this.resolver.reply(ctx, this.factory.text(t.dirEmpty));
      return;
    }

    const notes =
      t.treeSummary(tree.dirs, tree.files) +
      (tree.depthLimited ? t.treeDepthLimited(limits.depth) : "") +
      (limits.truncated ? t.treeTruncated(limits.objects) : "");

    const reply =
      tree.text.length <= MAX_TREE_MESSAGE
        ? this.factory.text("<pre>" + escapeHtml(tree.text) + "</pre>\n" + notes)
        : this.factory.document(
            Buffer.from(tree.text, "utf-8"),
            "tree.txt",
            t.treeAsFile + "\n" + notes,
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

  async sendAlbumResult(
    ctx: BotContext,
    result: { uploaded: string[]; failed: string[]; extraNames: string[] },
  ) {
    const t = this.texts.text[ctx.session.lang];
    const escape = (names: string[]) => names.map(escapeHtml);
    const text =
      t.albumUploaded(escape(result.uploaded)) +
      (result.failed.length ? t.albumFailed(escape(result.failed)) : "") +
      (result.extraNames.length
        ? t.albumExtraNames(escape(result.extraNames))
        : "");
    await this.resolver.reply(ctx, this.factory.text(text));
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

  async sendActionsMenu(isFile: boolean, ref: string, ctx: BotContext) {
    const lang = ctx.session.lang;
    const t = this.texts.text[lang].chooseAction;
    const m = this.texts.menus[lang].actionsMenu(isFile, ref);

    const reply = this.factory.menu(t, m);
    await this.resolver.reply(ctx, reply);
  }

  async sendAsksMenu(isFile: boolean, ref: string, ctx: BotContext) {
    const lang = ctx.session.lang;
    const t = this.texts.text[lang].deleteAsk(isFile);
    const m = this.texts.menus[lang].deleteAskMenu(isFile, ref);

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
      escapeHtml(this.leafInPath(path)),
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

  async answerMenuOutdated(ctx: BotContext) {
    const lang = ctx.session.lang;
    await ctx.answerCallbackQuery({ text: this.texts.text[lang].menuOutdated });
  }

  async sendError(description: string, ctx: BotContext) {
    const lang = ctx.session.lang;
    const reply = this.factory.text(
      `${this.texts.text[lang].error} ${escapeHtml(description)}`,
    );
    await this.resolver.reply(ctx, reply);
  }

  async sendUnexpectedError(ctx: BotContext) {
    const t = this.texts.text[ctx.session.lang];
    await this.resolver.reply(ctx, this.factory.text(t.unexpectedError));
  }

  async sendRenameError(ctx: BotContext) {
    const t = this.texts.text[ctx.session.lang];
    await this.resolver.reply(ctx, this.factory.text(t.renameError));
  }

  async sendDeletionError(isFile: boolean, path: string, ctx: BotContext) {
    const lang = ctx.session.lang;
    const reply = this.factory.text(
      this.texts.text[lang].errorDeletion(isFile, escapeHtml(path)),
    );
    await this.resolver.reply(ctx, reply);
  }

  // strangers have no session, so the language is passed explicitly
  async sendAuthError(ctx: BotContext, lang: botLanguage) {
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
