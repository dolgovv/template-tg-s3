import "dotenv/config";
import {
  configFromEnv,
  createBot,
  fileManager,
  s3Storage,
} from "../core/index.js";
import { texts } from "./texts/index.js";

const config = configFromEnv();

// here you can override anything within the config just like this:
// ---  createBot({ ...config.bot, defaultLang: "ru" })

// fields to override:
// token, admins, websiteName, proxyUrl, logPath, sessionsDir, defaultLang, texts

const app = createBot({
  ...config.bot,
  texts,
});

// here you can make your own commands just like this:
// app.bot.command("ping", (ctx) => ctx.reply("pong"));
// !!! do it strictly before the app.use(fileManager({}))

app.use(
  fileManager({
    storage: s3Storage(config.s3),
    ...config.fileManager,
  }),
);

await app.start();
