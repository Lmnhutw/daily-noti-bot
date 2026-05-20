import type { Subscription, SubscriptionTarget, SubscriptionTopic } from "../types/domain.js";
import type { SubscriptionRepository } from "../storage/subscription.repository.js";

export interface SubscriptionCommandInput {
  telegramId: number;
  chatId: number;
  topic: SubscriptionTopic;
}

export class SubscriptionService {
  constructor(private readonly subscriptions: SubscriptionRepository) {}

  async subscribe(input: SubscriptionCommandInput): Promise<void> {
    await this.subscriptions.add(input);
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
