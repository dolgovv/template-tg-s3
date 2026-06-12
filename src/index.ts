import { loadConfig } from "./bot_config.js";
import { BotService } from "./BotService/BotService.js";

function main() {
  const config = loadConfig();
  const bot = new BotService(config);
  bot.start();
}

main();
