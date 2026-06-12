import { Bot, session } from "grammy";
import { FileAdapter } from "@grammyjs/storage-file";
import { HttpsProxyAgent } from "https-proxy-agent";
import { DialogEngine } from "./dialog/DialogEngine.js";
import {
  BotLogger,
  DialogStep,
  type BotContext,
  type SessionData,
} from "./types.js";
import { BotRepository } from "./datasource/S3Repository.js";
import { createS3Client } from "./datasource/S3Client.js";
import { BotModelImpl } from "./domain/BotModelImpl.js";
import { BotRouter } from "./controller/BotRouter.js";
import type { BotConfigEnv } from "../bot_config.js";
import type { IBotModel } from "./IBotModel.js";

export class BotService {
  private config: BotConfigEnv;
  private bot!: Bot<BotContext>;
  private dialogEngine!: DialogEngine;
  private repo!: BotRepository;
  private model!: IBotModel;
  router!: BotRouter;
  private logger!: BotLogger;

  constructor(config: BotConfigEnv) {
    this.config = config;
    this.setUp();
  }

  setUp() {
    this.setUpBot();
    this.setUpSession();

    this.setUpS3();

    this.setUpMiddleware();
    this.setUpDialog();
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
    this.model = new BotModelImpl(
      this.repo,
      this.dialogEngine,
      this.logger,
      this.config.botToken,
      this.config.proxyUrl,
    );
    this.router = new BotRouter(this.bot, this.model);
  }

  private setUpSession() {
    this.logger = new BotLogger(this.config.logPath);
    this.bot.use(
      session({
        initial: (): SessionData => ({
          lang: "en",
          dialogStep: DialogStep.Idle,
          websiteName: this.config.websiteName ?? "Not specified",
          currentDir: this.config.currentDir ?? "",
          chosenPath: "",
          lastMenuMessageId: this.config.lastMenuMessageId ?? "",
        }),
        storage: new FileAdapter({ dirName: "sessions" }),
      }),
    );
  }

  private async setUpMiddleware() {
    this.bot.use(async (ctx, next) => {
      if (!ctx.chat || !ctx.session) {
        this.logger.error("Session error");
        return;
      }
      if (!ctx.chatId || !this.isAdmin(ctx.chatId)) {
        await this.dialogEngine.sendAuthError(ctx);
        this.logger.error(
          "Log in attempt failed" + this.logger.getDetails(ctx),
        );
        return;
      }

      await next();
    });

    this.bot.catch(async (err) => {
      this.logger.error(err.message + this.logger.getDetails(err.ctx));
      this.model.sessionReset(err.ctx, true);
    });
  }

  start() {
    this.bot.start();
  }
}
