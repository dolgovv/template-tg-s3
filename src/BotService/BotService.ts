import { Bot, GrammyError, HttpError } from "grammy";
import { HttpsProxyAgent } from "https-proxy-agent";
import { adminAuth } from "./web/AuthService.js";
import { DialogEngine } from "./dialog/DialogEngine.js";
import { CommandHandler } from "./dialog/handlers/CommandHandler.js";

export class BotService {
  private bot: Bot;
  private dialogEngine: DialogEngine = new DialogEngine();

  private botConfig: object = {};
  private language: string = "ru";

  // private activeCallbacks: Map<string, number>;

  constructor(TOKEN: string, proxy?: string) {
    if (proxy) {
      this.setUpProxy(proxy);
    }

    this.bot = new Bot(TOKEN, this.botConfig);
    new CommandHandler(this.bot, this.dialogEngine);
    this.setUpMiddleware();
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

  private setUpMiddleware() {
    this.bot.use((ctx, next) => {
      if (!ctx.chatId || !adminAuth(ctx.chatId)) {
        ctx.reply(this.dialogEngine.mText().notAdmin);
        return;
      }
      return next();
    });
  }

  start() {
    this.bot.start();
  }
}
