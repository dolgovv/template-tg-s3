import { en } from "./en.js";
import { ru } from "./ru.js";
import { format, placeholdersOf, type Param } from "./format.js";
import type { PluralForm, Texts, TextsOverrides } from "./schema.js";

type Tree = { readonly [key: string]: unknown };
type Params = Readonly<Record<string, Param>>;

const BUILT_IN: Readonly<Record<string, Tree>> = { en, ru };
// the shape and the placeholders of every text are taken from it
const REFERENCE = "en";
// how many keys a warning lists before "and N more"
const WARN_KEYS = 5;

export interface LocalesOptions {
  /** the language of missing texts. it must be one of the languages */
  fallback: string;
  overrides?: TextsOverrides | undefined;
  /** the texts of app/ in the fallback language: their keys and placeholders are the reference.
   * any value: the type of CustomTexts can't promise a tree, so it is checked here */
  custom?: unknown;
  warn: (message: string) => void;
}

// all languages compiled once at startup:
// a text without placeholders -> string, with them -> (params) => string
export class Locales {
  readonly languages: readonly string[];
  private readonly fallback: string;
  private readonly compiled = new Map<string, Texts>();

  constructor(options: LocalesOptions) {
    const overrides = options.overrides ?? {};
    this.languages = [
      ...new Set([...Object.keys(BUILT_IN), ...Object.keys(overrides)]),
    ];
    this.fallback = options.fallback;
    if (!this.languages.includes(this.fallback)) {
      throw new Error(
        `Unknown language "${this.fallback}". Known: ${this.languages.join(", ")}`,
      );
    }

    const custom = checkCustom(options.custom ?? {});

    // the built-in text, the own one, then its override
    const sources = (lang: string) => [
      BUILT_IN[lang],
      lang === this.fallback ? custom : undefined,
      overrides[lang] as Tree | undefined,
    ];
    // !!! strictly the built-in and the own texts: an override can't break the shape
    const shape: Tree = { ...BUILT_IN[REFERENCE]!, ...custom };

    for (const lang of this.languages) {
      // every text is taken from the last tree that has a valid one,
      // so a broken override falls back to the built-in text first
      const chain = [shape, ...sources(this.fallback), ...sources(lang)];
      const report: Report = { missing: [], invalid: [], unknown: [] };
      const texts = compileTree(shape, chain, pluralRules(lang), "", report);

      // a new language without a name would get the name of the fallback one
      const ownName = sources(lang).some(
        (tree) => typeof (tree?.meta as Tree | undefined)?.name === "string",
      );
      if (!ownName) (texts.meta as { name: string }).name = lang;
      if (overrides[lang]) {
        findUnknown(shape, overrides[lang] as Tree, "", report.unknown);
      }
      this.warn(lang, report, options.warn);
      this.compiled.set(lang, texts as unknown as Texts);
    }
  }

  has(lang: string): boolean {
    return this.compiled.has(lang);
  }

  // a language removed from the texts falls back too, so old sessions keep working
  get(lang: string | undefined): Texts {
    return (
      (lang !== undefined && this.compiled.get(lang)) ||
      this.compiled.get(this.fallback)!
    );
  }

  private warn(lang: string, report: Report, warn: (msg: string) => void) {
    const keys = (paths: string[]) =>
      paths.slice(0, WARN_KEYS).join(", ") +
      (paths.length > WARN_KEYS ? ` and ${paths.length - WARN_KEYS} more` : "");

    if (report.missing.length) {
      warn(
        `Texts "${lang}": ${report.missing.length} missing, "${this.fallback}" texts are used instead: ${keys(report.missing)}`,
      );
    }
    if (report.invalid.length) {
      warn(
        `Texts "${lang}": wrong type or unknown {placeholder}, ignored: ${keys(report.invalid)}`,
      );
    }
    if (report.unknown.length) {
      warn(`Texts "${lang}": unknown keys are ignored: ${keys(report.unknown)}`);
    }
  }
}

type Report = { missing: string[]; invalid: string[]; unknown: string[] };

