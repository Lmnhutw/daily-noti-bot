import { describe, expect, it } from "vitest";
import { SubscriptionService } from "../src/services/subscription.service.js";
import type { SubscriptionRepository } from "../src/storage/subscription.repository.js";
import type { Subscription, SubscriptionTarget, SubscriptionTopic } from "../src/types/domain.js";

describe("SubscriptionService", () => {
  it("does not create duplicate subscriptions when subscribing to repeated topics", async () => {
    const { rows, service } = createSubscriptionService();

    const created = await service.subscribeMany({
      telegramId: 1,
      chatId: 10,
      topics: ["gold", "gold", "fuel"],
    });

    expect(created).toBe(2);
    expect(rows.map((subscription) => subscription.topic)).toEqual(["gold", "fuel"]);
  });

  it("replaces chat subscriptions by applying only the required changes", async () => {
    const { rows, service } = createSubscriptionService();

    await service.subscribeMany({
      telegramId: 1,
      chatId: 10,
      topics: ["gold", "fuel"],
    });

    const result = await service.replaceForChat({
      telegramId: 1,
      chatId: 10,
      topics: ["fuel", "stocks"],
    });

    expect(result).toEqual({
      created: 1,
      removed: 1,
      unchanged: 1,
    });
    expect(rows.map((subscription) => subscription.topic)).toEqual(["fuel", "stocks"]);
  });
});

function createSubscriptionService(): { rows: Subscription[]; service: SubscriptionService } {
  const rows: Subscription[] = [];
  let nextId = 1;

  const repository = {
    async add(input: { telegramId: number; chatId: number; topic: SubscriptionTopic }): Promise<boolean> {
      const exists = rows.some(
        (subscription) =>
          subscription.telegramId === input.telegramId &&
          subscription.chatId === input.chatId &&
          subscription.topic === input.topic,
      );

      if (exists) {
        return false;
      }

      rows.push({
        id: nextId,
        telegramId: input.telegramId,
        chatId: input.chatId,
        topic: input.topic,
        createdAt: new Date(nextId).toISOString(),
      });
      nextId += 1;
      return true;
    },
    async remove(input: { telegramId: number; chatId: number; topic: SubscriptionTopic }): Promise<number> {
      const before = rows.length;

      for (let index = rows.length - 1; index >= 0; index -= 1) {
        const subscription = rows[index];

        if (
          subscription.telegramId === input.telegramId &&
          subscription.chatId === input.chatId &&
          subscription.topic === input.topic
        ) {
          rows.splice(index, 1);
        }
      }

      return before - rows.length;
    },
    async removeAllForChat(telegramId: number, chatId: number): Promise<number> {
      const before = rows.length;

      for (let index = rows.length - 1; index >= 0; index -= 1) {
        const subscription = rows[index];

        if (subscription.telegramId === telegramId && subscription.chatId === chatId) {
          rows.splice(index, 1);
        }
      }

      return before - rows.length;
    },
    async listForChat(telegramId: number, chatId: number): Promise<Subscription[]> {
      return rows.filter((subscription) => subscription.telegramId === telegramId && subscription.chatId === chatId);
    },
    async listDeliveryTargets(): Promise<SubscriptionTarget[]> {
      return rows.map((subscription) => ({
        chatId: subscription.chatId,
        topic: subscription.topic,
      }));
    },
  } as unknown as SubscriptionRepository;

  return {
    rows,
    service: new SubscriptionService(repository),
  };
}
