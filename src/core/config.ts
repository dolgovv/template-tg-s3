import type { BotOptions } from "./createBot.js";
import type { S3StorageOptions } from "./datasource/S3Client.js";
import type { FileManagerOptions } from "./features/fileManager.js";

export interface EnvConfig {
  bot: BotOptions;
  s3: S3StorageOptions;
  fileManager: Omit<FileManagerOptions, "storage">;
}

type Env = Record<string, string | undefined>;

export function configFromEnv(env: Env = process.env): EnvConfig {
  // old variable names are still accepted as fallbacks
  const read = (...keys: string[]): string | undefined => {
    for (const key of keys) {
      const value = env[key]?.trim();
      if (value) return value;
    }
    return undefined;
  };

  const required = (...keys: string[]): string => {
    const value = read(...keys);
    if (!value) throw new Error(`Your .env is wrong. ${keys[0]} is missing`);
    return value;
  };

  return {
    bot: {
      token: required("BOT_TOKEN"),
      admins: parseAdminIds(required("ADMIN_IDS")),
      websiteName: required("WEBSITE_NAME"),
      proxyUrl: read("PROXY_URL"),
      logPath: read("LOG_PATH"),
    },
    s3: {
      endpoint: read("S3_ENDPOINT"),
      region: read("S3_REGION") ?? "us-east-1",
      accessKeyId: required("S3_ACCESS_KEY_ID", "S3_BOT_NAME"),
      secretAccessKey: required("S3_SECRET_ACCESS_KEY", "S3_BOT_PASS"),
      bucket: required("S3_BUCKET"),
      forcePathStyle: read("S3_FORCE_PATH_STYLE") !== "false",
    },
    fileManager: {
      root: read("S3_ROOT_PREFIX", "S3_ROOT_FOLDER"),
    },
  };
}

function parseAdminIds(raw: string): number[] {
  const ids = raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .map((s) => parseInt(s, 10))
    .filter((id) => !isNaN(id));

  return ids;
}
