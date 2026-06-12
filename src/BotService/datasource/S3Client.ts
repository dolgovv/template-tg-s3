import { S3Client, type S3ClientConfig } from "@aws-sdk/client-s3";
import type { BotConfigEnv } from "../bot_config.js";

export function createS3Client(
  config: Pick<
    BotConfigEnv,
    "s3Endpoint" | "s3Region" | "s3AccessKeyId" | "s3SecretAccessKey"
  >,
): S3Client {
  const s3Config: S3ClientConfig = {
    endpoint: config.s3Endpoint,
    region: config.s3Region,
    credentials: {
      accessKeyId: config.s3AccessKeyId,
      secretAccessKey: config.s3SecretAccessKey,
    },
    forcePathStyle: true,
  };

  return new S3Client(s3Config);
}
