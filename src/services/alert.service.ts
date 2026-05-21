import { env } from "../config/env.js";
import type { CommoditySymbol, PriceAlert, PriceQuote } from "../types/domain.js";
import { formatAlertMessage } from "../utils/format.js";
import { logger } from "../utils/logger.js";
import type { AlertRepository, CreateAlertInput } from "../storage/alert.repository.js";
import type { PriceService } from "./price.service.js";
import { isThresholdReached } from "./alert-threshold.js";

export interface TriggeredAlert {
  alert: PriceAlert;
  quote: PriceQuote;
  message: string;
}

export class AlertService {
  constructor(
    private readonly alerts: AlertRepository,
    private readonly priceService: PriceService,
  ) {}

  async createAlert(input: CreateAlertInput): Promise<PriceAlert> {
    if (!Number.isFinite(input.threshold) || input.threshold <= 0) {
      throw new Error("Alert threshold must be a positive number");
    }

    const activeCount = await this.alerts.countActiveForUser(input.telegramId);

    if (activeCount >= env.MAX_ALERTS_PER_USER) {
      throw new Error(`You can have at most ${env.MAX_ALERTS_PER_USER} active alerts`);
    }

    const alert = await this.alerts.create(input);

    logger.info(
      {
        alertId: alert.id,
        telegramId: alert.telegramId,
        chatId: alert.chatId,
        symbol: alert.symbol,
        direction: alert.direction,
        threshold: alert.threshold,
        currency: alert.currency,
      },
      "Alert created",
    );

    return alert;
  }

  async listActiveForChat(telegramId: number, chatId: number): Promise<PriceAlert[]> {
    return this.alerts.listActiveForChat(telegramId, chatId);
  }

  async deactivateForUser(id: number, telegramId: number, chatId: number): Promise<boolean> {
    return this.alerts.deactivateForUser(id, telegramId, chatId);
  }

  async markTriggered(id: number, lastPrice: number): Promise<void> {
    await this.alerts.markTriggered(id, lastPrice);
  }

  async findTriggeredAlerts(): Promise<TriggeredAlert[]> {
    const activeAlerts = await this.alerts.findActive();
    const symbols = [...new Set(activeAlerts.map((alert) => alert.symbol))];
    const quotes = new Map<CommoditySymbol, PriceQuote>();

    await Promise.all(
      symbols.map(async (symbol) => {
        try {
          quotes.set(symbol, await this.priceService.getQuote(symbol));
        } catch (error) {
          logger.warn({ error, symbol }, "Failed to fetch quote while evaluating alerts");
        }
      }),
    );

    return activeAlerts.flatMap((alert) => {
      const quote = quotes.get(alert.symbol);

      if (!quote || !isThresholdReached(alert.direction, alert.threshold, quote.price)) {
        return [];
      }

      return [
        {
          alert,
          quote,
          message: formatAlertMessage(alert, quote),
        },
      ];
    });
  }
}
