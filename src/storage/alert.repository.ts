import type { Alert } from "@prisma/client";
import {
  alertDirections,
  commoditySymbols,
  type AlertDirection,
  type CommoditySymbol,
  type PriceAlert,
} from "../types/domain.js";
import type { DatabaseClient } from "./database.js";

export interface CreateAlertInput {
  telegramId: number;
  chatId: number;
  symbol: CommoditySymbol;
  direction: AlertDirection;
  threshold: number;
  currency: string;
}

export class AlertRepository {
  constructor(private readonly client: DatabaseClient) {}

  async create(input: CreateAlertInput): Promise<PriceAlert> {
    const alert = await this.client.alert.create({
      data: {
        telegramId: BigInt(input.telegramId),
        chatId: BigInt(input.chatId),
        symbol: input.symbol,
        direction: input.direction,
        threshold: input.threshold,
        currency: input.currency,
      },
    });

    return this.toAlert(alert);
  }

  async findById(id: number): Promise<PriceAlert | undefined> {
    const alert = await this.client.alert.findUnique({
      where: { id },
    });

    return alert ? this.toAlert(alert) : undefined;
  }

  async listActiveForChat(telegramId: number, chatId: number): Promise<PriceAlert[]> {
    const rows = await this.client.alert.findMany({
      where: {
        telegramId: BigInt(telegramId),
        chatId: BigInt(chatId),
        active: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return rows.map((row) => this.toAlert(row));
  }

  async countActiveForUser(telegramId: number): Promise<number> {
    return this.client.alert.count({
      where: {
        telegramId: BigInt(telegramId),
        active: true,
      },
    });
  }

  async findActive(): Promise<PriceAlert[]> {
    const rows = await this.client.alert.findMany({
      where: { active: true },
      orderBy: { createdAt: "asc" },
    });

    return rows.map((row) => this.toAlert(row));
  }

  async deactivateForUser(id: number, telegramId: number, chatId: number): Promise<boolean> {
    const result = await this.client.alert.updateMany({
      where: {
        id,
        telegramId: BigInt(telegramId),
        chatId: BigInt(chatId),
        active: true,
      },
      data: {
        active: false,
      },
    });

    return result.count > 0;
  }

  async markTriggered(id: number, lastPrice: number): Promise<void> {
    await this.client.alert.update({
      where: { id },
      data: {
        active: false,
        lastPrice,
        triggeredAt: new Date(),
      },
    });
  }

  async countActive(): Promise<number> {
    return this.client.alert.count({ where: { active: true } });
  }

  private toAlert(row: Alert): PriceAlert {
    return {
      id: row.id,
      telegramId: Number(row.telegramId),
      chatId: Number(row.chatId),
      symbol: this.parseSymbol(row.symbol),
      direction: this.parseDirection(row.direction),
      threshold: row.threshold,
      currency: row.currency,
      active: row.active,
      lastPrice: row.lastPrice ?? undefined,
      triggeredAt: row.triggeredAt?.toISOString(),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private parseSymbol(value: string): CommoditySymbol {
    if (commoditySymbols.includes(value as CommoditySymbol)) {
      return value as CommoditySymbol;
    }

    throw new Error(`Unknown alert symbol in database: ${value}`);
  }

  private parseDirection(value: string): AlertDirection {
    if (alertDirections.includes(value as AlertDirection)) {
      return value as AlertDirection;
    }

    throw new Error(`Unknown alert direction in database: ${value}`);
  }
}
