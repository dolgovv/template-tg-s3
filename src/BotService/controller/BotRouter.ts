import type { Bot } from "grammy";
import type { IBotModel } from "./IBotModel.js";
import type { BotContext } from "../utils/types.js";
import * as Handlers from "./handlers/handlers.js";

export class BotRouter {
  private commands: Handlers.CommandHandler;
  private buttons: Handlers.ButtonHandler;
  private texts: Handlers.TextHandler;
  private media: Handlers.MediaHandler;

  constructor(bot: Bot<BotContext>, model: IBotModel) {
    this.commands = new Handlers.CommandHandler(bot, model);
    this.buttons = new Handlers.ButtonHandler(bot, model);
    this.texts = new Handlers.TextHandler(bot, model);
    this.media = new Handlers.MediaHandler(bot, model);
  }
}
