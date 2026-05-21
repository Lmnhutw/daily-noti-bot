import type { Subscription, SubscriptionTarget, SubscriptionTopic } from "../types/domain.js";
import type { SubscriptionRepository } from "../storage/subscription.repository.js";

export interface SubscriptionCommandInput {
  telegramId: number;
  chatId: number;
  topic: SubscriptionTopic;
}

export interface SubscriptionBatchInput {
  telegramId: number;
  chatId: number;
  topics: SubscriptionTopic[];
}

export interface SubscriptionReplaceResult {
  created: number;
  removed: number;
  unchanged: number;
}

export class SubscriptionService {
  constructor(private readonly subscriptions: SubscriptionRepository) {}

  async subscribe(input: SubscriptionCommandInput): Promise<boolean> {
    return this.subscriptions.add(input);
  }

  async subscribeMany(input: SubscriptionBatchInput): Promise<number> {
    let created = 0;

    for (const topic of [...new Set(input.topics)]) {
      const added = await this.subscriptions.add({
        telegramId: input.telegramId,
        chatId: input.chatId,
        topic,
      });

      if (added) {
        created += 1;
      }
    }

    return created;
  }

  async replaceForChat(input: SubscriptionBatchInput): Promise<SubscriptionReplaceResult> {
    const requestedTopics = [...new Set(input.topics)];
    const requested = new Set<SubscriptionTopic>(requestedTopics);
    const existing = await this.subscriptions.listForChat(input.telegramId, input.chatId);
    const existingTopics = new Set(existing.map((subscription) => subscription.topic));
    let removed = 0;
    let created = 0;

    for (const subscription of existing) {
      if (!requested.has(subscription.topic)) {
        removed += await this.subscriptions.remove({
          telegramId: input.telegramId,
          chatId: input.chatId,
          topic: subscription.topic,
        });
      }
    }

    for (const topic of requestedTopics) {
      if (!existingTopics.has(topic)) {
        const added = await this.subscriptions.add({
          telegramId: input.telegramId,
          chatId: input.chatId,
          topic,
        });

        if (added) {
          created += 1;
        }
      }
    }

    return {
      created,
      removed,
      unchanged: requestedTopics.length - created,
    };
  }

  async unsubscribe(input: SubscriptionCommandInput): Promise<number> {
    return this.subscriptions.remove(input);
  }

  async unsubscribeAll(telegramId: number, chatId: number): Promise<number> {
    return this.subscriptions.removeAllForChat(telegramId, chatId);
  }

  async listForChat(telegramId: number, chatId: number): Promise<Subscription[]> {
    return this.subscriptions.listForChat(telegramId, chatId);
  }

  async listDeliveryTargets(): Promise<SubscriptionTarget[]> {
    return this.subscriptions.listDeliveryTargets();
  }
}
