import type { Bot } from "grammy";
import { CommandHandler } from "../dialog/handlers/CommandHandler.js";
import type { BotContext } from "../BotService.js";
import { ButtonHandler } from "../dialog/handlers/ButtonHandler.js";
import type { BotModel } from "../domain/BotModel.js";
import { TextHandler } from "../dialog/handlers/TextHandler.js";
import { MediaHandler } from "../dialog/handlers/MediaHandler.js";

export class BotRouter {
  private commands: CommandHandler;
  private buttons: ButtonHandler;
  private texts: TextHandler;
  private media: MediaHandler;

  constructor(bot: Bot<BotContext>, model: BotModel) {
    this.commands = new CommandHandler(bot, model);
    this.buttons = new ButtonHandler(bot, model);
    this.texts = new TextHandler(bot, model);
    this.media = new MediaHandler(bot, model);
  }
}
