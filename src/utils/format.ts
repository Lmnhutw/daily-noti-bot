import type { PriceAlert, PriceQuote, SubscriptionTopic } from "../types/domain.js";
import { formatSubscriptionTopic } from "../messages/subscription.messages.js";
import { bold, escapeHtml } from "./telegram-format.js";

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

  const lines = [`• ${bold(quote.name)}`, `  Price: ${bold(formatMoney(quote.price, quote.currency))} / ${escapeHtml(quote.unit)}`];

  if (changeParts.length > 0) {
    lines.push(`  Change: ${bold(changeParts.join(" / "))}`);
  }

  return lines.join("\n");
}

export function formatQuoteDetails(quote: PriceQuote): string {
  return [
    formatQuoteLine(quote),
    `  Updated: ${escapeHtml(formatObservedAt(quote.observedAt))} UTC`,
    `  Source: ${escapeHtml(quote.source)}`,
  ].join("\n");
}

export function formatDailyUpdateMessage(
  topic: SubscriptionTopic,
  quotes: PriceQuote[],
  failures: string[] = [],
): string {
  const lines = [`🔔 ${bold("Daily update")}: ${bold(formatSubscriptionTopic(topic))}`, "", ...quotes.map(formatQuoteLine)];

  if (failures.length > 0) {
    lines.push("", `⚠️ ${bold("Unavailable")}: ${escapeHtml(failures.join(", "))}`);
  }

  return lines.join("\n");
}

export function formatAlertMessage(alert: PriceAlert, quote: PriceQuote): string {
  return [
    `🚨 ${bold(`Price alert #${alert.id}`)}`,
    "",
    `${bold(quote.name)} is ${bold(alert.direction)} ${bold(formatMoney(alert.threshold, alert.currency))}.`,
    `Current: ${bold(formatMoney(quote.price, quote.currency))} / ${escapeHtml(quote.unit)}`,
    `Updated: ${escapeHtml(formatObservedAt(quote.observedAt))} UTC`,
  ].join("\n");
}
