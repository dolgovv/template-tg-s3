import { BotService } from "./BotService/BotService.js";
import { loadConfig } from "./BotService/utils/env_auth.js";

function main() {
  const config = loadConfig();
  const bot = new BotService(config);
  bot.start();
}

main();
