import {
  ListObjectsV2Command,
  type ListObjectsV2CommandInput,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import type { S3Client } from "@aws-sdk/client-s3";
import type { Readable } from "node:stream";

export class BotRepository {
  private bucket: string;
  private s3Client: S3Client;

  constructor(bucket: string, s3Client: S3Client) {
    this.bucket = bucket;
    this.s3Client = s3Client;
  }

  // FUNCTIONS TO WORK WITH FILES
  async getImage(path: string): Promise<Buffer> {
    const response = await this.s3Client.send(
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
    const response = await this.s3Client.send(
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

      const response = await this.s3Client.send(
        new ListObjectsV2Command(input),
      );

      for (const cp of response.CommonPrefixes ?? []) {
        if (cp.Prefix) dirs.push(cp.Prefix);
      }

      continuationToken = response.NextContinuationToken;
    } while (continuationToken);

    return dirs;
  }

  async createDirectory(prefix: string, name: string): Promise<void> {
    const key = `${prefix}${name}/`;
    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: "",
      }),
    );
  }

  // UTILS FUNCTIONS
  private async streamToBuffer(stream: Readable): Promise<Buffer> {
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }

  private async streamToString(stream: Readable): Promise<string> {
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.from(chunk));
    }
    return Buffer.concat(chunks).toString("utf-8");
  }

  private async listImagesInDir(prefix: string): Promise<string[]> {
    const command = new ListObjectsV2Command({
      Bucket: this.bucket,
      Prefix: prefix,
      Delimiter: "/",
    });

    const response = await this.s3Client.send(command);

    if (!response.Contents) {
      return [];
    }

    const imageExtensions = [".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp"];
    return response.Contents.map((obj) => obj.Key!).filter((key) => {
      return imageExtensions.some((ext) => key.endsWith(ext));
    });
  }
}
