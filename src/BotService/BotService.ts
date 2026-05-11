import { Bot } from "grammy";
import { HttpsProxyAgent } from "https-proxy-agent";
import { AuthService } from "./web/AuthService.js";
import { DialogEngine } from "./dialog/DialogEngine.js";
import { CommandHandler } from "./dialog/handlers/CommandHandler.js";

export class BotService {
  private websiteName: string;

  private bot: Bot;
  private dialogEngine: DialogEngine = new DialogEngine();
  private commandHandler: CommandHandler;

  private botConfig: object = {};
  private language: string = "ru";

  // private activeCallbacks: Map<string, number>;

  constructor(TOKEN: string, proxy?: string) {
    if (proxy) this.setUpProxy(proxy);
    this.websiteName = AuthService.getWebsiteName();

    this.bot = new Bot(TOKEN, this.botConfig);

    this.setUpMiddleware();

    this.commandHandler = new CommandHandler(
      this.bot,
      this.dialogEngine,
      this.websiteName,
    );
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
      if (!ctx.chatId || !AuthService.adminLogIn(ctx.chatId)) {
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
