import type { Locales } from "../texts/locales.js";
import type { Texts } from "../texts/schema.js";
import type { BotContext, Button, Buttons } from "../types.js";
import { chunk } from "./compose.js";

/** a button of the main menu: the id of a feature's button, "languages" or your own button */
export type MainMenuEntry = string | ((t: Texts) => Button);
/** rows top to bottom. "languages" alone in its row: every language, two per row */
export type MainMenuLayout = readonly (readonly MainMenuEntry[])[];

const LANGUAGES = "languages";

// the greeting of /start: the language buttons and the buttons of the features
export class MainMenu {
  private readonly buttons = new Map<string, (t: Texts) => Button>();

  constructor(
    private locales: Locales,
    private websiteName: string,
    // undefined: the languages, then the buttons of the features one per row
    private layout: MainMenuLayout | undefined,
  ) {}

  // a feature adds its button by id, the layout decides where it goes
  add(id: string, button: (t: Texts) => Button) {
    if (id === LANGUAGES || this.buttons.has(id)) {
      throw new Error(`Main menu: the button "${id}" is added twice`);
    }
    this.buttons.set(id, button);
  }

  // !!! called at start: a typo in the layout is found before anyone opens the menu
  check() {
    const known = [LANGUAGES, ...this.buttons.keys()];
    for (const entry of this.layout?.flat() ?? []) {
      if (typeof entry === "string" && !known.includes(entry)) {
        throw new Error(
          `Main menu: unknown button "${entry}". Known: ${known.join(", ")}`,
        );
      }
    }
  }

  async show(ctx: BotContext) {
    const t = ctx.t;
    const text = t.common.greet({
      name: ctx.chat?.first_name ?? t.common.anonName,
      site: this.websiteName,
    });
    await ctx.ui.menu(text, this.rows(ctx));
  }

  private rows(ctx: BotContext): Buttons {
    const layout = this.layout ?? [
      [LANGUAGES],
      ...[...this.buttons.keys()].map((id) => [id]),
    ];
    const rows: Buttons = [];
    for (const row of layout) {
      if (row.length === 1 && row[0] === LANGUAGES) {
        rows.push(...chunk(this.languageButtons(ctx), 2));
      } else {
        rows.push(row.flatMap((entry) => this.resolve(entry, ctx)));
      }
    }
    return rows;
  }

  private resolve(entry: MainMenuEntry, ctx: BotContext): Button[] {
    if (typeof entry === "function") return [entry(ctx.t)];
    if (entry === LANGUAGES) return this.languageButtons(ctx);
    const button = this.buttons.get(entry);
    return button ? [button(ctx.t)] : [];
  }

  // the current language goes first
  private languageButtons(ctx: BotContext): Button[] {
    const current = ctx.session.lang;
    const languages = [...this.locales.languages].sort(
      (a, b) => Number(b === current) - Number(a === current),
    );
    return languages.map((lang) => ({
      text: this.locales.get(lang).meta.name,
      call: "lang=" + lang,
    }));
  }
}
