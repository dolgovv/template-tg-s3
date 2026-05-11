import type { botLanguage, mText } from "../utils/types.js";
import { MessageFactory, type BotMessage } from "./messages/MessageFactory.js";
import { textTranslates, menusTranslates } from "./messages/strings.js";

export class DialogEngine {
  private lang: botLanguage = "ru";
  private factory: MessageFactory = new MessageFactory();

  setLanguage(newLanguage: botLanguage) {
    this.lang = newLanguage;
  }

  getLanguage(): botLanguage {
    return this.lang;
  }

  buildWelcome(name: string, websiteName: string): BotMessage {
    const t = textTranslates[this.lang];
    const m = menusTranslates[this.lang];
    return this.factory.text(t.greetUser(name, websiteName), m.welcome);
  }

  buildLanguageChanged(): BotMessage {
    const t = textTranslates[this.lang];
    const m = menusTranslates[this.lang];
    return this.factory.text(t.langChanged, m.langChanged);
  }

  buildHelp(): BotMessage {
    const t = textTranslates[this.lang];
    const m = menusTranslates[this.lang];
    return this.factory.text(t.help, m.help);
  }

  anonName(): string {
    return textTranslates[this.lang].anonName;
  }

  notAdmin(): string {
    return textTranslates[this.lang].notAdmin;
  }

  yourId(chatId?: number): string {
    return textTranslates[this.lang].yourId(chatId || 0);
  }
}
