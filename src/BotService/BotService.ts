import { Bot, Context, session } from "grammy";
import type { SessionFlavor } from "grammy";
import { FileAdapter } from "@grammyjs/storage-file";
import { HttpsProxyAgent } from "https-proxy-agent";
import { AuthService } from "./web/AuthService.js";
import { DialogEngine } from "./dialog/DialogEngine.js";
import { CommandHandler } from "./dialog/handlers/CommandHandler.js";
import { TextHandler } from "./dialog/handlers/TextHandler.js";
import { ReplyResolver } from "./dialog/ReplyResolver.js";
import { ButtonHandler } from "./dialog/handlers/ButtonHandler.js";
import { DialogStep, type SessionData } from "./utils/types.js";
import { BotRepository } from "./datasource/S3Repository.js";

export type BotContext = Context & SessionFlavor<SessionData>;

export class BotService {
  private websiteName: string;
  private bot: Bot<BotContext>;
  private dialogEngine: DialogEngine = new DialogEngine();
  private replyResolver: ReplyResolver = new ReplyResolver();
  private repo: BotRepository = new BotRepository();
  private botConfig: object = {};

  constructor(TOKEN: string, proxy?: string) {
    if (proxy) this.setUpProxy(proxy);
    this.websiteName = AuthService.getWebsiteName();

    this.bot = new Bot<BotContext>(TOKEN, this.botConfig);

    this.setUpSession();
    this.setUpMiddleware();
    this.setUpHandlers();
  }

  setUpProxy(proxyUrl: string) {
    if (proxyUrl[0] === "h") {
      this.botConfig = {
        client: {
          baseFetchConfig: {
            agent: new HttpsProxyAgent(proxyUrl),
            compress: true,
          },
        },
      };
    }
  }

  private setUpSession() {
    this.bot.use(
      session({
        initial: (): SessionData => ({
          lang: "ru",
          dialogStep: DialogStep.Idle,
          currentDir: "/catalog",
        }),
        storage: new FileAdapter({ dirName: "sessions" }),
      }),
    );
  }

  private setUpMiddleware() {
    this.bot.use((ctx, next) => {
      if (!ctx.chatId || !AuthService.adminLogIn(ctx.chatId)) {
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
      this.websiteName,
    );
    new TextHandler(this.bot, this.dialogEngine, this.replyResolver);
    new ButtonHandler(this.bot, this.dialogEngine, this.replyResolver);
  }

  start() {
    this.bot.start();
  }
}
