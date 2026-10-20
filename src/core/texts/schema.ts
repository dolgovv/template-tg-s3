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

type Shape = typeof en;

// what a translation looks like: the same tree, any strings
export type LocaleSource<T = Shape> = {
  readonly [K in keyof T]: T[K] extends string
    ? string
    : T[K] extends { other: string }
      ? PluralSource
      : LocaleSource<T[K]>;
};

export type DeepPartial<T> = {
  readonly [K in keyof T]?: T[K] extends string ? T[K] : DeepPartial<T[K]>;
};

// overrides by language code: strictly the texts that differ.
// a new language takes the missing texts from the fallback one
export type TextsOverrides = Readonly<
  Record<string, DeepPartial<LocaleSource>>
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
