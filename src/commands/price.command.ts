import type { Bot } from "grammy";
import type { GoldAggregationResult, GoldProviderResult, NormalizedGoldPrice } from "../interfaces/gold.interface.js";
import type { AppServices } from "../services/index.js";
import { symbolsForTopic } from "../services/instrument-registry.js";
import type { BotContext } from "../types/context.js";
import { formatNumber, formatQuoteLine } from "../utils/format.js";
import { bold, escapeHtml, htmlMessageOptions } from "../utils/telegram-format.js";
import { ensureKnownUser } from "./helpers.js";

const noDataText = "unavailable";

export function registerPriceCommands(bot: Bot<BotContext>, services: AppServices): void {
  bot.command("gold", async (ctx) => {
    try {
      const user = await ensureKnownUser(ctx, services.userService);

      if (!user) {
        return;
      }

      const result = await services.goldService.getAllGoldPrices();
      await ctx.reply(formatGoldAggregation(result), htmlMessageOptions);
    } catch (error) {
      await replyWithPriceUnavailable(ctx, "gold prices");
    }
  });

  bot.command("fuel", async (ctx) => {
    try {
      const user = await ensureKnownUser(ctx, services.userService);

      if (!user) {
        return;
      }

      const result = await services.priceService.getAvailableQuotes(symbolsForTopic("fuel"));

      if (result.quotes.length === 0) {
        await replyWithPriceUnavailable(ctx, "fuel prices");
        return;
      }

      const lines = [`⛽ ${bold("Fuel prices")}`, "", ...result.quotes.map(formatQuoteLine)];

      if (result.failures.length > 0) {
        lines.push("", `⚠️ ${bold("Unavailable")}: ${escapeHtml(result.failures.join(", "))}`);
      }

      await ctx.reply(lines.join("\n"), htmlMessageOptions);
    } catch (error) {
      await replyWithPriceUnavailable(ctx, "fuel prices");
    }
  });
}

function formatGoldAggregation(result: GoldAggregationResult): string {
  const providerLines = result.providerResults.flatMap((providerResult, index) => {
    const lines = formatGoldProviderResult(providerResult);
    return index === 0 ? lines : ["", ...lines];
  });

  const lines = [
    `🪙 ${bold("Gold prices")}${result.fromCache ? " (cached)" : ""}`,
    "",
    ...providerLines,
  ];

  if (result.comparison.highestBuyPrice) {
    lines.push("", `📈 ${bold("Highest buy")}: ${escapeHtml(result.comparison.highestBuyPrice.provider)}`);
  }

  if (result.comparison.lowestSellPrice) {
    lines.push(`📉 ${bold("Lowest sell")}: ${escapeHtml(result.comparison.lowestSellPrice.provider)}`);
  }

  lines.push("", `🕒 ${bold("Updated")}: ${escapeHtml(formatVietnamDateTime(result.fetchedAt))}`);

  return lines.join("\n");
}

function formatGoldProviderResult(result: GoldProviderResult): string[] {
  if (!result.price) {
    return [`• ${bold(result.provider)}\n  ${escapeHtml(noDataText)}`];
  }

  return formatGoldPriceLine(result.price);
}

function formatGoldPriceLine(price: NormalizedGoldPrice): string[] {
  const currency = typeof price.metadata?.currency === "string" ? price.metadata.currency : "VND";
  const unit = typeof price.metadata?.unit === "string" ? price.metadata.unit : "luong";
  const unitLabel = formatGoldUnit(unit);

  return [
    `• ${bold(price.provider)}`,
    `  Buy: ${bold(formatPrice(price.buyPrice, currency))}`,
    `  Sell: ${bold(formatPrice(price.sellPrice, currency))} / ${escapeHtml(unitLabel)}`,
    `  1 chi: Buy ${escapeHtml(formatPerChi(price.buyPrice, currency, unit))} | Sell ${escapeHtml(formatPerChi(price.sellPrice, currency, unit))}`,
  ];
}

function formatPerChi(price: number, currency: string, unit: string): string {
  if (currency !== "VND" || !isLuongUnit(unit)) {
    return noDataText;
  }

  return formatPrice(price / 10, currency);
}

function formatPrice(value: number, currency: string): string {
  if (!Number.isFinite(value)) {
    return noDataText;
  }

  if (currency === "VND") {
    return `${formatNumber(value)} VND`;
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatGoldUnit(unit: string): string {
  if (isLuongUnit(unit)) {
    return "luong";
  }

  if (unit === "troy_ounce") {
    return "oz";
  }

  return unit;
}

function isLuongUnit(unit: string): boolean {
  return unit === "luong" || unit === "tael";
}

function formatVietnamDateTime(isoDate: string): string {
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(new Date(isoDate));
}

async function replyWithPriceUnavailable(ctx: BotContext, label: string): Promise<void> {
  await ctx.reply(`⚠️ ${bold(capitalize(label))} are unavailable right now. Please try again shortly.`, htmlMessageOptions);
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
