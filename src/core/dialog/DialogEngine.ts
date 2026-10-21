import type { BotContext, Button, NavigationInstance } from "../types.js";
import type { DrawnTree } from "../domain/tree.js";
import { list } from "../texts/format.js";
import { escapeHtml } from "./html.js";
import { splitPages } from "./pages.js";
import { chunk, lines } from "./compose.js";
import { GrammyError } from "grammy";

// how a file is sent: a document, or with the player of telegram
export type SendAs = "document" | "audio" | "video";

// telegram limits a message strictly to 4096 characters (counted without HTML tags),
// the rest of the limit is left for the file name and the page number
const MAX_FILE_PAGE = 3500;
// a longer tree is sent as a file instead of a message (4096 limit)
const MAX_TREE_MESSAGE = 3800;

type Kind = "file" | "folder";
const kindOf = (isFile: boolean): Kind => (isFile ? "file" : "folder");

// the screens of the file manager, sent through ctx.ui.
// texts come from ctx.t: parameters are escaped there,
// strictly the HTML built here (file contents, trees) is escaped by hand
export class DialogEngine {
  async sendImg(image: Buffer, ctx: BotContext, caption?: string) {
    await ctx.ui.photo(image, { caption: caption && escapeHtml(caption) });
  }

  async sendFile(
    ctx: BotContext,
    file: Buffer,
    name: string,
    as: SendAs = "document",
  ) {
    try {
      await ctx.ui[as](file, { name });
    } catch (error) {
      // telegram may refuse to play it (a broken file, an odd codec):
      // then it goes as a document, which telegram always accepts
      if (as === "document" || !(error instanceof GrammyError)) throw error;
      await ctx.ui.document(file, { name });
    }
  }

  async sendImgs(images: Buffer[], ctx: BotContext) {
    if (images.length === 0) {
      await ctx.ui.text(ctx.t.files.noImages);
      return;
    }
    await ctx.ui.album(images);
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
    const turn: Button[] = [];
    if (page > 1) {
      turn.push({ text: b.prevPage, call: `filePage:${file.ref}:${page - 1}` });
    }
    if (page < pages.length) {
      turn.push({ text: b.nextPage, call: `filePage:${file.ref}:${page + 1}` });
    }

    if (file.edit) await ctx.ui.edit(text, [turn]);
    else await ctx.ui.text(text, [turn]);
  }

  async sendTree(
    tree: DrawnTree,
    limits: { depth: number; objects: number; truncated: boolean },
    ctx: BotContext,
  ) {
    const t = ctx.t.tree;
    if (tree.dirs + tree.files === 0) {
      await ctx.ui.text(ctx.t.nav.empty);
      return;
    }

    const notes = lines(
      t.summary({ dirs: tree.dirs, files: tree.files }),
      tree.depthLimited && t.depthLimited({ depth: limits.depth }),
      limits.truncated && t.truncated({ limit: limits.objects }),
    );

    if (tree.text.length <= MAX_TREE_MESSAGE) {
      await ctx.ui.text(lines("<pre>" + escapeHtml(tree.text) + "</pre>", notes));
    } else {
      await ctx.ui.document(Buffer.from(tree.text, "utf-8"), {
        name: "tree.txt",
        caption: lines(t.asFile, notes),
      });
    }
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

  async sendAlbumResult(
    ctx: BotContext,
    result: { uploaded: string[]; failed: string[]; extraNames: string[] },
  ) {
    const t = ctx.t.album;
    await ctx.ui.text(
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
    await ctx.ui.menu(ctx.t.nav.chooseAction, [
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
    await ctx.ui.menu(ctx.t.files.deleteAsk[kindOf(isFile)], [
      [
        { text: b.yes, call: `delete${isFile ? "File" : "Dir"}:${ref}` },
        { text: b.no, call: "cancel" },
      ],
    ]);
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

    await ctx.ui.menu(text, chunk(buttons, 2));
  }

  async sendAwaitingFile(ctx: BotContext) {
    await ctx.ui.text(ctx.t.files.awaitingFile, [
      [{ text: ctx.t.buttons.createFile, call: "createTextFile" }],
    ]);
  }

  // the steps of "Create file" replace the message with the pressed button
  async askTextFileType(ctx: BotContext, extensions: string[]) {
    await ctx.ui.edit(ctx.t.files.chooseExtension, [
      extensions.map((ext) => ({
        text: ext,
        call: "createTextFile:" + ext.slice(1),
      })),
      [{ text: ctx.t.buttons.back, call: "cancel" }],
    ]);
  }

  async askTextFileName(ctx: BotContext, extension: string) {
    const b = ctx.t.buttons;
    await ctx.ui.edit(ctx.t.files.askFileName({ extension }), [
      [{ text: b.skip, call: "skipTextFileName" }],
      [{ text: b.back, call: "cancel" }],
    ]);
  }

  async askTextFileContent(ctx: BotContext, extension: string, edit: boolean) {
    const text = ctx.t.files.askContent({ extension });
    const rows = [[{ text: ctx.t.buttons.back, call: "cancel" }]];
    if (edit) await ctx.ui.edit(text, rows);
    else await ctx.ui.text(text, rows);
  }

  async addAskType(ctx: BotContext) {
    const b = ctx.t.buttons;
    await ctx.ui.menu(ctx.t.nav.addAskType, [
      [
        { text: b.file, call: "newFile" },
        { text: b.folder, call: "newDirectory" },
      ],
    ]);
  }

  async askNewName(ctx: BotContext) {
    await ctx.ui.menu(ctx.t.files.askNewName, [
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
