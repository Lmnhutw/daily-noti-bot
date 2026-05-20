import type { Client } from "@libsql/client";
import {
  alertDirections,
  commoditySymbols,
  type AlertDirection,
  type CommoditySymbol,
  type PriceAlert,
} from "../types/domain.js";
import { optionalNumber, optionalString, requiredNumber, requiredString, type DbRow } from "./row.js";

export interface CreateAlertInput {
  telegramId: number;
  chatId: number;
  symbol: CommoditySymbol;
  direction: AlertDirection;
  threshold: number;
  currency: string;
}

export class AlertRepository {
  constructor(private readonly client: Client) {}

  async create(input: CreateAlertInput): Promise<PriceAlert> {
    const now = new Date().toISOString();
    const result = await this.client.execute({
      sql: `INSERT INTO alerts (
          telegram_id,
          chat_id,
          symbol,
          direction,
          threshold,
          currency,
          active,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)`,
      args: [
        input.telegramId,
        input.chatId,
        input.symbol,
        input.direction,
        input.threshold,
        input.currency,
        now,
        now,
      ],
    });

    const id = Number(result.lastInsertRowid);
    const alert = await this.findById(id);

    if (!alert) {
      throw new Error("Alert create did not return a persisted alert");
    }

    return alert;
  }

  async findById(id: number): Promise<PriceAlert | undefined> {
    const result = await this.client.execute({
      sql: "SELECT * FROM alerts WHERE id = ?",
      args: [id],
    });

    const row = result.rows[0] as DbRow | undefined;
    return row ? this.toAlert(row) : undefined;
  }

  async listActiveForChat(telegramId: number, chatId: number): Promise<PriceAlert[]> {
    const result = await this.client.execute({
      sql: `SELECT * FROM alerts
        WHERE telegram_id = ? AND chat_id = ? AND active = 1
        ORDER BY created_at DESC`,
      args: [telegramId, chatId],
    });

    return result.rows.map((row) => this.toAlert(row as DbRow));
  }

  async countActiveForUser(telegramId: number): Promise<number> {
    const result = await this.client.execute({
      sql: "SELECT COUNT(*) AS total FROM alerts WHERE telegram_id = ? AND active = 1",
      args: [telegramId],
    });

    return requiredNumber(result.rows[0] as DbRow, "total");
  }

  async findActive(): Promise<PriceAlert[]> {
    const result = await this.client.execute(
      `SELECT * FROM alerts
       WHERE active = 1
       ORDER BY created_at ASC`,
    );

    return result.rows.map((row) => this.toAlert(row as DbRow));
  }

  async deactivateForUser(id: number, telegramId: number, chatId: number): Promise<boolean> {
    const result = await this.client.execute({
      sql: `UPDATE alerts
        SET active = 0, updated_at = ?
        WHERE id = ? AND telegram_id = ? AND chat_id = ? AND active = 1`,
      args: [new Date().toISOString(), id, telegramId, chatId],
    });

    return result.rowsAffected > 0;
  }

  async markTriggered(id: number, lastPrice: number): Promise<void> {
    const now = new Date().toISOString();

    await this.client.execute({
      sql: `UPDATE alerts
        SET active = 0,
          last_price = ?,
          triggered_at = ?,
          updated_at = ?
        WHERE id = ?`,
      args: [lastPrice, now, now, id],
    });
  }

  async countActive(): Promise<number> {
    const result = await this.client.execute("SELECT COUNT(*) AS total FROM alerts WHERE active = 1");
    return requiredNumber(result.rows[0] as DbRow, "total");
  }

  private toAlert(row: DbRow): PriceAlert {
    return {
      id: requiredNumber(row, "id"),
      telegramId: requiredNumber(row, "telegram_id"),
      chatId: requiredNumber(row, "chat_id"),
      symbol: this.parseSymbol(requiredString(row, "symbol")),
      direction: this.parseDirection(requiredString(row, "direction")),
      threshold: requiredNumber(row, "threshold"),
      currency: requiredString(row, "currency"),
      active: requiredNumber(row, "active") === 1,
      lastPrice: optionalNumber(row, "last_price"),
      triggeredAt: optionalString(row, "triggered_at"),
      createdAt: requiredString(row, "created_at"),
      updatedAt: requiredString(row, "updated_at"),
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
