import {
  Bot,
  Composer,
  session,
  type BotConfig,
  type CommandMiddleware,
  type Middleware,
} from "grammy";
import { FileAdapter } from "@grammyjs/storage-file";
import { HttpsProxyAgent } from "https-proxy-agent";
import { ContextUi } from "./dialog/Ui.js";
import { MainMenu, type MainMenuLayout } from "./dialog/mainMenu.js";
import { Commands, type CommandDescription } from "./controller/commands.js";
import { Locales } from "./texts/locales.js";
import type { CustomTextsOption, TextsOverrides } from "./texts/schema.js";
import {
  BotLogger,
  DialogStep,
  type BotContext,
  type SessionData,
} from "./types.js";

/** everything but your own texts: configFromEnv() fills it from .env */
export interface BotSettings {
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
  /** the language of new users and of missing texts, "en" by default */
  defaultLang?: string | undefined;
  /** strictly the texts that differ from the built-in ru/en, or a new language */
  texts?: TextsOverrides | undefined;
  /** rows of the main menu, see MainMenuLayout. the languages, then the buttons of the features by default */
  mainMenu?: MainMenuLayout | undefined;
}

/** customTexts: your texts in the default language, see src/app/texts/index.ts */
export type BotOptions = BotSettings & CustomTextsOption;

/** handles the reply to ctx.ui.ask(): the whole text of the next message */
export type AnswerHandler = (ctx: BotContext, text: string) => unknown;

/** shared services every feature gets from app.use() */
export interface BotKit {
  readonly bot: Bot<BotContext>;
  readonly options: Readonly<BotOptions>;
  readonly locales: Locales;
  readonly logger: BotLogger;
  /** here features can put their initial session values at install time */
  readonly sessionDefaults: Partial<SessionData>;
  /** the commands of a feature go here too: /help and the hints of telegram are built from it */
  readonly commands: Commands;
  /** the buttons of the features, placed by the mainMenu option */
  readonly mainMenu: MainMenu;
  resetSession(ctx: BotContext): void;
  /** drops the steps, the question and the menu message. the language and the folder stay */
  resetDialog(ctx: BotContext): void;
}

export type Feature = (kit: BotKit) => Middleware<BotContext>;

export interface BotApp {
  /** grammY bot itself: your own middleware and handlers, commands go to app.command() */
  readonly bot: Bot<BotContext>;
  use(feature: Feature): BotApp;
  /**
   * a command shown in /help and in the hints of telegram, in the user's language.
   * undefined description: the command works, but isn't shown
   * ---  app.command("status", (t) => t.status.command, (ctx) => ctx.ui.text(ctx.t.status.ok))
   */
  command(
    name: string,
    description: CommandDescription | undefined,
    handler: CommandMiddleware<BotContext>,
  ): BotApp;
  /** handles the replies to ctx.ui.ask(text, id) */
  onAnswer(id: string, handler: AnswerHandler): BotApp;
  /** sends the commands to telegram and starts long polling, resolves when the bot stops */
  start(): Promise<void>;
}

