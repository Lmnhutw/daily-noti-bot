import type { Bot } from "grammy";
import type { AppServices } from "../services/index.js";
import { instruments } from "../services/instrument-registry.js";
import { normalizeCommoditySymbol, supportedAlertSymbols } from "../services/instrument-registry.js";
import type { AlertDirection } from "../types/domain.js";
import type { BotContext } from "../types/context.js";
import { formatMoney } from "../utils/format.js";
import { logger } from "../utils/logger.js";
import { bold, code, escapeHtml, htmlMessageOptions } from "../utils/telegram-format.js";
import { commandArgs, ensureKnownUser, replyWithUnexpectedError } from "./helpers.js";

const alertUsage = [
  "🚨 <b>Alert commands</b>",
  "",
  `${code("/alert gold above 2300")} - Create a one-time alert`,
  `${code("/alert diesel below 3.50")} - Create a one-time alert`,
  `${code("/alert list")} - View active alerts`,
  `${code("/alert remove 12")} - Remove an alert`,
].join("\n");

export function registerAlertCommand(bot: Bot<BotContext>, services: AppServices): void {
  bot.command("alert", async (ctx) => {
    try {
      const user = await ensureKnownUser(ctx, services.userService);

      if (!user) {
        return;
      }

      const args = commandArgs(ctx);
      const action = args[0]?.toLowerCase();

      if (!action) {
        await ctx.reply(formatAlertUsage(), htmlMessageOptions);
        return;
      }

      if (action === "list") {
        await replyWithAlertList(ctx, services, user.telegramId, user.chatId);
        return;
      }

      if (action === "remove" || action === "delete") {
        await removeAlert(ctx, services, user.telegramId, user.chatId, args[1]);
        return;
      }

      const symbol = normalizeCommoditySymbol(args[0]);
      const direction = normalizeAlertDirection(args[1]);
      const threshold = Number(args[2]);

      if (!symbol || !direction || !Number.isFinite(threshold) || threshold <= 0) {
        await ctx.reply(formatAlertUsage(), htmlMessageOptions);
        return;
      }

      const quote = await services.priceService.getQuote(symbol).catch(async (error: unknown) => {
        logger.warn(
          {
            error,
            telegramId: user.telegramId,
            chatId: user.chatId,
            symbol,
          },
          "Failed to fetch current quote before creating alert",
        );

        await ctx.reply("⚠️ I could not validate the current price for that symbol. Please try again later.", htmlMessageOptions);
        return undefined;
      });

      if (!quote) {
        return;
      }

      const alert = await services.alertService.createAlert({
        telegramId: user.telegramId,
        chatId: user.chatId,
        symbol,
        direction,
        threshold,
        currency: quote.currency,
      });

      await ctx.reply(
        [
          `✅ ${bold(`Alert #${alert.id} created`)}`,
          "",
          `${bold("Rule")}: ${escapeHtml(instruments[symbol].displayName)} ${escapeHtml(direction)} ${bold(
            formatMoney(threshold, quote.currency),
          )}`,
          `${bold("Current")}: ${bold(formatMoney(quote.price, quote.currency))}`,
        ].join("\n"),
        htmlMessageOptions,
      );
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === "Alert threshold must be a positive number") {
          await ctx.reply("⚠️ Enter a valid positive price for the alert threshold.", htmlMessageOptions);
          return;
        }

        if (error.message.startsWith("You can have at most")) {
          await ctx.reply(`⚠️ ${escapeHtml(error.message)}. Remove an old alert and try again.`, htmlMessageOptions);
          return;
        }
      }

      await replyWithUnexpectedError(ctx, error);
    }
  });
}

function normalizeAlertDirection(input: string | undefined): AlertDirection | undefined {
  const normalized = input?.toLowerCase();

  if (normalized === "above" || normalized === "over" || normalized === ">" || normalized === ">=") {
    return "above";
  }

  if (normalized === "below" || normalized === "under" || normalized === "<" || normalized === "<=") {
    return "below";
  }

  return undefined;
}

async function replyWithAlertList(
  ctx: BotContext,
  services: AppServices,
  telegramId: number,
  chatId: number,
): Promise<void> {
  const alerts = await services.alertService.listActiveForChat(telegramId, chatId);

  if (alerts.length === 0) {
    await ctx.reply("ℹ️ You do not have any active alerts yet.", htmlMessageOptions);
    return;
  }

  await ctx.reply(
    [
      "🚨 <b>Active alerts</b>",
      "",
      ...alerts.map(
        (alert) =>
          `• ${code(`#${alert.id}`)} ${escapeHtml(instruments[alert.symbol].displayName)} ${escapeHtml(
            alert.direction,
          )} ${bold(formatMoney(
            alert.threshold,
            alert.currency,
          ))}`,
      ),
    ].join("\n"),
    htmlMessageOptions,
  );
}

async function removeAlert(
  ctx: BotContext,
  services: AppServices,
  telegramId: number,
  chatId: number,
  rawId: string | undefined,
): Promise<void> {
  const id = Number(rawId);

  if (!Number.isInteger(id) || id <= 0) {
    await ctx.reply(`⚠️ Please provide an alert ID.\n\nExample: ${code("/alert remove 12")}`, htmlMessageOptions);
    return;
  }

  const removed = await services.alertService.deactivateForUser(id, telegramId, chatId);
  logger.info({ alertId: id, telegramId, chatId, removed }, "Alert remove requested");
  await ctx.reply(
    removed ? `✅ ${bold(`Alert #${id} removed`)}` : `ℹ️ ${bold(`Alert #${id}`)} was not found in this chat.`,
    htmlMessageOptions,
  );
}

function formatAlertUsage(): string {
  return [alertUsage, "", `${bold("Supported symbols")}: ${code(supportedAlertSymbols())}`].join("\n");
}
