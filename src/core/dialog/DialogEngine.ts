import type { BotContext, NavigationInstance } from "../types.js";
import type { DrawnTree } from "../domain/tree.js";
import type { Locales } from "../texts/locales.js";
import { list } from "../texts/format.js";
import { escapeHtml } from "./html.js";
import { splitPages } from "./pages.js";
import { MessageFactory } from "./messages/MessageFactory.js";
import { ReplyResolver, type MenuButton } from "./ReplyResolver.js";

// telegram limits a message strictly to 4096 characters (counted without HTML tags),
// the rest of the limit is left for the file name and the page number
const MAX_FILE_PAGE = 3500;
// telegram accepts strictly 2-10 items in one album
const MAX_ALBUM_SIZE = 10;
// a longer tree is sent as a file instead of a message (4096 limit)
const MAX_TREE_MESSAGE = 3800;

type Kind = "file" | "folder";
const kindOf = (isFile: boolean): Kind => (isFile ? "file" : "folder");

// texts come from ctx.t: parameters are escaped there,
// strictly the HTML built here (file contents, trees) is escaped by hand
export class DialogEngine {
  private factory: MessageFactory = new MessageFactory();
  private resolver: ReplyResolver = new ReplyResolver("HTML");

  constructor(
    private locales: Locales,
    private websiteName: string,
  ) {}

  hasLanguage(lang: string): boolean {
    return this.locales.has(lang);
  }

  // a new message
  async text(ctx: BotContext, text: string, rows: MenuButton[][] = []) {
    await this.resolver.reply(ctx, this.factory.text(text, rows));
  }

  // replaces the message whose button was pressed
  async edit(ctx: BotContext, text: string, rows: MenuButton[][] = []) {
    await this.resolver.reply(ctx, this.factory.edit(text, rows));
  }

  // the menu message: edited in place, see ReplyResolver
  async menu(ctx: BotContext, text: string, rows: MenuButton[][] = []) {
    await this.resolver.reply(ctx, this.factory.menu(text, rows));
  }

  async sendMainMenu(ctx: BotContext) {
    const t = ctx.t;
    const current = ctx.session.lang;
    // the current language goes first
    const languages = [...this.locales.languages].sort(
      (a, b) => Number(b === current) - Number(a === current),
    );
    const languageButtons = languages.map((lang) => ({
      text: this.locales.get(lang).meta.name,
      call: "lang=" + lang,
    }));

    await this.menu(
      ctx,
      t.common.greet({
        name: ctx.chat?.first_name ?? t.common.anonName,
        site: this.websiteName,
      }),
      [
        ...chunk(languageButtons, 2),
        [{ text: t.buttons.navigation, call: "navDir:root" }],
      ],
    );
  }

  async sendImg(image: Buffer, ctx: BotContext, caption?: string) {
    const reply = this.factory.photo(
      image,
      caption && escapeHtml(caption),
    );
    await this.resolver.reply(ctx, reply);
  }

  async sendFile(ctx: BotContext, file: Buffer, name: string) {
    await this.resolver.reply(ctx, this.factory.document(file, name));
  }

