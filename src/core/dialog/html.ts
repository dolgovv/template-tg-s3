// telegram HTML parse mode treats strictly these three characters as markup,
// so any text from users, file names or file contents must be escaped
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
