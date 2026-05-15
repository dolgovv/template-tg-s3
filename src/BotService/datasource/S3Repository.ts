import {
  DeleteObjectCommand,
  DeleteObjectsCommand,
  ListObjectsV2Command,
  type ListObjectsV2CommandInput,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { s3Client } from "./S3Client.js";
import { getEnv } from "../utils/env_auth.js";

const bucket = getEnv("S3_BUCKET", true);

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

/**
 * Creates a directory in S3 by uploading an empty object with a trailing slash.
 * @param prefix - Parent prefix (e.g. "folder/"). Pass "" for root.
 * @param name   - Directory name without slashes (e.g. "new-dir").
 */
export async function createDirectory(
  prefix: string,
  name: string,
): Promise<void> {
  const key = `${prefix}${name}/`;
  await s3Client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: "",
    }),
  );
}

/**
 * Deletes a directory and all objects inside it.
 * @param prefix - Full directory prefix including trailing slash (e.g. "folder/sub/").
 */
export async function deleteDirectory(prefix: string): Promise<void> {
  let continuationToken: string | undefined;

  do {
    const input: ListObjectsV2CommandInput = {
      Bucket: bucket,
      Prefix: prefix,
      ContinuationToken: continuationToken,
    };

    const response = await s3Client.send(new ListObjectsV2Command(input));
    const objects = response.Contents ?? [];

    if (objects.length > 0) {
      await s3Client.send(
        new DeleteObjectsCommand({
          Bucket: bucket,
          Delete: {
            Objects: objects.map((o) => ({ Key: o.Key! })),
            Quiet: true,
          },
        }),
      );
    }

    continuationToken = response.NextContinuationToken;
  } while (continuationToken);
}
