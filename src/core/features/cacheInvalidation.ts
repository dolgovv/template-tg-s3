import type { BotContext } from "../types.js";

/** what was changed by one action of the user */
export interface StorageChange {
  /** changed files: uploaded, deleted, the old and the new key of a renamed one */
  keys: string[];
  /** changed folders: created, deleted, the old and the new prefix of a renamed one */
  prefixes: string[];
  /** S3_ROOT_PREFIX, so the server can turn keys into paths of the site */
  root: string;
}

/** called after each action that changed the storage, a rejection means the cache was not reset */
export type OnStorageChange = (change: StorageChange) => Promise<void>;

export interface CacheWebhookOptions {
  url: string;
  /** sent as "Authorization: Bearer <token>" */
  token?: string | undefined;
  /** 5000 by default */
  timeoutMs?: number | undefined;
}

// POST { event: "storage.changed", keys, prefixes, root } to the server of the site.
// any answer but 2xx, a network error or a timeout is a failure
// !!! PROXY_URL is not used: it is for telegram, the server of the site is your own
export function cacheWebhook(options: CacheWebhookOptions): OnStorageChange {
  return async (change) => {
    const response = await fetch(options.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(options.token && { Authorization: `Bearer ${options.token}` }),
      },
      body: JSON.stringify({ event: "storage.changed", ...change }),
      signal: AbortSignal.timeout(options.timeoutMs ?? 5000),
    });
    if (!response.ok) {
      throw new Error(`Cache webhook answered ${response.status}`);
    }
  };
}

// changes are collected during one update of telegram and sent together:
// an album of 10 files or a renamed folder is still one request
export class ChangeLog {
  private changes = new WeakMap<
    BotContext,
    { keys: Set<string>; prefixes: Set<string> }
  >();

  // !!! called right before the write: a partly failed write
  // may have changed something too, and an extra reset breaks nothing
  add(ctx: BotContext, change: { keys?: string[]; prefixes?: string[] }) {
    let current = this.changes.get(ctx);
    if (!current) {
      current = { keys: new Set(), prefixes: new Set() };
      this.changes.set(ctx, current);
    }
    for (const key of change.keys ?? []) current.keys.add(key);
    for (const prefix of change.prefixes ?? []) current.prefixes.add(prefix);
  }

  // what was collected for this update, undefined if nothing was written
  take(ctx: BotContext): Omit<StorageChange, "root"> | undefined {
    const current = this.changes.get(ctx);
    this.changes.delete(ctx);
    if (!current) return undefined;
    return { keys: [...current.keys], prefixes: [...current.prefixes] };
  }
}
