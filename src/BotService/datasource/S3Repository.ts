import {
  DeleteObjectCommand,
  GetObjectAclCommand,
  DeleteObjectsCommand,
  ListObjectsV2Command,
  type ListObjectsV2CommandInput,
  PutObjectCommand,
  type _Object as Object_S3,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { s3Client } from "./S3Client.js";
import { getEnv } from "../utils/env_auth.js";
import type { Post } from "../utils/types.js";
import type { Readable } from "node:stream";

const bucket = getEnv("S3_BUCKET", true);

const img_workdir = getEnv("S3_IMG_WORKDIR", true);

export async function listImagesInDir(prefix: string): Promise<string[]> {
  const command = new ListObjectsV2Command({
    Bucket: bucket,
    Prefix: prefix,
    Delimiter: "/",
  });

  const response = await s3Client.send(command);

  if (!response.Contents) {
    return [];
  }

  const imageExtensions = [".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp"];
  const images = response.Contents.map((obj) => obj.Key!).filter((key) => {
    // const lower = key.toLowerCase();
    return imageExtensions.some((ext) => key.endsWith(ext));
  });

  return images;
}

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

async function streamToBuffer(stream: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

async function streamToString(stream: Readable): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf-8");
}

export async function getImage(path: string): Promise<Buffer> {
  const response = await s3Client.send(
    new GetObjectCommand({
      Bucket: bucket,
      Key: path,
    }),
  );

  return streamToBuffer(response.Body as Readable);
}

export async function getImagesInDir(path: string): Promise<Buffer[]> {
  const imagesList = await listImagesInDir(path);
  const bufferPromises = imagesList.map((imagePath) => getImage(imagePath));
  return Promise.all(bufferPromises);
}

export async function getText(postId: string): Promise<string> {
  const key = `posts/${postId}/text.txt`;

  const response = await s3Client.send(
    new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    }),
  );

  return streamToString(response.Body as Readable);
}

export async function getPost(postId: string): Promise<Post> {
  // const [image, text] = await Promise.all([getImage(postId), getText(postId)]);
  const image = await getImage(postId);
  const text = await getText(postId);

  const result: Post = {
    image: image,
    text: text,
  };

  return result;
}
