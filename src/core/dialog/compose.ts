// the parts of a message line by line, false and undefined are skipped
export function lines(...parts: (string | false | undefined)[]): string {
  return parts
    .filter((part): part is string => typeof part === "string")
    .join("\n");
}

// buttons into rows of `size`
export function chunk<T>(items: T[], size: number): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    rows.push(items.slice(i, i + size));
  }
  return rows;
}
