import type { Bot } from "grammy";
import type { GoldAggregationResult, GoldProviderResult, NormalizedGoldPrice } from "../interfaces/gold.interface.js";
import type { AppServices } from "../services/index.js";
import { symbolsForTopic } from "../services/instrument-registry.js";
import type { BotContext } from "../types/context.js";
import { formatNumber, formatQuoteLine } from "../utils/format.js";
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
      await ctx.reply(formatGoldAggregation(result));
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

      const lines = ["⛽ Fuel prices", "", ...result.quotes.map(formatQuoteLine)];

      if (result.failures.length > 0) {
        lines.push("", `⚠️ Unavailable: ${result.failures.join(", ")}`);
      }

      await ctx.reply(lines.join("\n"));
    } catch (error) {
      await replyWithPriceUnavailable(ctx, "fuel prices");
    }
  });
}

function formatGoldAggregation(result: GoldAggregationResult): string {
  const lines = [
    `🪙 Gold prices${result.fromCache ? " (cached)" : ""}`,
    "",
    ...result.providerResults.flatMap(formatGoldProviderResult),
  ];

  if (result.comparison.highestBuyPrice) {
    lines.push("", `📈 Highest buy: ${result.comparison.highestBuyPrice.provider}`);
  }

  if (result.comparison.lowestSellPrice) {
    lines.push(`📉 Lowest sell: ${result.comparison.lowestSellPrice.provider}`);
  }

  lines.push("", `🕒 Updated: ${formatVietnamDateTime(result.fetchedAt)}`);

  return lines.join("\n");
}

function formatGoldProviderResult(result: GoldProviderResult): string[] {
  if (!result.price) {
    return [`${result.provider}: ${noDataText}`];
  }

  return formatGoldPriceLine(result.price);
}

function formatGoldPriceLine(price: NormalizedGoldPrice): string[] {
  const currency = typeof price.metadata?.currency === "string" ? price.metadata.currency : "VND";
  const unit = typeof price.metadata?.unit === "string" ? price.metadata.unit : "luong";
  const unitLabel = formatGoldUnit(unit);

  return [
    `${price.provider}: Buy ${formatPrice(price.buyPrice, currency)} | Sell ${formatPrice(price.sellPrice, currency)} / ${unitLabel}`,
    `1 chi: Buy ${formatPerChi(price.buyPrice, currency, unit)} | Sell ${formatPerChi(price.sellPrice, currency, unit)}`,
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
  await ctx.reply(`⚠️ ${capitalize(label)} are unavailable right now. Please try again shortly.`);
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
