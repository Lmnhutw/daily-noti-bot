export const htmlMessageOptions = {
  parse_mode: "HTML",
} as const;

export function escapeHtml(value: string | number): string {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function bold(value: string | number): string {
  return `<b>${escapeHtml(value)}</b>`;
}

export function code(value: string | number): string {
  return `<code>${escapeHtml(value)}</code>`;
}

export function stripTelegramHtml(message: string): string {
  return message
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/?(?:b|strong|i|em|u|ins|s|strike|del|span|tg-spoiler)>/gi, "")
    .replace(/<code>(.*?)<\/code>/gis, "$1")
    .replace(/<pre>(.*?)<\/pre>/gis, "$1")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}
