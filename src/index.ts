import { BotService } from "./BotService/BotService.js";
import { getEnv } from "./BotService/utils/env_auth.js";

function main() {
  const token = getEnv("BOT_TOKEN", true);
  const proxyUrl = getEnv("PROXY_URL");

  const bot = new BotService(token, proxyUrl);
  bot.start();
}

main();
