import {
  ListObjectsV2Command,
  type ListObjectsV2CommandInput,
} from "@aws-sdk/client-s3";
import { s3Client } from "./S3Client.js";
import { getEnv } from "../utils/env_auth.js";

const bucket = getEnv("S3_BUCKET", true);

/**
 * Returns the list of top-level "directory" prefixes in the bucket.
 * MinIO/S3 has no real directories — objects with a common prefix and
 * a trailing slash are treated as directories via the Delimiter option.
 */
export async function listDirectories(prefix = ""): Promise<string[]> {
  const dirs: string[] = [];
  let continuationToken: string | undefined;

  do {
    const input: ListObjectsV2CommandInput = {
      Bucket: bucket,
      Delimiter: "/",
      Prefix: prefix || undefined,
      ContinuationToken: continuationToken,
    };

    const response = await s3Client.send(new ListObjectsV2Command(input));

    for (const cp of response.CommonPrefixes ?? []) {
      if (cp.Prefix) dirs.push(cp.Prefix);
    }

    continuationToken = response.NextContinuationToken;
  } while (continuationToken);

  return dirs;
}
