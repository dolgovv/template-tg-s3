// the one list of file types: the icon in navigation, what "Open" does,
// what goes into albums and the Content-Type for S3
// !!! extensions are compared in lower case: "photo.JPG" is a photo

type FileType = {
  // without a Content-Type S3 serves files as application/octet-stream,
  // so browsers download images instead of showing them
  mime: string;
  // 🖼️ / 📄 / 🎵 / 🎬 / ❓ in navigation
  icon: "image" | "document" | "audio" | "video" | "other";
  // photo: as a photo, text: its content page by page,
  // audio / video: with the player of telegram, file: as a document
  // !!! photo strictly for jpg/jpeg/png: telegram sends strictly these formats
  // as photos, others break the whole album.
  // the player strictly for mp3/m4a (audio) and mp4 (video), the rest is a document
  open: "photo" | "text" | "audio" | "video" | "file";
};

const image = (mime: string, open: FileType["open"] = "file"): FileType => ({
  mime,
  icon: "image",
  open,
});
const text = (mime: string): FileType => ({ mime, icon: "document", open: "text" });
const document = (mime: string): FileType => ({ mime, icon: "document", open: "file" });
const audio = (mime: string, open: FileType["open"] = "file"): FileType => ({
  mime,
  icon: "audio",
  open,
});
const video = (mime: string, open: FileType["open"] = "file"): FileType => ({
  mime,
  icon: "video",
  open,
});
const other = (mime: string): FileType => ({ mime, icon: "other", open: "file" });

const FILE_TYPES: Record<string, FileType> = {
  ".jpg": image("image/jpeg", "photo"),
  ".jpeg": image("image/jpeg", "photo"),
  ".png": image("image/png", "photo"),
  ".gif": image("image/gif"),
  ".webp": image("image/webp"),
  ".svg": image("image/svg+xml"),

  ".txt": text("text/plain; charset=utf-8"),
  ".md": text("text/markdown; charset=utf-8"),
  ".sh": text("text/x-shellscript; charset=utf-8"),
  ".json": text("application/json"),
  ".yml": text("application/yaml"),
  ".yaml": text("application/yaml"),
  ".toml": text("application/toml"),

  ".pdf": document("application/pdf"),
  ".doc": document("application/msword"),
  ".docx": document(
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ),

  ".ico": other("image/x-icon"),
  ".html": other("text/html; charset=utf-8"),
  ".css": other("text/css; charset=utf-8"),
  ".js": other("text/javascript; charset=utf-8"),
  ".xml": other("application/xml"),
  ".zip": other("application/zip"),
  ".xls": other("application/vnd.ms-excel"),
  ".xlsx": other(
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ),

  ".mp3": audio("audio/mpeg", "audio"),
  ".m4a": audio("audio/mp4", "audio"),
  ".ogg": audio("audio/ogg"),
  ".oga": audio("audio/ogg"),
  ".wav": audio("audio/wav"),
  ".flac": audio("audio/flac"),
  ".aac": audio("audio/aac"),

  ".mp4": video("video/mp4", "video"),
  ".webm": video("video/webm"),
  ".mov": video("video/quicktime"),
  ".mkv": video("video/x-matroska"),
  ".avi": video("video/x-msvideo"),
};

// anything else is sent as a document
const UNKNOWN: FileType = other("application/octet-stream");

// dotfiles are configs just like this: .env, .gitignore, .htaccess
const DOTFILE: FileType = text("text/plain; charset=utf-8");

// "photo.jpg" -> { name: "photo", extension: ".jpg" }, "README" -> no extension,
// a name starting with a dot is a name as a whole: ".env", ".env.local"
export function splitExtension(fileName: string): {
  name: string;
  extension: string;
} {
  const dotIndex = fileName.lastIndexOf(".");
  if (fileName.startsWith(".") || dotIndex === -1) {
    return { name: fileName, extension: "" };
  }
  return {
    name: fileName.slice(0, dotIndex),
    extension: fileName.slice(dotIndex),
  };
}

// path just like this: "site/img/cat.JPG"
export function fileType(path: string): FileType {
  const leaf = path.slice(path.lastIndexOf("/") + 1);
  if (leaf.startsWith(".")) return DOTFILE;
  const { extension } = splitExtension(leaf);
  return FILE_TYPES[extension.toLowerCase()] ?? UNKNOWN;
}

export function isPhoto(path: string): boolean {
  return fileType(path).open === "photo";
}

// extension just like this: ".png"
export function contentTypeFor(extension: string): string {
  return (FILE_TYPES[extension.toLowerCase()] ?? UNKNOWN).mime;
}
