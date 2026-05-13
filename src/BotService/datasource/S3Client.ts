import {
  S3Client as AwsS3Client,
  type S3ClientConfig,
} from "@aws-sdk/client-s3";
import { getEnv } from "../utils/env_auth.js";

function createS3Client(): AwsS3Client {
  const endpoint = getEnv("S3_ENDPOINT", true);
  const region = getEnv("S3_REGION") ?? "us-east-1";
  const accessKeyId = getEnv("S3_BOT_NAME", true);
  const secretAccessKey = getEnv("S3_BOT_PASS", true);

  const config: S3ClientConfig = {
    endpoint,
    region,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
    // Required for MinIO: use path-style URLs (http://host/bucket/key)
    // instead of virtual-hosted style (http://bucket.host/key)
    forcePathStyle: true,
  };

  return new AwsS3Client(config);
}

export const s3Client = createS3Client();
export { AwsS3Client as S3Client };
