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

  async removeDirectory(path: string) {
    let continuationToken: string | undefined;
    do {
      // 1. Получаем все объекты с этим префиксом (без разделителя — нам нужны все)
      const listResponse = await this.s3Client.send(
        new ListObjectsV2Command({
          Bucket: this.bucket,
          Prefix: path,
          ContinuationToken: continuationToken,
        }),
      );

      // 2. Собираем ключи для удаления
      const objectsToDelete = (listResponse.Contents ?? [])
        .map((obj) => ({ Key: obj.Key! }))
        .filter((obj) => obj.Key); // на всякий случай убираем undefined

      if (objectsToDelete.length > 0) {
        // 3. Удаляем до 1000 объектов за один запрос
        await this.s3Client.send(
          new DeleteObjectsCommand({
            Bucket: this.bucket,
            Delete: {
              Objects: objectsToDelete,
              Quiet: false, // можно true, если не нужен детальный отчёт
            },
          }),
        );
      }

      continuationToken = listResponse.NextContinuationToken;
    } while (continuationToken);
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
    console.log("key=", dir + name + extension);

    const result = await this.s3Client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: dir + name + extension,
        Body: buffer,
      }),
    );
    return result.$metadata.httpStatusCode &&
      result.$metadata.httpStatusCode - 200 < 100
      ? true
      : false;
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

  private async getFilesInDir(prefix: string) {
    const command = new ListObjectsV2Command({
      Bucket: this.bucket,
      Prefix: prefix,
      Delimiter: "/",
    });

    const response = await this.s3Client.send(command);

    if (!response.Contents) {
      return [];
    }

    return response.Contents;
  }

  async copyAllRecursively(src: string, dst: string) {
    const sourcePrefix = src.endsWith("/") ? src : src + "/";
    const destPrefix = dst.endsWith("/") ? dst : dst + "/";
    let continuationToken: string | undefined;
    let filesToCopy: _Object[] = [];

    do {
      const command = new ListObjectsV2Command({
        Bucket: this.bucket,
        Prefix: sourcePrefix,
        ContinuationToken: continuationToken,
      });
      const response = await this.s3Client.send(command);
      if (response.Contents) {
        filesToCopy.push(...response.Contents);
      }
      continuationToken = response.NextContinuationToken;
    } while (continuationToken);

    for (const obj of filesToCopy) {
      const oldKey = obj.Key!;
      const newKey = oldKey.replace(src, dst);
      const copyCommand = new CopyObjectCommand({
        Bucket: this.bucket,
        CopySource: `${this.bucket}/${oldKey}`,
        Key: newKey,
      });
      await this.s3Client.send(copyCommand);
      console.log(`Скопирован: ${oldKey} -> ${newKey}`);
    }
  }

  async renameDir(prefix: string, oldDir: string, newDir: string) {
    const copyResult = await this.copyAllRecursively(prefix + oldDir, newDir);
    console.log("prefix, oldDir, newDir: ", prefix, oldDir, newDir);

    const deletitionResult = await this.removeDirectory(prefix + oldDir);
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
