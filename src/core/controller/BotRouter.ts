import type { Composer } from "grammy";
import type { BotContext } from "../types.js";
import * as Handlers from "./handlers/handlers.js";
import type { IBotModel } from "../IBotModel.js";

export class BotRouter {
  private commands: Handlers.CommandHandler;
  private buttons: Handlers.ButtonHandler;
  private texts: Handlers.TextHandler;
  private media: Handlers.MediaHandler;

  constructor(composer: Composer<BotContext>, model: IBotModel) {
    this.commands = new Handlers.CommandHandler(composer, model);
    this.buttons = new Handlers.ButtonHandler(composer, model);
    this.texts = new Handlers.TextHandler(composer, model);
    this.media = new Handlers.MediaHandler(composer, model);
  }
}
