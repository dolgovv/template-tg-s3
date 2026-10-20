import type { Update } from "grammy/types";

export type AlbumItem = {
  messageId: number;
  fileId: string;
  // its own name, see IncomingFile
  fileName: string | undefined;
  caption: string | undefined;
};

// telegram sends an album as separate messages with one media_group_id,
// so they are collected until no new ones come for `delayMs`
export class AlbumCollector {
  private pending = new Map<
    string,
    { items: AlbumItem[]; timer: NodeJS.Timeout }
  >();

  constructor(
    private delayMs: number,
    private onComplete: (items: AlbumItem[], lastUpdate: Update) => void,
  ) {}

  // key just like this: chat id + media_group_id
  add(key: string, item: AlbumItem, update: Update) {
    const album = this.pending.get(key);
    if (album) clearTimeout(album.timer);

    const items = album?.items ?? [];
    items.push(item);
    const timer = setTimeout(() => {
      this.pending.delete(key);
      this.onComplete(items, update);
    }, this.delayMs);
    this.pending.set(key, { items, timer });
  }
}

// "1, 2 3" -> ["1", "2", "3"]: names can't contain spaces or commas anyway
export function splitNames(caption: string): string[] {
  return caption.split(/[\s,]+/).filter(Boolean);
}

// names for album items in the order they were sent, undefined = random name:
// ---  one caption in the album    -> a list of names for all items in order
// ---  several items have captions -> every captioned item is named by its own
export function assignAlbumNames(items: AlbumItem[]): {
  names: (string | undefined)[];
  extraNames: string[];
} {
  const captions = items.map((item) => item.caption?.trim() || undefined);
  const captioned = captions.filter((caption) => caption !== undefined);

  if (captioned.length === 1) {
    const names = splitNames(captioned[0]!);
    return {
      names: items.map((_, i) => names[i]),
      extraNames: names.slice(items.length),
    };
  }
  return { names: captions, extraNames: [] };
}