  async sendImgs(images: Buffer[], ctx: BotContext) {
    if (images.length === 0) {
      await this.text(ctx, ctx.t.files.noImages);
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

  // a long file is shown page by page: ◀️ ▶️ edit the same message
  async sendTextFile(
    ctx: BotContext,
    file: { name: string; text: string; ref: string; page: number; edit: boolean },
  ) {
    const t = ctx.t.files;
    const pages = splitPages(file.text, MAX_FILE_PAGE);
    // the file may have become shorter since the button was made
    const page = Math.min(Math.max(file.page, 1), pages.length);

    const text = lines(
      t.content({ name: file.name }),
      "<pre>" + escapeHtml(pages[page - 1]!) + "</pre>",
      pages.length > 1 && t.page({ page, pages: pages.length }),
    );

    const b = ctx.t.buttons;
    const turn: MenuButton[] = [];
    if (page > 1) {
      turn.push({ text: b.prevPage, call: `filePage:${file.ref}:${page - 1}` });
    }
    if (page < pages.length) {
      turn.push({ text: b.nextPage, call: `filePage:${file.ref}:${page + 1}` });
    }

    if (file.edit) await this.edit(ctx, text, [turn]);
    else await this.text(ctx, text, [turn]);
  }

  async sendTree(
    tree: DrawnTree,
    limits: { depth: number; objects: number; truncated: boolean },
    ctx: BotContext,
  ) {
    const t = ctx.t.tree;
    if (tree.dirs + tree.files === 0) {
      await this.text(ctx, ctx.t.nav.empty);
      return;
    }

    const notes = lines(
      t.summary({ dirs: tree.dirs, files: tree.files }),
      tree.depthLimited && t.depthLimited({ depth: limits.depth }),
      limits.truncated && t.truncated({ limit: limits.objects }),
    );

    const reply =
      tree.text.length <= MAX_TREE_MESSAGE
        ? this.factory.text(
            lines("<pre>" + escapeHtml(tree.text) + "</pre>", notes),
          )
        : this.factory.document(
            Buffer.from(tree.text, "utf-8"),
            "tree.txt",
            lines(t.asFile, notes),
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

  // the list of commands is built from the texts of the commands
  async sendHelp(ctx: BotContext) {
    const t = ctx.t;
    const commands = Object.entries(t.commands).map(
      ([name, description]) => `/${name} ${escapeHtml(description)}`,
    );
    await this.text(
      ctx,
      lines(t.help.upload, "", t.help.commandsTitle, ...commands),
    );
  }

  async sendAlbumResult(
    ctx: BotContext,
    result: { uploaded: string[]; failed: string[]; extraNames: string[] },
  ) {
    const t = ctx.t.album;
    await this.text(
      ctx,
      lines(
        t.uploaded({ count: result.uploaded.length }),
        ...result.uploaded.map(escapeHtml),
        result.failed.length > 0 && t.failed({ names: list(result.failed) }),
        result.extraNames.length > 0 &&
          t.extraNames({ names: list(result.extraNames) }),
      ),
    );
  }

  async sendActionsMenu(isFile: boolean, ref: string, ctx: BotContext) {
    const b = ctx.t.buttons;
    const type = isFile ? "File" : "Dir";
    await this.menu(ctx, ctx.t.nav.chooseAction, [
      [
        { text: b.open, call: (isFile ? "openFile:" : "navDir:") + ref },
        { text: b.delete, call: `delete${type}Ask:${ref}` },
      ],
      [
        { text: b.rename, call: `rename${type}Ask:${ref}` },
        { text: b.back, call: "cancel" },
      ],
    ]);
  }

  async sendAsksMenu(isFile: boolean, ref: string, ctx: BotContext) {
    const b = ctx.t.buttons;
    await this.menu(ctx, ctx.t.files.deleteAsk[kindOf(isFile)], [
      [
        { text: b.yes, call: `delete${isFile ? "File" : "Dir"}:${ref}` },
        { text: b.no, call: "cancel" },
      ],
    ]);
  }

  async sendDeletedSuccessfully(
    ctx: BotContext,
    isFile: boolean,
    path: string,
  ) {
    await this.text(
      ctx,
      ctx.t.files.deleted[kindOf(isFile)]({ name: this.leafInPath(path) }),
    );
  }

  async sendNavigationMenu(content: NavigationInstance[], ctx: BotContext) {
    const buttons = content.map((it, i) => ({
      // a long name is replaced by its number in the list (the first two are UI)
      text: it.btnText.length > 15 ? `${i - 1}` : it.btnText,
      call: it.btnCallback,
    }));

    const text =
      content.length < 3
        ? ctx.t.nav.empty
        : content
            .filter((c) => c.msgText)
            .map((c) => `${c.type.symbol} ${c.index}) ${c.msgText}`)
            .join("\n");

    await this.menu(ctx, text, chunk(buttons, 2));
  }

  async answerMenuOutdated(ctx: BotContext) {
    await ctx.answerCallbackQuery({ text: ctx.t.nav.outdated });
  }

  async sendDeletionError(isFile: boolean, path: string, ctx: BotContext) {
    await this.text(
      ctx,
      ctx.t.files.deleteFailed[kindOf(isFile)]({ name: path }),
    );
  }

  async sendNameAlreadyExistsError(isFile: boolean, ctx: BotContext) {
    await this.text(ctx, ctx.t.files.nameExists[kindOf(isFile)]);
  }

  async addAskType(ctx: BotContext) {
    const b = ctx.t.buttons;
    await this.menu(ctx, ctx.t.nav.addAskType, [
      [
        { text: b.file, call: "newFile" },
        { text: b.folder, call: "newDirectory" },
      ],
    ]);
  }

  async askNewName(ctx: BotContext) {
    await this.menu(ctx, ctx.t.files.askNewName, [
      [{ text: ctx.t.buttons.back, call: "cancel" }],
    ]);
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

// the parts of a message line by line, false and undefined are skipped
function lines(...parts: (string | false | undefined)[]): string {
  return parts
    .filter((part): part is string => typeof part === "string")
    .join("\n");
}

function chunk<T>(items: T[], size: number): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    rows.push(items.slice(i, i + size));
  }
  return rows;
}
