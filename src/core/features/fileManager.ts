import { Composer } from "grammy";
import type { Feature } from "../createBot.js";
import type { S3Storage } from "../datasource/S3Client.js";
import { BotModelImpl } from "../domain/BotModelImpl.js";
import { BotRouter } from "../controller/BotRouter.js";
import type { BotContext } from "../types.js";

export interface FileManagerOptions {
  storage: S3Storage;
  /** Folder inside the bucket to start from, e.g. "site/". Default: bucket root */
  root?: string | undefined;
}

/**
 * Main menu, language switch and S3 browser: navigation, upload,
 * rename and delete. Answers any unrecognized text with help,
 * so register your own handlers before installing it.
 */
export function fileManager(options: FileManagerOptions): Feature {
  return (kit) => {
    kit.sessionDefaults.currentDir = normalizeRoot(options.root);

    const model = new BotModelImpl(
      options.storage,
      kit.dialog,
      kit.logger,
      kit.options.token,
      kit.options.proxyUrl,
    );
    const composer = new Composer<BotContext>();
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
