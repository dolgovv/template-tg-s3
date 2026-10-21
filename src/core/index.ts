// public API of the core
// !!! app code imports strictly from this file

export {
  createBot,
  type AnswerHandler,
  type BotApp,
  type BotKit,
  type BotOptions,
  type BotSettings,
  type Feature,
} from "./createBot.js";
export type {
  Commands,
  CommandDescription,
  HelpSection,
} from "./controller/commands.js";
export type {
  MainMenu,
  MainMenuEntry,
  MainMenuLayout,
} from "./dialog/mainMenu.js";
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
export {
  cacheWebhook,
  type CacheWebhookOptions,
  type OnStorageChange,
  type StorageChange,
} from "./features/cacheInvalidation.js";
export { raw, list, type Raw, type Param } from "./texts/format.js";
export {
  defineTexts,
  type CustomTexts,
  type Texts,
  type TextsOverrides,
  type TextTree,
  type LocaleSource,
  type PluralSource,
} from "./texts/schema.js";
export type {
  BotContext,
  Button,
  Buttons,
  FileOptions,
  MediaOptions,
  MediaSource,
  SessionData,
  Ui,
} from "./types.js";
