import { Bot, Context, session } from "grammy";
import type { SessionFlavor } from "grammy";
import { FileAdapter } from "@grammyjs/storage-file";
import { HttpsProxyAgent } from "https-proxy-agent";
import { DialogEngine } from "./dialog/DialogEngine.js";
import { CommandHandler } from "./dialog/handlers/CommandHandler.js";
import { TextHandler } from "./dialog/handlers/TextHandler.js";
import { ReplyResolver } from "./dialog/ReplyResolver.js";
import { ButtonHandler } from "./dialog/handlers/ButtonHandler.js";
import { DialogStep, type SessionData } from "./utils/types.js";
import { BotRepository } from "./datasource/S3Repository.js";
import { createS3Client } from "./datasource/S3Client.js";
import type { BotConfigEnv } from "./utils/env_auth.js";

export type BotContext = Context & SessionFlavor<SessionData>;

export class BotService {
  private config: BotConfigEnv;
  private bot!: Bot<BotContext>;
  private dialogEngine!: DialogEngine;
  private replyResolver!: ReplyResolver;
  private repo!: BotRepository;

  constructor(config: BotConfigEnv) {
    this.config = config;
    this.setUp();
  }

  setUp() {
    this.setUpBot();
    this.setUpSession();

    this.setUpS3();

    this.setUpDialog();
    this.setUpHandlers();

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
    this.replyResolver = new ReplyResolver();
  }

  private setUpSession() {
    this.bot.use(
      session({
        initial: (): SessionData => ({
          lang: "en",
          dialogStep: DialogStep.Idle,
          currentDir: this.config.currentDir ?? "",
        }),
        storage: new FileAdapter({ dirName: "sessions" }),
      }),
    );
    // console.log("currentDir from setUpSession: ", ctx.session.currentDir);
  }

  private setUpMiddleware() {
    this.bot.use((ctx, next) => {
      if (!ctx.chatId || !this.isAdmin(ctx.chatId)) {
        const lang = ctx.session.lang;
        ctx.reply(this.dialogEngine.notAdmin(lang));
        ctx.reply(this.dialogEngine.yourId(lang, ctx.chatId));
        console.log(ctx.chatId + " tried to log in. Failed");
        return;
      }
      return next();
    });
  }

  setUpHandlers() {
    new CommandHandler(
      this.bot,
      this.dialogEngine,
      this.replyResolver,
      this.repo,
      this.config.websiteName,
    );
    new TextHandler(this.bot, this.dialogEngine, this.replyResolver);
    new ButtonHandler(this.bot, this.dialogEngine, this.replyResolver);
  }

  start() {
    this.bot.start();
  }
}
