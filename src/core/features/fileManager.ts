import { Composer } from "grammy";
import type { Feature } from "../createBot.js";
import type { S3Storage } from "../datasource/S3Client.js";
import { BotModelImpl } from "../domain/BotModelImpl.js";
import { BotRouter } from "../controller/BotRouter.js";
import type { BotContext } from "../types.js";

export interface FileManagerOptions {
  storage: S3Storage;
  /** folder inside the bucket to start from just like this: "site/". bucket root by default */
  root?: string | undefined;
}

// main menu, language switch and S3 browser: navigation, upload, rename and delete
// !!! it answers any unrecognized text with help, so add your own handlers strictly before it
export function fileManager(options: FileManagerOptions): Feature {
  return (kit) => {
    const root = normalizeRoot(options.root);
    kit.sessionDefaults.currentDir = root;

    const model = new BotModelImpl(
      options.storage,
      kit.dialog,
      kit.logger,
      kit.options.token,
      kit.options.proxyUrl,
      root,
    );
    const composer = new Composer<BotContext>();

    // sessions from older versions or made before the root was changed
    // may point outside the root, so bring them back into it
    composer.use((ctx, next) => {
      if (!ctx.session.currentDir?.startsWith(root)) {
        ctx.session.currentDir = root;
      }
      ctx.session.pathRefs ??= {};
      return next();
    });

    new BotRouter(composer, model);
    return composer;
  };
}

// "/site" -> "site/", "" -> ""
function normalizeRoot(root: string | undefined): string {
  const trimmed = (root ?? "").replace(/^\/+/, "");
  if (!trimmed) return "";
  return trimmed.endsWith("/") ? trimmed : trimmed + "/";
}
