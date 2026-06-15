import type { Subscription as SubscriptionRecord } from "@prisma/client";
import {
  subscriptionTopics,
  type Subscription,
  type SubscriptionTarget,
  type SubscriptionTopic,
} from "../types/domain.js";
import type { DatabaseClient } from "./database.js";

export interface SubscriptionInput {
  telegramId: number;
  chatId: number;
  topic: SubscriptionTopic;
}

export class SubscriptionRepository {
  constructor(private readonly client: DatabaseClient) {}

  async add(input: SubscriptionInput): Promise<boolean> {
    try {
      await this.client.subscription.create({
        data: {
          telegramId: BigInt(input.telegramId),
          chatId: BigInt(input.chatId),
          topic: input.topic,
        },
      });

      return true;
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        return false;
      }

      throw error;
    }
  }

  async remove(input: SubscriptionInput): Promise<number> {
    const result = await this.client.subscription.deleteMany({
      where: {
        telegramId: BigInt(input.telegramId),
        chatId: BigInt(input.chatId),
        topic: input.topic,
      },
    });

    return result.count;
  }

  async removeAllForChat(telegramId: number, chatId: number): Promise<number> {
    const result = await this.client.subscription.deleteMany({
      where: {
        telegramId: BigInt(telegramId),
        chatId: BigInt(chatId),
      },
    });

    return result.count;
  }

  async listForChat(telegramId: number, chatId: number): Promise<Subscription[]> {
    const rows = await this.client.subscription.findMany({
      where: {
        telegramId: BigInt(telegramId),
        chatId: BigInt(chatId),
      },
      orderBy: { topic: "asc" },
    });

    return rows.map((row) => this.toSubscription(row));
  }

  async listDeliveryTargets(): Promise<SubscriptionTarget[]> {
    const rows = await this.client.subscription.findMany({
      distinct: ["chatId", "topic"],
      orderBy: [{ chatId: "asc" }, { topic: "asc" }],
      select: {
        chatId: true,
        topic: true,
      },
    });

    return rows.map((row) => ({
      chatId: Number(row.chatId),
      topic: this.parseTopic(row.topic),
    }));
  }

  async count(): Promise<number> {
    return this.client.subscription.count();
  }

  private toSubscription(row: SubscriptionRecord): Subscription {
    return {
      id: row.id,
      telegramId: Number(row.telegramId),
      chatId: Number(row.chatId),
      topic: this.parseTopic(row.topic),
      createdAt: row.createdAt.toISOString(),
    };
  }

  private parseTopic(value: string): SubscriptionTopic {
    if (subscriptionTopics.includes(value as SubscriptionTopic)) {
      return value as SubscriptionTopic;
    }

    throw new Error(`Unknown subscription topic in database: ${value}`);
  }
}

function isUniqueConstraintError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
}
