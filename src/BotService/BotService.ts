import { Bot, session } from "grammy";
import { FileAdapter } from "@grammyjs/storage-file";
import { HttpsProxyAgent } from "https-proxy-agent";
import { DialogEngine } from "./dialog/DialogEngine.js";
import {
  DialogStep,
  type BotContext,
  type SessionData,
} from "./utils/types.js";
import { BotRepository } from "./datasource/S3Repository.js";
import { createS3Client } from "./datasource/S3Client.js";
import type { BotConfigEnv } from "./utils/env_auth.js";
import { BotModel } from "./domain/BotModel.js";
import { BotRouter } from "./controller/BotRouter.js";

export class BotService {
  private config: BotConfigEnv;
  private bot!: Bot<BotContext>;
  private dialogEngine!: DialogEngine;
  private repo!: BotRepository;
  private model!: BotModel;
  router!: BotRouter;

  constructor(config: BotConfigEnv) {
    this.config = config;
    this.setUp();
  }

  setUp() {
    this.setUpBot();
    this.setUpSession();

    this.setUpS3();

    this.setUpDialog();

    this.setUpMiddleware();
  }

  private buildBotProxyConfig(): object {
    if (!this.config.proxyUrl || this.config.proxyUrl[0] !== "h") {
      // SOCKS5 PROXY NOT IMPLEMENTED YET
      return {};
    }
    return {
      client: {
        baseFetchConfig: {
          agent: new HttpsProxyAgent(this.config.proxyUrl),
          compress: true,
        },
      },
    };
  }

  private isAdmin(chatId: number): boolean {
    return this.config.adminIds.includes(chatId);
  }

  private setUpBot() {
    const botProxyConfig = this.buildBotProxyConfig();
    this.bot = new Bot<BotContext>(this.config.botToken, botProxyConfig);
  }

  private setUpS3() {
    const s3Client = createS3Client(this.config);
    this.repo = new BotRepository(this.config.s3Bucket, s3Client);
  }

  private setUpDialog() {
    this.dialogEngine = new DialogEngine();
    this.model = new BotModel(this.repo, this.dialogEngine);
    this.router = new BotRouter(this.bot, this.model);
  }

  private setUpSession() {
    this.bot.use(
      session({
        initial: (): SessionData => ({
          lang: "en",
          dialogStep: DialogStep.Idle,
          websiteName: this.config.websiteName ?? "Not specified",
          currentDir: this.config.currentDir ?? "",
          lastMenuMessageId: this.config.lastMenuMessageId ?? "",
        }),
        storage: new FileAdapter({ dirName: "sessions" }),
      }),
    );

    // console.log("currentDir from setUpSession: ", ctx.session.currentDir);
  }

  private async setUpMiddleware() {
    this.bot.use(async (ctx, next) => {
      if (!ctx.chatId || !this.isAdmin(ctx.chatId)) {
        this.dialogEngine.sendAuthError(ctx);
        console.log(ctx.chatId + " tried to log in. Failed");
        return;
      }
      return next();
    });

    this.bot.catch(async (err) => {
      console.log("BOT CATCHED AN ERROR: ", err);
      this.model.hardResetSession(err.ctx);
    });
  }

  start() {
    this.bot.start();
  }
}
