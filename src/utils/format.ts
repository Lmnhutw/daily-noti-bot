import type { PriceAlert, PriceQuote, SubscriptionTopic } from "../types/domain.js";

export function formatMoney(value: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: value >= 100 ? 2 : 4,
  }).format(value);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: value >= 100 ? 2 : 4,
  }).format(value);
}

export function formatObservedAt(isoDate: string): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(isoDate));
}

export function formatQuoteLine(quote: PriceQuote): string {
  const changeParts: string[] = [];

  if (quote.change !== undefined) {
    changeParts.push(`${quote.change >= 0 ? "+" : ""}${formatNumber(quote.change)}`);
  }

  if (quote.changePercent !== undefined) {
    changeParts.push(`${quote.changePercent >= 0 ? "+" : ""}${formatNumber(quote.changePercent)}%`);
  }

  const change = changeParts.length > 0 ? ` (${changeParts.join(", ")})` : "";

  return `${quote.name}: ${formatMoney(quote.price, quote.currency)} / ${quote.unit}${change}`;
}

export function formatQuoteDetails(quote: PriceQuote): string {
  return [
    formatQuoteLine(quote),
    `Updated: ${formatObservedAt(quote.observedAt)} UTC`,
    `Source: ${quote.source}`,
  ].join("\n");
}

export function formatDailyUpdateMessage(
  topic: SubscriptionTopic,
  quotes: PriceQuote[],
  failures: string[] = [],
): string {
  const lines = [`Daily ${topic} update`, "", ...quotes.map(formatQuoteLine)];

  if (failures.length > 0) {
    lines.push("", `Unavailable: ${failures.join(", ")}`);
  }

  return lines.join("\n");
}

export function formatAlertMessage(alert: PriceAlert, quote: PriceQuote): string {
  return [
    `Price alert #${alert.id}`,
    `${quote.name} is ${alert.direction} ${formatMoney(alert.threshold, alert.currency)}.`,
    `Current: ${formatMoney(quote.price, quote.currency)} / ${quote.unit}`,
    `Updated: ${formatObservedAt(quote.observedAt)} UTC`,
  ].join("\n");
}
