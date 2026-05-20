import type { Client } from "@libsql/client";
import {
  subscriptionTopics,
  type Subscription,
  type SubscriptionTarget,
  type SubscriptionTopic,
} from "../types/domain.js";
import { requiredNumber, requiredString, type DbRow } from "./row.js";

export interface SubscriptionInput {
  telegramId: number;
  chatId: number;
  topic: SubscriptionTopic;
}

export class SubscriptionRepository {
  constructor(private readonly client: Client) {}

  async add(input: SubscriptionInput): Promise<void> {
    await this.client.execute({
      sql: `INSERT OR IGNORE INTO subscriptions (telegram_id, chat_id, topic, created_at)
        VALUES (?, ?, ?, ?)`,
      args: [input.telegramId, input.chatId, input.topic, new Date().toISOString()],
    });
  }

  async remove(input: SubscriptionInput): Promise<number> {
    const result = await this.client.execute({
      sql: `DELETE FROM subscriptions
        WHERE telegram_id = ? AND chat_id = ? AND topic = ?`,
      args: [input.telegramId, input.chatId, input.topic],
    });

    return result.rowsAffected;
  }

  async removeAllForChat(telegramId: number, chatId: number): Promise<number> {
    const result = await this.client.execute({
      sql: "DELETE FROM subscriptions WHERE telegram_id = ? AND chat_id = ?",
      args: [telegramId, chatId],
    });

    return result.rowsAffected;
  }

  async listForChat(telegramId: number, chatId: number): Promise<Subscription[]> {
    const result = await this.client.execute({
      sql: `SELECT * FROM subscriptions
        WHERE telegram_id = ? AND chat_id = ?
        ORDER BY topic ASC`,
      args: [telegramId, chatId],
    });

    return result.rows.map((row) => this.toSubscription(row as DbRow));
  }

  async listDeliveryTargets(): Promise<SubscriptionTarget[]> {
    const result = await this.client.execute(
      `SELECT DISTINCT chat_id, topic
       FROM subscriptions
       ORDER BY chat_id ASC, topic ASC`,
    );

    return result.rows.map((row) => ({
      chatId: requiredNumber(row as DbRow, "chat_id"),
      topic: this.parseTopic(requiredString(row as DbRow, "topic")),
    }));
  }

  async count(): Promise<number> {
    const result = await this.client.execute("SELECT COUNT(*) AS total FROM subscriptions");
    return requiredNumber(result.rows[0] as DbRow, "total");
  }

  private toSubscription(row: DbRow): Subscription {
    return {
      id: requiredNumber(row, "id"),
      telegramId: requiredNumber(row, "telegram_id"),
      chatId: requiredNumber(row, "chat_id"),
      topic: this.parseTopic(requiredString(row, "topic")),
      createdAt: requiredString(row, "created_at"),
    };
  }

  private parseTopic(value: string): SubscriptionTopic {
    if (subscriptionTopics.includes(value as SubscriptionTopic)) {
      return value as SubscriptionTopic;
    }

    throw new Error(`Unknown subscription topic in database: ${value}`);
  }
}
