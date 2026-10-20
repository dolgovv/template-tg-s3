// splits a text into pages of at most `size` characters:
// at a line break if there is one in the second half of the page
// (the break itself is dropped), otherwise right at `size`,
// but never inside an emoji or another surrogate pair
export function splitPages(text: string, size: number): string[] {
  const pages: string[] = [];
  let rest = text;

  while (rest.length > size) {
    const lineBreak = rest.lastIndexOf("\n", size);
    if (lineBreak >= size / 2) {
      pages.push(rest.slice(0, lineBreak));
      rest = rest.slice(lineBreak + 1);
      continue;
    }

    const cut = isHighSurrogate(rest.charCodeAt(size - 1)) ? size - 1 : size;
    pages.push(rest.slice(0, cut));
    rest = rest.slice(cut);
  }

  if (rest.length > 0 || pages.length === 0) pages.push(rest);
  return pages;
}

function isHighSurrogate(code: number): boolean {
  return code >= 0xd800 && code <= 0xdbff;
}
