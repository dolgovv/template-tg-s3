import { Composer } from "grammy";
import type { Feature } from "../createBot.js";
import type { S3Storage } from "../datasource/S3Client.js";
import { BotModelImpl } from "../domain/BotModelImpl.js";
import { DialogEngine } from "../dialog/DialogEngine.js";
import { BotRouter } from "../controller/BotRouter.js";
import type { BotContext } from "../types.js";
import type { Update } from "grammy/types";
import { AlbumCollector, type AlbumItem } from "../domain/albums.js";
import {
  ChangeLog,
  type OnStorageChange,
  type StorageChange,
} from "./cacheInvalidation.js";

// how long to wait for the next item of an album before handling it
const ALBUM_DELAY_MS = 1000;

export interface FileManagerOptions {
  storage: S3Storage;
  /** folder inside the bucket to start from just like this: "site/". bucket root by default */
  root?: string | undefined;
  /** called after each action that changed the storage, see cacheWebhook() */
  onChange?: OnStorageChange | undefined;
}

// S3 browser: navigation, upload, rename and delete.
// adds the "navigation" button to the main menu and the upload help to /help
// !!! it answers any unrecognized text with help, so add your own handlers strictly before it
export function fileManager(options: FileManagerOptions): Feature {
  return (kit) => {
    const root = normalizeRoot(options.root);
    kit.sessionDefaults.currentDir = root;

    // a collected album is handled as one more update of the bot,
    // so it gets the session, access check and error handling like any other.
    // the timer fires after telegram's updates were handled, so changing
    // the session right there would be lost
    const completedAlbums = new WeakMap<Update, AlbumItem[]>();
    const albums = new AlbumCollector(ALBUM_DELAY_MS, (items, lastUpdate) => {
      const update: Update = { ...lastUpdate };
      completedAlbums.set(update, items);
      kit.bot.handleUpdate(update).catch((err) => kit.bot.errorHandler(err));
    });

    const changes = new ChangeLog();
    const model = new BotModelImpl(
      options.storage,
      new DialogEngine(),
      kit.logger,
      kit.options.token,
      kit.options.proxyUrl,
      root,
      albums,
      changes,
      kit.resetDialog,
    );
    kit.mainMenu.add("navigation", (t) => ({
      text: t.buttons.navigation,
      call: "navDir:root",
    }));
    kit.commands.addHelp((t) => t.help.upload);
    const composer = new Composer<BotContext>();

    // !!! the first one: it sees every write of the update, albums included.
    // runs even if the handler failed, the storage may be changed partly
    composer.use(async (ctx, next) => {
      try {
        await next();
      } finally {
        const change = changes.take(ctx);
        if (options.onChange && change) {
          notifyChange(ctx, { ...change, root }, options.onChange);
        }
      }
    });

    // !!! not awaited: updates are handled one by one,
    // a slow server of the site would delay everyone
    const notifyChange = (
      ctx: BotContext,
      change: StorageChange,
      onChange: OnStorageChange,
    ) => {
      // taken right away: the session is not available after the update
      const chatId = ctx.chat?.id;
      const failedText = ctx.t.cache.failed;
      const details = kit.logger.getDetails(ctx);
      const what =
        `${change.keys.length} files, ${change.prefixes.length} folders`;

      onChange(change).then(
        () => kit.logger.info("Cache reset: " + what + details),
        async (err) => {
          kit.logger.error("Cache reset failed: " + err + details);
          if (chatId !== undefined) {
            await ctx.api.sendMessage(chatId, failedText).catch(() => {});
          }
        },
      );
    };

    // sessions from older versions or made before the root was changed
    // may point outside the root, so bring them back into it
    composer.use((ctx, next) => {
      if (!ctx.session.currentDir?.startsWith(root)) {
        ctx.session.currentDir = root;
      }
      ctx.session.pathRefs ??= {};
      return next();
    });

    composer.use(async (ctx, next) => {
      const items = completedAlbums.get(ctx.update);
      if (!items) return next();
      await model.addAlbum(ctx, items);
    });

    new BotRouter(composer, model, kit.commands);
    return composer;
  };
}

// "/site" -> "site/", "" -> ""
function normalizeRoot(root: string | undefined): string {
  const trimmed = (root ?? "").replace(/^\/+/, "");
  if (!trimmed) return "";
  return trimmed.endsWith("/") ? trimmed : trimmed + "/";
}
