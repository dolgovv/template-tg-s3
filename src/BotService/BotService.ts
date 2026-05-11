import { Bot } from "grammy";
import { HttpsProxyAgent } from "https-proxy-agent";
import { AuthService } from "./web/AuthService.js";
import { DialogEngine } from "./dialog/DialogEngine.js";
import { CommandHandler } from "./dialog/handlers/CommandHandler.js";
import { ReplyResolver } from "./dialog/ReplyResolver.js";
import { ButtonHandler } from "./dialog/handlers/ButtonHandler.js";

export class BotService {
  private websiteName: string;

  private bot: Bot;
  private dialogEngine: DialogEngine = new DialogEngine();
  private replyResolver: ReplyResolver = new ReplyResolver();
  private botConfig: object = {};

  // private activeCallbacks: Map<string, number>;

  constructor(TOKEN: string, proxy?: string) {
    if (proxy) this.setUpProxy(proxy);
    this.websiteName = AuthService.getWebsiteName();

    this.bot = new Bot(TOKEN, this.botConfig);

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

  setUpHandlers() {
    new CommandHandler(
      this.bot,
      this.dialogEngine,
      this.replyResolver,
      this.websiteName,
    );
    new ButtonHandler(
      this.bot,
      this.dialogEngine,
      this.replyResolver,
      this.websiteName,
    );
  }

  private setUpMiddleware() {
    this.bot.use((ctx, next) => {
      if (!ctx.chatId || !AuthService.adminLogIn(ctx.chatId)) {
        ctx.reply(this.dialogEngine.notAdmin());
        ctx.reply(this.dialogEngine.yourId(ctx.chatId));
        console.log(ctx.chatId + " tried to log in. Failed");
        return;
      }
      return next();
    });
  }

  start() {
    this.bot.start();
  }
}
