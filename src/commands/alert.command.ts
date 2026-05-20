import type { Bot } from "grammy";
import type { AppServices } from "../services/index.js";
import { instruments } from "../services/instrument-registry.js";
import { normalizeCommoditySymbol, supportedAlertSymbols } from "../services/instrument-registry.js";
import type { AlertDirection } from "../types/domain.js";
import type { BotContext } from "../types/context.js";
import { formatMoney } from "../utils/format.js";
import { commandArgs, ensureKnownUser, replyWithUnexpectedError } from "./helpers.js";

const alertUsage = [
  "Usage:",
  "/alert gold above 2300",
  "/alert diesel below 3.50",
  "/alert list",
  "/alert remove 12",
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
        await ctx.reply([alertUsage, "", `Symbols: ${supportedAlertSymbols()}`].join("\n"));
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
        await ctx.reply([alertUsage, "", `Symbols: ${supportedAlertSymbols()}`].join("\n"));
        return;
      }

      const quote = await services.priceService.getQuote(symbol);
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
          `Created alert #${alert.id}.`,
          `${instruments[symbol].displayName} ${direction} ${formatMoney(threshold, quote.currency)}.`,
          `Current: ${formatMoney(quote.price, quote.currency)}.`,
        ].join("\n"),
      );
    } catch (error) {
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
    await ctx.reply("No active alerts.");
    return;
  }

  await ctx.reply(
    [
      "Active alerts:",
      ...alerts.map(
        (alert) =>
          `#${alert.id} ${instruments[alert.symbol].displayName} ${alert.direction} ${formatMoney(
            alert.threshold,
            alert.currency,
          )}`,
      ),
    ].join("\n"),
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
    await ctx.reply("/alert remove requires an alert id. Example: /alert remove 12");
    return;
  }

  const removed = await services.alertService.deactivateForUser(id, telegramId, chatId);
  await ctx.reply(removed ? `Removed alert #${id}.` : `No active alert #${id} was found for this chat.`);
}
