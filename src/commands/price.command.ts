import type { Bot } from "grammy";
import type { GoldAggregationResult, GoldProviderResult, NormalizedGoldPrice } from "../interfaces/gold.interface.js";
import type { AppServices } from "../services/index.js";
import { symbolsForTopic } from "../services/instrument-registry.js";
import type { BotContext } from "../types/context.js";
import { formatNumber, formatQuoteLine } from "../utils/format.js";
import { ensureKnownUser, replyWithUnexpectedError } from "./helpers.js";

const noDataText = "t\u1ea1m th\u1eddi kh\u00f4ng c\u00f3 s\u1ed1 li\u1ec7u";

export function registerPriceCommands(bot: Bot<BotContext>, services: AppServices): void {
  bot.command("gold", async (ctx) => {
    try {
      await ensureKnownUser(ctx, services.userService);
      const result = await services.goldService.getAllGoldPrices();
      await ctx.reply(formatGoldAggregation(result));
    } catch (error) {
      await replyWithUnexpectedError(ctx, error);
    }
  });

  bot.command("fuel", async (ctx) => {
    try {
      await ensureKnownUser(ctx, services.userService);
      const result = await services.priceService.getAvailableQuotes(symbolsForTopic("fuel"));

      if (result.quotes.length === 0) {
        await ctx.reply("Fuel prices are currently unavailable. Please try again later.");
        return;
      }

      const lines = ["Fuel prices", "", ...result.quotes.map(formatQuoteLine)];

      if (result.failures.length > 0) {
        lines.push("", `Unavailable: ${result.failures.join(", ")}`);
      }

      await ctx.reply(lines.join("\n"));
    } catch (error) {
      await replyWithUnexpectedError(ctx, error);
    }
  });
}

function formatGoldAggregation(result: GoldAggregationResult): string {
  const lines = [
    `So s\u00e1nh gi\u00e1 v\u00e0ng${result.fromCache ? " (d\u1eef li\u1ec7u cache)" : ""}`,
    "",
    ...result.providerResults.flatMap(formatGoldProviderResult),
  ];

  if (result.comparison.highestBuyPrice) {
    lines.push("", `Gi\u00e1 mua cao nh\u1ea5t: ${result.comparison.highestBuyPrice.provider}`);
  }

  if (result.comparison.lowestSellPrice) {
    lines.push(`Gi\u00e1 b\u00e1n th\u1ea5p nh\u1ea5t: ${result.comparison.lowestSellPrice.provider}`);
  }

  lines.push("", `C\u1eadp nh\u1eadt: ${formatVietnamDateTime(result.fetchedAt)}`);

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
    `${price.provider}: mua ${formatPrice(price.buyPrice, currency)} / b\u00e1n ${formatPrice(
      price.sellPrice,
      currency,
    )} / ${unitLabel}`,
    `  1 ch\u1ec9: ${formatPerChi(price, currency, unit)}`,
  ];
}

function formatPerChi(price: NormalizedGoldPrice, currency: string, unit: string): string {
  if (currency !== "VND" || !isLuongUnit(unit)) {
    return noDataText;
  }

  return `mua ${formatPrice(price.buyPrice / 10, currency)} / b\u00e1n ${formatPrice(price.sellPrice / 10, currency)}`;
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
    return "l\u01b0\u1ee3ng";
  }

  if (unit === "troy_ounce") {
    return "ounce";
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
