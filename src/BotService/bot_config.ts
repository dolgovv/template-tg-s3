import { getEnv } from "./env_auth.js";

export interface BotConfigEnv {
  // Bot
  botToken: string;
  proxyUrl?: string;
  websiteName: string;
  adminIds: number[];
  logPath: string;
  currentDir: string | undefined;
  lastMenuMessageId: number;

  // S3
  s3Endpoint: string;
  s3Region: string;
  s3AccessKeyId: string;
  s3SecretAccessKey: string;
  s3Bucket: string;
}

export function loadConfig(): BotConfigEnv {
  const proxyUrl = getEnv("PROXY_URL");
  return {
    // Bot
    botToken: getEnv("BOT_TOKEN", true),
    ...(proxyUrl && { proxyUrl }),
    websiteName: getEnv("WEBSITE_NAME", true),
    adminIds: parseAdminIds(getEnv("ADMIN_IDS", true)),
    logPath: getEnv("LOG_PATH", true),

    // S3
    currentDir: getEnv("S3_ROOT_FOLDER", false),
    lastMenuMessageId: 0,
    s3Endpoint: getEnv("S3_ENDPOINT", true),
    s3Region: getEnv("S3_REGION") ?? "us-east-1",
    s3AccessKeyId: getEnv("S3_BOT_NAME", true),
    s3SecretAccessKey: getEnv("S3_BOT_PASS", true),
    s3Bucket: getEnv("S3_BUCKET", true),
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
