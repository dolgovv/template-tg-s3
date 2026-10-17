import { S3Client, type S3ClientConfig } from "@aws-sdk/client-s3";
import { BotRepository } from "./S3Repository.js";

export interface S3StorageOptions {
  /** S3 API URL. Leave empty for AWS S3 */
  endpoint?: string | undefined;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  /**
   * true:  http://host/bucket/key (Garage, MinIO and most self-hosted storages)
   * false: http://bucket.host/key (AWS and providers requiring virtual-hosted style)
   * Default: true
   */
  forcePathStyle?: boolean | undefined;
}

export type S3Storage = BotRepository;

export function s3Storage(options: S3StorageOptions): S3Storage {
  const s3Config: S3ClientConfig = {
    ...(options.endpoint && { endpoint: options.endpoint }),
    region: options.region,
    credentials: {
      accessKeyId: options.accessKeyId,
      secretAccessKey: options.secretAccessKey,
    },
    forcePathStyle: options.forcePathStyle ?? true,
  };

  return new BotRepository(options.bucket, new S3Client(s3Config));
}
