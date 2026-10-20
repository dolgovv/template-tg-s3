// public API of the core
// !!! app code imports strictly from this file

export {
  createBot,
  type BotApp,
  type BotKit,
  type BotOptions,
  type Feature,
} from "./createBot.js";
export {
  fileManager,
  type FileManagerOptions,
} from "./features/fileManager.js";
export {
  s3Storage,
  type S3Storage,
  type S3StorageOptions,
} from "./datasource/S3Client.js";
export { configFromEnv, type EnvConfig } from "./config.js";
export { raw, list, type Raw, type Param } from "./texts/format.js";
export type {
  Texts,
  TextsOverrides,
  LocaleSource,
  PluralSource,
} from "./texts/schema.js";
export type { BotContext, SessionData } from "./types.js";
