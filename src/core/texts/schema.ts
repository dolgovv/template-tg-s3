import type { Param } from "./format.js";
import type { en } from "./en.js";

// the built-in english texts are the reference: every language has the same
// keys, and the placeholders of an english text are the parameters of its function

export type PluralForm = "zero" | "one" | "two" | "few" | "many" | "other";

// a text that depends on {count}: the form is chosen by Intl.PluralRules,
// a missing form falls back to "other"
// !!! so the key "other" is reserved: a section can't have it
export type PluralSource = { readonly other: string } & {
  readonly [F in Exclude<PluralForm, "other">]?: string;
};

type BuiltIn = typeof en;

/**
 * your own texts for the code of app/, see src/app/texts/index.ts.
 * filled in by module augmentation just like this:
 * ---  declare module "../../core/index.js" { interface CustomTexts extends AppTexts {} }
 */
export interface CustomTexts {}

type Shape = BuiltIn & CustomTexts;

// a tree of texts: sections, strings and texts by {count}
export type TextTree = { readonly [key: string]: string | TextTree };

// keeps the exact strings, so the {placeholders} become the parameters of ctx.t
export function defineTexts<const T extends TextTree>(texts: T): T {
  return texts;
}

// true if some text is just `string`: its {placeholders} are unknown then
type HasWideStrings<T> = T extends string
  ? string extends T
    ? true
    : false
  : true extends { [K in keyof T]: HasWideStrings<T[K]> }[keyof T]
    ? true
    : false;

// required as soon as CustomTexts has keys: they must exist in the default language
export type CustomTextsOption = keyof CustomTexts extends never
  ? { customTexts?: CustomTexts | undefined }
  : {
      /** your texts in the default language, every key of CustomTexts */
      customTexts: HasWideStrings<CustomTexts> extends true
        ? "Wrap your texts in defineTexts(), otherwise their {placeholders} are lost"
        : CustomTexts & { readonly [K in keyof BuiltIn]?: never };
    };

// what a translation looks like: the same tree, any strings
export type LocaleSource<T = BuiltIn> = {
  readonly [K in keyof T]: T[K] extends string
    ? string
    : T[K] extends { other: string }
      ? PluralSource
      : LocaleSource<T[K]>;
};

export type DeepPartial<T> = {
  readonly [K in keyof T]?: T[K] extends string ? T[K] : DeepPartial<T[K]>;
};

// overrides by language code: strictly the texts that differ, your own ones too.
// a new language takes the missing texts from the fallback one
export type TextsOverrides = Readonly<
  Record<string, DeepPartial<LocaleSource<Shape>>>
>;

// "{name} and {site}" -> "name" | "site"
type Placeholders<S> = S extends `${string}{${infer P}}${infer Rest}`
  ? P | Placeholders<Rest>
  : never;

type Compile<T> = T extends string
  ? [Placeholders<T>] extends [never]
    ? string
    : (params: Readonly<Record<Placeholders<T>, Param>>) => string
  : T extends { other: string }
    ? (
        params: Readonly<
          { count: number } & Record<
            Exclude<Placeholders<T[keyof T]>, "count">,
            Param
          >
        >,
      ) => string
    : { readonly [K in keyof T]: Compile<T[K]> };

// ctx.t: a text without placeholders is a string, with them a function
export type Texts = Compile<Shape>;
