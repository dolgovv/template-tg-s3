import { Bot, session, type BotConfig, type Middleware } from "grammy";
import { FileAdapter } from "@grammyjs/storage-file";
import { HttpsProxyAgent } from "https-proxy-agent";
import { DialogEngine } from "./dialog/DialogEngine.js";
import { defaultTexts, type BotTexts } from "./dialog/messages/strings.js";
import {
  BotLogger,
  DialogStep,
  type BotContext,
  type botLanguage,
  type SessionData,
} from "./types.js";

export interface BotOptions {
  token: string;
  /** telegram ids allowed to use the bot */
  admins: number[];
  /** shown in the welcome message */
  websiteName: string;
  /** http/https proxy just like this: http://user:password@host:port */
  proxyUrl?: string | undefined;
  /** "logs" by default */
  logPath?: string | undefined;
  /** "sessions" by default */
  sessionsDir?: string | undefined;
  /** "en" by default */
  defaultLang?: botLanguage | undefined;
  /** built-in ru/en texts by default */
  texts?: BotTexts | undefined;
}

/** shared services every feature gets from app.use() */
export interface BotKit {
  readonly bot: Bot<BotContext>;
  readonly options: Readonly<BotOptions>;
  readonly dialog: DialogEngine;
  readonly logger: BotLogger;
  /** here features can put their initial session values at install time */
  readonly sessionDefaults: Partial<SessionData>;
  resetSession(ctx: BotContext): void;
}

export type Feature = (kit: BotKit) => Middleware<BotContext>;

export interface BotApp {
  /** grammY bot itself: here you can register your own commands and middleware */
  readonly bot: Bot<BotContext>;
  use(feature: Feature): BotApp;
  /** starts long polling, resolves when the bot stops */
  start(): Promise<void>;
}

// creates a bot with session, admin-only access and error handling
// !!! it answers nothing until you add features with app.use()
export function createBot(options: BotOptions): BotApp {
  const logger = new BotLogger(options.logPath ?? "logs");
  const dialog = new DialogEngine(options.texts ?? defaultTexts);
  const bot = new Bot<BotContext>(
    options.token,
    buildBotProxyConfig(options.proxyUrl),
  );

  const sessionDefaults: Partial<SessionData> = {};
  // called lazily on the first update of each chat,
  // so it sees the defaults of features added after createBot()
  const initialSession = (): SessionData => ({
    lang: options.defaultLang ?? "en",
    dialogStep: DialogStep.Idle,
    websiteName: options.websiteName,
    currentDir: "",
    chosenPath: "",
    lastMenuMessageId: 0,
    pathRefs: {},
    ...sessionDefaults,
  });

  const resetSession = (ctx: BotContext) => {
    Object.assign(ctx.session, initialSession());
  };

  bot.use(
    session({
      initial: initialSession,
      storage: new FileAdapter({ dirName: options.sessionsDir ?? "sessions" }),
    }),
  );

  bot.use(async (ctx, next) => {
    if (!ctx.chat || !ctx.session) {
      logger.error("Session error");
      return;
    }
    if (!ctx.chatId || !options.admins.includes(ctx.chatId)) {
      await dialog.sendAuthError(ctx);
      logger.error("Log in attempt failed" + logger.getDetails(ctx));
      return;
    }

    await next();
  });

  bot.catch(async (err) => {
    logger.error(err.message + logger.getDetails(err.ctx));
    resetSession(err.ctx);
  });

  const kit: BotKit = {
    bot,
    options,
    dialog,
    logger,
    sessionDefaults,
    resetSession,
  };

  const app: BotApp = {
    bot,
    use(feature) {
      bot.use(feature(kit));
      return app;
    },
    start() {
      // lets `docker stop` shut the bot down gracefully instead of killing it
      process.once("SIGINT", () => bot.stop());
      process.once("SIGTERM", () => bot.stop());
      return bot.start();
    },
  };

  return app;
}

function buildBotProxyConfig(
  proxyUrl: string | undefined,
): BotConfig<BotContext> {
  if (!proxyUrl || proxyUrl[0] !== "h") {
    // TODO: SOCKS5 PROXY NOT IMPLEMENTED YET
    return {};
  }
  return {
    client: {
      baseFetchConfig: {
        agent: new HttpsProxyAgent(proxyUrl),
        compress: true,
      },
    },
  };
}
