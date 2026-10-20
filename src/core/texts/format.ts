import { escapeHtml } from "../dialog/html.js";

// a ready piece of HTML: the formatter puts it into a text as is
export class Raw {
  constructor(readonly html: string) {}
  toString() {
    return this.html;
  }
}

// !!! strictly for HTML you built and escaped yourself
export function raw(html: string): Raw {
  return new Raw(html);
}

// names, file names and other user values as one parameter:
// every item is escaped, then they are joined
export function list(items: readonly string[], separator = ", "): Raw {
  return new Raw(items.map(escapeHtml).join(separator));
}

export type Param = string | number | Raw;

// a placeholder is a word in braces: "{name}". anything else in braces is plain text
const PLACEHOLDER = /\{(\w+)\}/g;

export function placeholdersOf(template: string): Set<string> {
  return new Set(Array.from(template.matchAll(PLACEHOLDER), (m) => m[1]!));
}

// "Hello, {name}" + { name: "<b>" } -> "Hello, &lt;b&gt;"
// the template itself is trusted HTML, strictly the parameters are escaped
export function format(
  template: string,
  params: Readonly<Record<string, Param>>,
): string {
  return template.replace(PLACEHOLDER, (match, key: string) => {
    const value = params[key];
    if (value === undefined) return match;
    if (value instanceof Raw) return value.html;
    return escapeHtml(String(value));
  });
}
