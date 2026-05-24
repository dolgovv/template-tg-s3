import type { BotContext } from "../BotService.js";
import type { MenuButton } from "../utils/types.js";
import type { botLanguage } from "../utils/types.js";
import { MessageFactory } from "./messages/MessageFactory.js";
import { textTranslates, menusTranslates } from "./messages/strings.js";
import { ReplyResolver } from "./ReplyResolver.js";

export class DialogEngine {
  private factory: MessageFactory = new MessageFactory();
  private resolver: ReplyResolver = new ReplyResolver();

  async sendWelcome(
    lang: botLanguage,
    name: string | undefined,
    websiteName: string,
    ctx: BotContext,
  ) {
    const t = textTranslates[lang];
    const m = menusTranslates[lang] ?? {};
    const reply = this.factory.text(
      t.greetUser(name ?? t.anonName, websiteName),
      m.welcome,
    );
    await this.resolver.reply(ctx, reply);
  }

  async sendImg(image: Buffer, ctx: BotContext, caption?: string) {
    const reply = this.factory.photo(image, caption);
    await this.resolver.reply(ctx, reply);
  }

  async sendImgs(images: Buffer[], ctx: BotContext, caption?: string) {
    const reply = this.factory.mediaGroup(images, caption);
    await this.resolver.reply(ctx, reply);
  }

  async sendTextFile(
    lang: botLanguage,
    path: string,
    text: string,
    ctx: BotContext,
  ) {
    const t = textTranslates[lang];
    const reply = this.factory.text(
      t.fileContent(path) + "<pre>" + text + "</pre>",
    );
    await this.resolver.reply(ctx, reply);
  }

  async sendLanguageChanged(lang: botLanguage, ctx: BotContext) {
    const t = textTranslates[lang];
    const m = menusTranslates[lang] ?? {};
    const reply = this.factory.text(t.langChanged, m.langChanged);
    await this.resolver.reply(ctx, reply);
  }

  leafInPath(path: string) {
    const normalizedPath = path.endsWith("/") ? path.slice(0, -1) : path;
    const lastSlashIndex = normalizedPath.lastIndexOf("/");
    if (lastSlashIndex === -1) {
      return path;
    } else {
      const result = path.slice(lastSlashIndex + 1);
      console.log("last child in ", path, "is :", result);
      return result;
    }
  }

  async sendDirChanged(lang: botLanguage, newDir: string, ctx: BotContext) {
    const t = textTranslates[lang];
    const reply = this.factory.text(t.dirChanged + newDir);
    await this.resolver.reply(ctx, reply);
  }

  async sendHelp(lang: botLanguage, ctx: BotContext) {
    const t = textTranslates[lang];
    const m = menusTranslates[lang] ?? {};
    const reply = this.factory.text(t.help, m.help);
    await this.resolver.reply(ctx, reply);
  }

  async sendNavigationMenu(
    lang: botLanguage,
    content: string[],
    buttons: MenuButton[],
    ctx: BotContext,
  ) {
    const t = textTranslates[lang];

    if (!content.length) {
      const reply = this.factory.menu(t.dirListEmpty, buttons);

      await this.resolver.reply(ctx, reply);
    } else {
      const list = content
        .map((c, i) => {
          const symbol = c.endsWith(">") ? "📁" : "📄";
          console.log("is ", c, "ends with '>' ? :", symbol);
          return `${symbol} ${i + 1}) ${c}`;
        })
        .join("\n");
      const reply = this.factory.menu(list, buttons);

      await this.resolver.reply(ctx, reply);
    }
  }

  async sendError(lang: botLanguage, description: string, ctx: BotContext) {
    const reply = this.factory.text(
      `${textTranslates[lang].error} ${description}`,
    );
    await this.resolver.reply(ctx, reply);
  }

  async sendButtonEchoReply(lang: botLanguage, text: string, ctx: BotContext) {
    const t = textTranslates[lang];
    const reply = this.factory.text(t.buttonEchoReply, [
      { text: text, call: `echo:${text}` },
    ]);
    await this.resolver.reply(ctx, reply);
  }

  async sendAuthError(lang: botLanguage, ctx: BotContext) {
    const reply = this.factory.text(textTranslates[lang].notAdmin);
    await this.resolver.reply(ctx, reply);
  }

  shrinkPath(path: string): string {
    let result = this.leafInPath(path);

    if (result.length > 20) {
      result = result.substring(0, 17).concat(".../");
    }

    if (result[0] === "/") {
      result = result.slice(1, result.length);
    }

    return result;
  }
}