function compileTree(
  shape: Tree,
  chain: (Tree | undefined)[],
  rules: Intl.PluralRules,
  path: string,
  report: Report,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};

  for (const [key, ref] of Object.entries(shape)) {
    const here = path ? path + "." + key : key;
    const values = chain.map((tree) => tree?.[key]);

    if (typeof ref === "string") {
      const allowed = placeholdersOf(ref);
      const template = pick(values, here, report, (v) =>
        typeof v === "string" && fits(v, allowed) ? v : undefined,
      );
      out[key] =
        allowed.size === 0
          ? template
          : (params: Params) => format(template, params);
    } else if (isPlural(ref)) {
      const allowed = new Set(["count"]);
      for (const form of Object.values(ref)) {
        for (const p of placeholdersOf(String(form))) allowed.add(p);
      }
      const forms = pick(values, here, report, (v) =>
        isPlural(v) &&
        Object.values(v).every((f) => typeof f === "string" && fits(f, allowed))
          ? (v as Record<string, string>)
          : undefined,
      );
      out[key] = (params: Params & { count: number }) =>
        format(
          forms[rules.select(params.count) as PluralForm] ?? forms.other!,
          params,
        );
    } else {
      out[key] = compileTree(
        ref as Tree,
        values.map((v) => (isObject(v) ? v : undefined)),
        rules,
        here,
        report,
      );
    }
  }
  return out;
}

// how many trees at the end of the chain belong to the language itself
const OWN_SOURCES = 3;

// the last valid value of the chain. strictly the language's own values are reported:
// the fallback ones are reported when their own language is compiled
function pick<T>(
  values: unknown[],
  path: string,
  report: Report,
  valid: (value: unknown) => T | undefined,
): T {
  const own = values.slice(-OWN_SOURCES).filter((v) => v !== undefined);
  if (own.length === 0) report.missing.push(path);
  else if (own.some((v) => valid(v) === undefined)) report.invalid.push(path);

  for (let i = values.length - 1; i >= 0; i--) {
    const value = valid(values[i]);
    if (value !== undefined) return value;
  }
  // the reference itself is always valid
  throw new Error(`Texts: no valid value for ${path}`);
}

// a translation can't use a parameter the code doesn't pass
function fits(template: string, allowed: Set<string>): boolean {
  for (const p of placeholdersOf(template)) if (!allowed.has(p)) return false;
  return true;
}

// the own texts are the reference for their keys, so they must be valid.
// !!! a mistake here is in the code, not in a translation: the bot doesn't start
function checkCustom(custom: unknown): Tree {
  if (!isObject(custom)) throw new Error("Custom texts must be an object");
  for (const key of Object.keys(custom)) {
    if (key in BUILT_IN[REFERENCE]!) {
      throw new Error(
        `Custom texts: "${key}" is a built-in section, choose another name`,
      );
    }
  }
  const walk = (tree: Tree, path: string) => {
    for (const [key, value] of Object.entries(tree)) {
      const here = path ? path + "." + key : key;
      if (typeof value === "string") continue;
      if (!isObject(value)) {
        throw new Error(`Custom texts: ${here} must be a string or a section`);
      }
      walk(value, here);
    }
  };
  walk(custom, "");
  return custom;
}

function findUnknown(shape: Tree, tree: Tree, path: string, out: string[]) {
  for (const [key, value] of Object.entries(tree)) {
    const here = path ? path + "." + key : key;
    const ref = shape[key];
    if (ref === undefined) out.push(here);
    else if (isObject(ref) && !isPlural(ref) && isObject(value)) {
      findUnknown(ref, value, here, out);
    }
  }
}

function isObject(value: unknown): value is Tree {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isPlural(value: unknown): value is Tree & { other: string } {
  return isObject(value) && typeof value.other === "string";
}

// an unknown language code makes Intl throw, english rules are close enough then
function pluralRules(lang: string): Intl.PluralRules {
  try {
    return new Intl.PluralRules(lang);
  } catch {
    return new Intl.PluralRules("en");
  }
}
