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

  buildTextFile(text: string): BotMessage {
    return this.factory.text(text);
  }

  buildImg(image: Buffer, caption?: string): BotMessage {
    return this.factory.photo(image, caption);
  }

  buildImgs(images: Buffer[], caption?: string): BotMessage {
    return this.factory.mediaGroup(images, caption);
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

  buildDirList(lang: botLanguage, dirs: string[]): BotMessage {
    const t = textTranslates[lang];
    if (dirs.length === 0) {
      return this.factory.text(t.dirListEmpty);
    }
    const list = dirs.map((d) => `• ${d}`).join("\n");
    return this.factory.text(list);
  }

  buildError(lang: botLanguage, description: string): BotMessage {
    return this.factory.text(`${textTranslates[lang].error} ${description}`);
  }

  buildButtonEchoReply(lang: botLanguage, text: string): BotMessage {
    const t = textTranslates[lang];
    return this.factory.text(t.buttonEchoReply, [
      { text: text, call: `echo:${text}` },
    ]);
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
