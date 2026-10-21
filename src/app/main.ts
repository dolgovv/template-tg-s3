import "dotenv/config";
import {
  configFromEnv,
  createBot,
  fileManager,
  s3Storage,
} from "../core/index.js";
import { customTexts, texts } from "./texts/index.js";

const config = configFromEnv();

// here you can override anything within the config just like this:
// ---  createBot({ ...config.bot, defaultLang: "ru" })

// fields to override:
// token, admins, websiteName, proxyUrl, logPath, sessionsDir, defaultLang, texts, mainMenu

const app = createBot({
  ...config.bot,
  texts,
  customTexts,
});

// here you can make your own commands just like this, texts from src/app/texts:
// ---  app.command("status", (t) => t.status.command, (ctx) => ctx.ui.text(ctx.t.status.ok));
// it shows up in /help and in the hints of telegram by itself, see docs/adding-commands.md
// !!! text handlers of grammY itself (app.bot.on("message:text"), app.bot.hears) go
// strictly before app.use(fileManager()): it answers any unrecognized text with help

// here you can arrange the main menu and add your own buttons just like this:
// ---  createBot({ ...config.bot, mainMenu: [["navigation"], ["languages"]] })

app.use(
  fileManager({
    storage: s3Storage(config.s3),
    ...config.fileManager,
  }),
);

await app.start();
