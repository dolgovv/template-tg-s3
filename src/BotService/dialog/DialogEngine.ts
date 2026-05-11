import type { botLanguage } from "../utils/types.js";
import { MessageFactory, type BotMessage } from "./messages/MessageFactory.js";
import { textTranslates, menusTranslates } from "./messages/strings.js";

export class DialogEngine {
  private factory: MessageFactory = new MessageFactory();

  buildWelcome(
    lang: botLanguage,
    name: string,
    websiteName: string,
  ): BotMessage {
    const t = textTranslates[lang];
    const m = menusTranslates[lang] ?? {};
    return this.factory.text(t.greetUser(name, websiteName), m.welcome);
  }

  buildLanguageChanged(lang: botLanguage): BotMessage {
    const t = textTranslates[lang];
    const m = menusTranslates[lang] ?? {};
    return this.factory.text(t.langChanged, m.langChanged);
  }

  buildHelp(lang: botLanguage): BotMessage {
    const t = textTranslates[lang];
    const m = menusTranslates[lang] ?? {};
    return this.factory.text(t.help, m.help);
  }

  anonName(lang: botLanguage): string {
    return textTranslates[lang].anonName;
  }

  notAdmin(lang: botLanguage): string {
    return textTranslates[lang].notAdmin;
  }

  yourId(lang: botLanguage, chatId?: number): string {
    return textTranslates[lang].yourId(chatId ?? 0);
  }
}
