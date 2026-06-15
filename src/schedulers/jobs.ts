import type { Bot } from "grammy";
import { env } from "../config/env.js";
import type { AppServices } from "../services/index.js";
import { symbolsForTopic } from "../services/instrument-registry.js";
import type { BotContext } from "../types/context.js";
import { dateKeyForTimeZone } from "../utils/date.js";
import { formatDailyUpdateMessage } from "../utils/format.js";
import { logger } from "../utils/logger.js";
import { htmlMessageOptions } from "../utils/telegram-format.js";

export interface AlertJobResult {
  triggered: number;
  sent: number;
}

export interface DailyUpdateJobResult {
  targets: number;
  sent: number;
}

export async function runAlertCheck(services: AppServices, bot: Bot<BotContext>): Promise<AlertJobResult> {
  const triggeredAlerts = await services.alertService.findTriggeredAlerts();
  let sent = 0;

  for (const triggered of triggeredAlerts) {
    const notificationKey = `alert:${triggered.alert.id}`;
    const claimed = await services.notificationLog.claim(notificationKey, "alert", {
      alertId: triggered.alert.id,
      symbol: triggered.alert.symbol,
      price: triggered.quote.price,
    });

    if (!claimed) {
      logger.info({ alertId: triggered.alert.id }, "Skipped alert notification because it was already claimed");
      continue;
    }

    logger.info(
      {
        alertId: triggered.alert.id,
        telegramId: triggered.alert.telegramId,
        chatId: triggered.alert.chatId,
        symbol: triggered.alert.symbol,
        direction: triggered.alert.direction,
        threshold: triggered.alert.threshold,
        price: triggered.quote.price,
      },
      "Alert threshold reached",
    );

    let telegramSent = false;

    try {
      await bot.api.sendMessage(triggered.alert.chatId, triggered.message, htmlMessageOptions);
      telegramSent = true;
      sent += 1;
      await services.alertService.markTriggered(triggered.alert.id, triggered.quote.price);
      logger.info(
        {
          alertId: triggered.alert.id,
          chatId: triggered.alert.chatId,
          symbol: triggered.alert.symbol,
          price: triggered.quote.price,
        },
        "Alert notification sent",
      );
    } catch (error) {
      if (!telegramSent) {
        await services.notificationLog.release(notificationKey);
      }

      logger.error(
        { error, alertId: triggered.alert.id, telegramSent },
        telegramSent ? "Failed to finalize alert after Telegram notification" : "Failed to send alert notification",
      );
      continue;
    }

    try {
      await services.discordWebhookService.send(triggered.message);
    } catch (error) {
      logger.warn({ error, alertId: triggered.alert.id }, "Failed to mirror alert notification to Discord");
    }
  }

  return {
    triggered: triggeredAlerts.length,
    sent,
  };
}

export async function runDailyUpdates(services: AppServices, bot: Bot<BotContext>): Promise<DailyUpdateJobResult> {
  const targets = await services.subscriptionService.listDeliveryTargets();
  const dateKey = dateKeyForTimeZone(new Date(), env.DAILY_UPDATE_TIMEZONE);
  let sent = 0;

  for (const target of targets) {
    const symbols = symbolsForTopic(target.topic);

    if (symbols.length === 0) {
      logger.info({ target }, "Skipped daily update because the subscription topic has no price provider");
      continue;
    }

    const notificationKey = `daily:${dateKey}:${target.chatId}:${target.topic}`;
    const claimed = await services.notificationLog.claim(notificationKey, "daily_update", {
      chatId: target.chatId,
      topic: target.topic,
      dateKey,
    });

    if (!claimed) {
      continue;
    }

    const result = await services.priceService.getAvailableQuotes(symbols);

    if (result.quotes.length === 0) {
      await services.notificationLog.release(notificationKey);
      logger.warn({ target }, "Skipped daily update because all quotes failed");
      continue;
    }

    const message = formatDailyUpdateMessage(target.topic, result.quotes, result.failures);
    let telegramSent = false;

    try {
      await bot.api.sendMessage(target.chatId, message, htmlMessageOptions);
      telegramSent = true;
      sent += 1;
      logger.info({ target, quoteCount: result.quotes.length }, "Daily update sent");
    } catch (error) {
      if (!telegramSent) {
        await services.notificationLog.release(notificationKey);
      }

      logger.error({ error, target }, "Failed to send daily update");
      continue;
    }

    try {
      await services.discordWebhookService.send(message);
    } catch (error) {
      logger.warn({ error, target }, "Failed to mirror daily update to Discord");
    }
  }

  return {
    targets: targets.length,
    sent,
  };
}
