import type { Bot } from "grammy";
import { CommandHandler } from "./handlers/CommandHandler.js";
import { ButtonHandler } from "./handlers/ButtonHandler.js";
import type { IBotModel } from "./IBotModel.js";
import { TextHandler } from "./handlers/TextHandler.js";
import { MediaHandler } from "./handlers/MediaHandler.js";
import type { BotContext } from "../utils/types.js";

export class BotRouter {
  private commands: CommandHandler;
  private buttons: ButtonHandler;
  private texts: TextHandler;
  private media: MediaHandler;

  constructor(bot: Bot<BotContext>, model: IBotModel) {
    this.commands = new CommandHandler(bot, model);
    this.buttons = new ButtonHandler(bot, model);
    this.texts = new TextHandler(bot, model);
    this.media = new MediaHandler(bot, model);
  }
}
