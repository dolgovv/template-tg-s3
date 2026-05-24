import type { Bot } from "grammy";
import { CommandHandler } from "../dialog/handlers/CommandHandler.js";
import type { BotContext } from "../BotService.js";
import { ButtonHandler } from "../dialog/handlers/ButtonHandler.js";
import type { BotModel } from "../domain/BotModel.js";
import { TextHandler } from "../dialog/handlers/TextHandler.js";

export class BotRouter {
  private commands: CommandHandler;
  private buttons: ButtonHandler;
  private texts: TextHandler;

  constructor(bot: Bot<BotContext>, model: BotModel) {
    this.commands = new CommandHandler(bot, model);
    this.buttons = new ButtonHandler(bot, model);
    this.texts = new TextHandler(bot, model);
  }
}
