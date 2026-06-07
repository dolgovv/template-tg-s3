import "dotenv/config";

export function getEnv(key: string, required: true): string;
export function getEnv(key: string, required?: false): string | undefined;
export function getEnv(key: string, required?: boolean): string | undefined {
  const value = process.env[key];
  if (required && !value) {
    throw new Error(`Your .env is wrong. ${key} is missing`);
  }
  return value;
}

export interface BotConfigEnv {
  // Bot
  botToken: string;
  proxyUrl?: string;
  websiteName: string;
  adminIds: number[];
  currentDir: string | undefined;
  postsDir: string;
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
    // S3
    currentDir: getEnv("S3_ROOT_FOLDER", false),
    postsDir: getEnv("S3_POST_FOLDER", true),
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
