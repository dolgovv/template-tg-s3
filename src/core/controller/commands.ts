import type { Api } from "grammy";
import type { BotCommand, LanguageCode } from "grammy/types";
import type { Locales } from "../texts/locales.js";
import type { Texts } from "../texts/schema.js";
import { escapeHtml } from "../dialog/html.js";
import { lines } from "../dialog/compose.js";

/** the description of a command in the user's language: plain text without HTML */
export type CommandDescription = (t: Texts) => string;
/** a part of /help above the list of commands: HTML */
export type HelpSection = (t: Texts) => string;

// telegram: 1-32 characters, lowercase latin letters, digits and underscores
const NAME = /^[a-z0-9_]{1,32}$/;
// telegram: a description is 1-256 characters
const MAX_DESCRIPTION = 256;
// telegram: the language of the hints is a two-letter ISO 639-1 code
const LANGUAGE_CODE = /^[a-z]{2}$/;

// every command of the bot in one place: /help and the hints of telegram
// next to the input field are built from it
export class Commands {
  private readonly commands = new Map<string, CommandDescription | undefined>();
  private readonly sections: HelpSection[] = [];

  // a command without a description works, but /help and the hints don't show it
  add(name: string, description?: CommandDescription) {
    if (!NAME.test(name)) {
      throw new Error(
        `Command /${name}: strictly 1-32 lowercase latin letters, digits and _`,
      );
    }
    if (this.commands.has(name)) {
      throw new Error(`Command /${name} is added twice`);
    }
    this.commands.set(name, description);
  }

  addHelp(section: HelpSection) {
    this.sections.push(section);
  }

  // in the order they were added, /help is the last one
  list(t: Texts): BotCommand[] {
    const list: BotCommand[] = [];
    for (const [command, describe] of this.commands) {
      if (describe) list.push({ command, description: describe(t) });
    }
    return list.sort(
      (a, b) => Number(a.command === "help") - Number(b.command === "help"),
    );
  }

  help(t: Texts): string {
    const commands = this.list(t).map(
      (c) => `/${c.command} ${escapeHtml(c.description)}`,
    );
    return [
      ...this.sections.map((section) => section(t)),
      lines(t.help.commandsTitle, ...commands),
    ].join("\n\n");
  }

  // the hints of telegram: a list for each language of the texts,
  // the default language for the users of other languages.
  // !!! telegram picks it by the language of the user's app, not of the bot
  async publish(
    api: Api,
    locales: Locales,
    defaultLang: string,
    warn: (message: string) => void,
  ) {
    const targets = [undefined, ...locales.languages];
    for (const code of targets) {
      if (code !== undefined && !LANGUAGE_CODE.test(code)) {
        warn(`Commands: "${code}" is not a two-letter language code, no hints for it`);
        continue;
      }
      const commands = this.list(locales.get(code ?? defaultLang))
        .filter((c) => c.description.trim() !== "")
        .map((c) => ({
          command: c.command,
          description: c.description.slice(0, MAX_DESCRIPTION),
        }));
      try {
        await api.setMyCommands(commands, {
          scope: { type: "all_private_chats" },
          ...(code !== undefined && { language_code: code as LanguageCode }),
        });
      } catch (err) {
        warn(`Commands for "${code ?? "default"}" were not sent to telegram: ${err}`);
      }
    }
  }
}
