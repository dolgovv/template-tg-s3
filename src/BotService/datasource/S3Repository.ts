import {
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

export class BotRepository {
  private bucket = getEnv("S3_BUCKET", true);
  private currentDir: string;
  constructor(newCurrentDir?: string) {
    this.currentDir = newCurrentDir ?? "/";
  }

  // FUNCTIONS TO WORK WITH FILES
  async getImage(path: string): Promise<Buffer> {
    const response = await s3Client.send(
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: path,
      }),
    );

    return this.streamToBuffer(response.Body as Readable);
  }

  async getImagesInDir(path: string): Promise<Buffer[]> {
    const imagesList = await this.listImagesInDir(path);
    const bufferPromises = imagesList.map((imagePath) =>
      this.getImage(imagePath),
    );
    return Promise.all(bufferPromises);
  }

  async getText(path: string): Promise<string> {
    const response = await s3Client.send(
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: path,
      }),
    );

    return this.streamToString(response.Body as Readable);
  }

  // FUNCTIONS TO WORK WITH DIRECTORIES
  async listDirectories(prefix = ""): Promise<string[]> {
    const dirs: string[] = [];
    let continuationToken: string | undefined;

    do {
      const input: ListObjectsV2CommandInput = {
        Bucket: this.bucket,
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

  async createDirectory(prefix: string, name: string): Promise<void> {
    const key = `${prefix}${name}/`;
    await s3Client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: "",
      }),
    );
  }

  // UTILS FUNCTIONS
  async streamToBuffer(stream: Readable): Promise<Buffer> {
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }

  async streamToString(stream: Readable): Promise<string> {
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.from(chunk));
    }
    return Buffer.concat(chunks).toString("utf-8");
  }

  async listImagesInDir(prefix: string): Promise<string[]> {
    const command = new ListObjectsV2Command({
      Bucket: this.bucket,
      Prefix: prefix,
      Delimiter: "/",
    });

    const response = await s3Client.send(command);

    if (!response.Contents) {
      return [];
    }

    const imageExtensions = [".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp"];
    const images = response.Contents.map((obj) => obj.Key!).filter((key) => {
      return imageExtensions.some((ext) => key.endsWith(ext));
    });

    return images;
  }
}

// FILES
// export async function listImagesInDir(prefix: string): Promise<string[]> {
//   const command = new ListObjectsV2Command({
//     Bucket: bucketthis.: prefix,
//     Delimiter: "/",
//   });

//   const response = await s3Client.send(command);

//   if (!response.Contents) {
//     return [];
//   }

//   const imageExtensions = [".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp"];
//   const images = response.Contents.map((obj) => obj.Key!).filter((key) => {
//     // const lower = key.toLowerCase();
//     return imageExtensions.some((ext) => key.endsWith(ext));
//   });

//   return images;
// }

// async function streamToBuffer(stream: Readable): Promise<Buffer> {
//   const chunks: Buffer[] = [];
//   for await (const chunk of stream) {
//     chunks.push(Buffer.from(chunk));
//   }
//   return Buffer.concat(chunks);
// }

// async function streamToString(stream: Readable): Promise<string> {
//   const chunks: Buffer[] = [];
//   for await (const chunk of stream) {
//     chunks.push(Buffer.from(chunk));
//   }
//   return Buffer.concat(chunks).toString("utf-8");
// }

// export async function getImage(path: string): Promise<Buffer> {
//   const response = await s3Client.send(
//     new GetObjectCommand({
//       Bucket: bucketthis.: path,
//     }),
//   );

//   return streamToBuffer(response.Body as Readable);
// }

// export async function getImagesInDir(path: string): Promise<Buffer[]> {
//   const imagesList = await listImagesInDir(path);
//   const bufferPromises = imagesList.map((imagePath) => getImage(imagePath));
//   return Promise.all(bufferPromises);
// }

// export async function getText(path: string): Promise<string> {
//   const response = await s3Client.send(
//     new GetObjectCommand({
//       Bucket: bucketthis.: path,
//     }),
//   );

//   return streamToString(response.Body as Readable);
// }

// DIRECTORIES

// export async function listDirectories(prefix = ""): Promise<string[]> {
//   const dirs: string[] = [];
//   let continuationToken: string | undefined;

//   do {
//     const input: ListObjectsV2CommandInput = {
//       Bucket: bucketthis.: "/",
//       Prefix: prefix || undefined,
//       ContinuationToken: continuationToken,
//     };

//     const response = await s3Client.send(new ListObjectsV2Command(input));

//     for (const cp of response.CommonPrefixes ?? []) {
//       if (cp.Prefix) dirs.push(cp.Prefix);
//     }

//     continuationToken = response.NextContinuationToken;
//   } while (continuationToken);

//   return dirs;
// }

// export async function createDirectory(
//   prefix: string,
//   name: string,
// ): Promise<void> {
//   const key = `${prefix}${name}/`;
//   await s3Client.send(
//     new PutObjectCommand({
//       Bucket: bucketthis.: key,
//       Body: "",
//     }),
//   );
// }
