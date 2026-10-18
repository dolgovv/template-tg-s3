import {
  ListObjectsV2Command,
  type ListObjectsV2CommandInput,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  DeleteObjectsCommand,
  NoSuchKey,
  CopyObjectCommand,
} from "@aws-sdk/client-s3";
import type { _Object, S3Client } from "@aws-sdk/client-s3";
import type { Readable } from "node:stream";

export class BotRepository {
  private bucket: string;
  private s3Client: S3Client;

  constructor(bucket: string, s3Client: S3Client) {
    this.bucket = bucket;
    this.s3Client = s3Client;
  }

  // FUNCTIONS TO WORK WITH FILES
  async getImage(path: string): Promise<Buffer | undefined> {
    try {
      const response = await this.s3Client.send(
        new GetObjectCommand({
          Bucket: this.bucket,
          Key: path,
        }),
      );

      return this.streamToBuffer(response.Body as Readable);
    } catch (error) {
      if (error instanceof NoSuchKey) {
        return undefined;
      }

      throw error;
    }
  }

  async isFileExists(path: string): Promise<boolean> {
    try {
      await this.s3Client.send(
        new HeadObjectCommand({
          Bucket: this.bucket,
          Key: path,
        }),
      );
      return true;
    } catch (error) {
      return false;
    }
  }

  async isDirectoryExists(path: string): Promise<boolean> {
    const prefix = path.endsWith("/") ? path : path + "/";
    const response = await this.s3Client.send(
      new ListObjectsV2Command({
        Bucket: this.bucket,
        Prefix: prefix,
        MaxKeys: 1,
      }),
    );
    return (
      (response.Contents?.length ?? 0) > 0 ||
      (response.CommonPrefixes?.length ?? 0) > 0
    );
  }

  async getImagesInDir(path: string): Promise<Buffer[]> {
    const imagesList = await this.listImagesInDir(path);
    const bufferPromises = imagesList.map(
      async (imagePath) => await this.getImage(imagePath),
    );
    const result = await Promise.all(bufferPromises);
    return result.filter((it) => it !== undefined);
  }

  async getTextFileContent(path: string): Promise<string> {
    const response = await this.s3Client.send(
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: path,
      }),
    );

    return this.streamToString(response.Body as Readable);
  }

  // FUNCTIONS TO WORK WITH DIRECTORIES
  async listDirectories(prefix: string = ""): Promise<string[]> {
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

  async createDirectory(prefix: string, name: string): Promise<string> {
    const key = prefix + name + "/";
    const result = await this.s3Client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: "",
      }),
    );
    if (result.$metadata.httpStatusCode !== 200) {
      return "";
    } else {
      return key;
    }
  }

  private async getEverythingFrom(prefix: string) {
    let continuationToken: string | undefined;
    let result: _Object[] = [];

    do {
      const response = await this.s3Client.send(
        new ListObjectsV2Command({
          Bucket: this.bucket,
          Prefix: prefix,
          ContinuationToken: continuationToken,
        }),
      );

      if (response.Contents) {
        result.push(...response.Contents);
      }
      continuationToken = response.NextContinuationToken;
    } while (continuationToken);

    return result;
  }

  async copyAllRecursively(src: string, dst: string) {
    let result = true;
    const sourcePrefix = src.endsWith("/") ? src : src + "/";
    const destPrefix = dst.endsWith("/") ? dst : dst + "/";
    const filesToCopy: _Object[] = await this.getEverythingFrom(sourcePrefix);

    for (const obj of filesToCopy) {
      if (result) {
        const oldKey = obj.Key!;
        const newKey = oldKey.replace(sourcePrefix, destPrefix);
        const copyCommand = new CopyObjectCommand({
          Bucket: this.bucket,
          CopySource: this.copySource(oldKey),
          Key: newKey,
        });
        const response = await this.s3Client.send(copyCommand);
        result = this.isStatusCodeOk(response.$metadata.httpStatusCode);
      }
    }
    return result;
  }

  async removeDirectory(path: string): Promise<boolean> {
    // !!! an empty prefix means the whole bucket
    if (!path.endsWith("/")) {
      throw new Error(`Refusing to remove "${path}": not a directory`);
    }

    const keys = (await this.getEverythingFrom(path))
      .map((obj) => obj.Key)
      .filter((key): key is string => !!key);
    if (keys.length === 0) return false;

    // DeleteObjects accepts strictly up to 1000 keys per request
    for (let i = 0; i < keys.length; i += 1000) {
      const response = await this.s3Client.send(
        new DeleteObjectsCommand({
          Bucket: this.bucket,
          Delete: {
            Objects: keys.slice(i, i + 1000).map((key) => ({ Key: key })),
            Quiet: true,
          },
        }),
      );
      // S3 answers 200 even when some objects were not deleted
      if (
        !this.isStatusCodeOk(response.$metadata.httpStatusCode) ||
        response.Errors?.length
      ) {
        return false;
      }
    }
    return true;
  }

  async deleteFile(key: string) {
    return await this.s3Client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
    );
  }

  async putImages(
    imagesBuffers: Buffer<ArrayBufferLike>[],
    path: string,
    fileNames: string[],
  ) {
    const putPromises = imagesBuffers.map((buffer, i) => {
      if (fileNames[i]) {
        this.putImage(buffer, path, fileNames[i], ".jpg");
      }
    });
    return Promise.all(putPromises);
  }

  async putImage(
    buffer: Buffer,
    dir: string,
    name: string,
    extension: string,
  ): Promise<boolean> {
    const response = await this.s3Client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: dir + name + extension,
        Body: buffer,
      }),
    );
    return this.isStatusCodeOk(response.$metadata.httpStatusCode);
  }

  isStatusCodeOk(httpStatusCode: number | undefined): boolean {
    let result = true;
    if (!httpStatusCode) {
      result = false;
    } else {
      const temp = httpStatusCode - 200;
      if (temp > 100 || temp < 0) result = false;
    }
    return result;
  }

  // UTILS FUNCTIONS
  // CopySource is sent as an http header, so the key must be url-encoded
  private copySource(key: string): string {
    return `${this.bucket}/${key.split("/").map(encodeURIComponent).join("/")}`;
  }

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

  async renameDir(oldPath: string, newPath: string): Promise<boolean> {
    let result = await this.copyAllRecursively(oldPath, newPath);
    if (result) result = await this.removeDirectory(oldPath);
    return result;
  }

  async renameFile(oldKey: string, newKey: string): Promise<boolean> {
    const copyResponse = await this.s3Client.send(
      new CopyObjectCommand({
        Bucket: this.bucket,
        CopySource: this.copySource(oldKey),
        Key: newKey,
      }),
    );
    if (!this.isStatusCodeOk(copyResponse.$metadata.httpStatusCode)) {
      return false;
    }
    const deleteResponse = await this.s3Client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: oldKey,
      }),
    );
    return this.isStatusCodeOk(deleteResponse.$metadata.httpStatusCode);
  }

  async listAllFilesHere(prefix: string = ""): Promise<string[]> {
    const files: string[] = [];
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

      for (const obj of response.Contents ?? []) {
        if (obj.Key) {
          files.push(obj.Key);
        }
      }

      continuationToken = response.NextContinuationToken;
    } while (continuationToken);

    return files;
  }
}
