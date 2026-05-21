import type { Context, SessionFlavor } from "grammy";
import type { SubscriptionTopic } from "./domain.js";

export interface SubscriptionSelectionSession {
  id: string;
  telegramId: number;
  chatId: number;
  selectedTopics: SubscriptionTopic[];
  expiresAt: number;
}

export interface SessionData {
  lastCommandAt?: string;
  subscriptionSelection?: SubscriptionSelectionSession;
}

export type BotContext = Context & SessionFlavor<SessionData>;

export function initialSession(): SessionData {
  return {};
}
