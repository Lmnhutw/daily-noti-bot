import type { Bot } from "grammy";
import { env } from "../config/env.js";
import type { AppServices } from "../services/index.js";
import { symbolsForTopic } from "../services/instrument-registry.js";
import type { BotContext } from "../types/context.js";
import { dateKeyForTimeZone } from "../utils/date.js";
import { formatDailyUpdateMessage } from "../utils/format.js";
import { logger } from "../utils/logger.js";

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
      continue;
    }

    try {
      await bot.api.sendMessage(triggered.alert.chatId, triggered.message);
      await services.alertService.markTriggered(triggered.alert.id, triggered.quote.price);
      await services.discordWebhookService.send(triggered.message);
      sent += 1;
    } catch (error) {
      await services.notificationLog.release(notificationKey);
      logger.error({ error, alertId: triggered.alert.id }, "Failed to send alert notification");
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
    const notificationKey = `daily:${dateKey}:${target.chatId}:${target.topic}`;
    const claimed = await services.notificationLog.claim(notificationKey, "daily_update", {
      chatId: target.chatId,
      topic: target.topic,
      dateKey,
    });

    if (!claimed) {
      continue;
    }

    const result = await services.priceService.getAvailableQuotes(symbolsForTopic(target.topic));

    if (result.quotes.length === 0) {
      await services.notificationLog.release(notificationKey);
      logger.warn({ target }, "Skipped daily update because all quotes failed");
      continue;
    }

    const message = formatDailyUpdateMessage(target.topic, result.quotes, result.failures);

    try {
      await bot.api.sendMessage(target.chatId, message);
      await services.discordWebhookService.send(message);
      sent += 1;
    } catch (error) {
      await services.notificationLog.release(notificationKey);
      logger.error({ error, target }, "Failed to send daily update");
    }
  }

  return {
    targets: targets.length,
    sent,
  };
}