// creates a bot with session, admin-only access and error handling
// !!! it answers nothing until you add features with app.use()
export function createBot(options: BotOptions): BotApp {
  const logger = new BotLogger(options.logPath ?? "logs");
  const defaultLang = options.defaultLang ?? "en";
  const locales = new Locales({
    fallback: defaultLang,
    overrides: options.texts,
    custom: options.customTexts,
    warn: (message) => logger.warn(message),
  });
  const commands = new Commands();
  const mainMenu = new MainMenu(locales, options.websiteName, options.mainMenu);
  const answers = new Map<string, AnswerHandler>();
  const bot = new Bot<BotContext>(
    options.token,
    buildBotProxyConfig(options.proxyUrl),
  );

  const sessionDefaults: Partial<SessionData> = {};
  // called lazily on the first update of each chat,
  // so it sees the defaults of features added after createBot()
  const initialSession = (): SessionData => ({
    lang: defaultLang,
    dialogStep: DialogStep.Idle,
    currentDir: "",
    chosenPath: "",
    lastMenuMessageId: 0,
    pathRefs: {},
    ...sessionDefaults,
  });

  const resetSession = (ctx: BotContext) => {
    Object.assign(ctx.session, initialSession());
  };

  const resetDialog = (ctx: BotContext) => {
    const s = ctx.session;
    s.dialogStep = DialogStep.Idle;
    s.lastMenuMessageId = 0;
    s.chosenPath = "";
    s.textFile = undefined;
    s.awaitingAnswer = undefined;
  };

  // ctx.t follows ctx.session.lang, so a language change applies at once.
  // strangers and errors before the session get the default language
  bot.use((ctx, next) => {
    Object.defineProperty(ctx, "t", {
      get: () => locales.get(sessionLang(ctx)),
      configurable: true,
    });
    Object.defineProperty(ctx, "ui", {
      value: new ContextUi(ctx, (id) => answers.has(id)),
      configurable: true,
    });
    return next();
  });

  // !!! every button press must be answered, otherwise telegram shows
  // a spinner on the button until timeout. handlers answer themselves,
  // this answers the rest: errors, denied access, forgotten answers
  bot.use(async (ctx, next) => {
    if (!ctx.callbackQuery) return next();

    let answered = false;
    const answer = ctx.answerCallbackQuery.bind(ctx);
    ctx.answerCallbackQuery = (...args: Parameters<typeof answer>) => {
      answered = true;
      return answer(...args);
    };

    try {
      await next();
    } finally {
      if (!answered) await answer().catch(() => {});
    }
  });

  // !!! access is checked strictly before the session,
  // so strangers don't get session files
  bot.use(async (ctx, next) => {
    // !!! the admin panel works strictly in private chats:
    // in groups every member would see the files the bot shows
    if (ctx.chat?.type !== "private") return;

    const userId = ctx.from?.id;
    if (userId === undefined) return;

    // the user, not the chat: it's the person who is checked
    if (!options.admins.includes(userId)) {
      if (ctx.chat) await ctx.ui.text(ctx.t.errors.accessDenied);
      logger.error("Log in attempt failed" + logger.getDetails(ctx));
      return;
    }

    await next();
  });

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
    await next();
  });

  bot.catch(async (err) => {
    logger.error(err.message + logger.getDetails(err.ctx));
    // the error may happen before the session or while answering,
    // so the user is notified strictly on a best-effort basis
    try {
      resetSession(err.ctx);
      await err.ctx.ui.text(err.ctx.t.errors.unexpected);
    } catch {}
  });

  // the reply to ctx.ui.ask(). a command or a button press means
  // the user went elsewhere: the question is dropped
  bot.use(async (ctx, next) => {
    const answer = ctx.session.awaitingAnswer;
    if (answer === undefined) return next();

    const text = ctx.message?.text;
    const isCommand = ctx.message?.entities?.some(
      (e) => e.type === "bot_command" && e.offset === 0,
    );
    if (ctx.callbackQuery || isCommand) {
      ctx.session.awaitingAnswer = undefined;
      return next();
    }
    // a file or a sticker: still waiting for the text
    if (text === undefined) return next();

    // dropped before the handler: it may ask again
    ctx.session.awaitingAnswer = undefined;
    const handler = answers.get(answer);
    // a session from a version that had this question
    if (!handler) return next();
    await handler(ctx, text);
  });

  bot.command("start", async (ctx) => {
    resetDialog(ctx);
    await mainMenu.show(ctx);
  });
  commands.add("start", (t) => t.commands.start);

  bot.command("help", (ctx) => ctx.ui.text(commands.help(ctx.t)));
  commands.add("help", (t) => t.commands.help);

  bot.callbackQuery(/^lang=(.+)$/, async (ctx) => {
    const lang = ctx.match[1]!;
    // an old button of a language removed from the texts
    if (!locales.has(lang)) {
      logger.error("Unknown language: " + lang + logger.getDetails(ctx));
      return;
    }
    await ctx.answerCallbackQuery();
    ctx.session.lang = lang;
    await mainMenu.show(ctx);
  });

  // the commands of app.command(): before the features,
  // so a catch-all handler of a feature never takes them
  const own = new Composer<BotContext>();
  bot.use(own);

  const kit: BotKit = {
    bot,
    options,
    locales,
    logger,
    sessionDefaults,
    commands,
    mainMenu,
    resetSession,
    resetDialog,
  };

  const app: BotApp = {
    bot,
    use(feature) {
      bot.use(feature(kit));
      return app;
    },
    command(name, description, handler) {
      commands.add(name, description);
      own.command(name, handler);
      return app;
    },
    onAnswer(id, handler) {
      if (answers.has(id)) throw new Error(`Answer "${id}" is added twice`);
      answers.set(id, handler);
      return app;
    },
    async start() {
      mainMenu.check();
      await commands.publish(bot.api, locales, defaultLang, (message) =>
        logger.warn(message),
      );
      // lets `docker stop` shut the bot down gracefully instead of killing it
      process.once("SIGINT", () => bot.stop());
      process.once("SIGTERM", () => bot.stop());
      await bot.start();
    },
  };

  return app;
}

// the session doesn't exist before its middleware and may throw after it
function sessionLang(ctx: BotContext): string | undefined {
  try {
    return ctx.session?.lang;
  } catch {
    return undefined;
  }
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
