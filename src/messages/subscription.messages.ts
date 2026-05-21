import { InlineKeyboard } from "grammy";
import type { SubscriptionTopic } from "../types/domain.js";

export const selectableSubscriptionTopics = [
  "gold",
  "fuel",
  "exchange_rates",
  "crypto",
  "stocks",
] as const satisfies readonly SubscriptionTopic[];

export const subscriptionSelectionTtlMs = 15 * 60 * 1000;

const topicLabels = {
  gold: "Gold prices",
  fuel: "Fuel prices",
  exchange_rates: "Exchange rates",
  crypto: "Crypto prices",
  stocks: "Stock prices",
  metals: "Metals prices",
  oil: "Oil prices",
  all: "All price updates",
} satisfies Record<SubscriptionTopic, string>;

const buttonLabels = {
  gold: "Gold",
  fuel: "Fuel",
  exchange_rates: "Exchange Rates",
  crypto: "Crypto",
  stocks: "Stocks",
} satisfies Record<(typeof selectableSubscriptionTopics)[number], string>;

export function formatSubscriptionTopic(topic: SubscriptionTopic): string {
  return topicLabels[topic];
}

export function formatSubscriptionTopics(topics: SubscriptionTopic[]): string {
  return topics.map(formatSubscriptionTopic).join(", ");
}

export function formatSubscriptionSelectionMessage(selectedTopics: SubscriptionTopic[]): string {
  const current =
    selectedTopics.length > 0 ? `\n\nSelected: ${formatSubscriptionTopics(selectedTopics)}` : "\n\nSelected: none yet";

  return `🔔 Choose topics for daily updates.${current}`;
}

export function formatCurrentSubscriptions(topics: SubscriptionTopic[]): string {
  return topics.length > 0
    ? `🔔 Current subscriptions: ${formatSubscriptionTopics(topics)}`
    : "🔔 Current subscriptions: none";
}

export function buildSubscriptionSelectionKeyboard(stateId: string, selectedTopics: SubscriptionTopic[]): InlineKeyboard {
  const selected = new Set(selectedTopics);

  return new InlineKeyboard()
    .text(topicButtonLabel("gold", selected), callbackData("toggle", stateId, "gold"))
    .text(topicButtonLabel("fuel", selected), callbackData("toggle", stateId, "fuel"))
    .row()
    .text(topicButtonLabel("exchange_rates", selected), callbackData("toggle", stateId, "exchange_rates"))
    .text(topicButtonLabel("crypto", selected), callbackData("toggle", stateId, "crypto"))
    .row()
    .text(topicButtonLabel("stocks", selected), callbackData("toggle", stateId, "stocks"))
    .row()
    .text("Confirm", callbackData("confirm", stateId))
    .text("Cancel", callbackData("cancel", stateId));
}

export function subscriptionSelectionCallbackPattern(): RegExp {
  return /^sub:(toggle|confirm|cancel):([^:]+)(?::([a-z_]+))?$/;
}

export function parseSubscriptionSelectionCallback(data: string):
  | { action: "toggle"; stateId: string; topic: SubscriptionTopic }
  | { action: "confirm" | "cancel"; stateId: string }
  | undefined {
  const match = subscriptionSelectionCallbackPattern().exec(data);

  if (!match) {
    return undefined;
  }

  const [, action, stateId, topic] = match;

  if (action === "toggle") {
    if (!isSelectableSubscriptionTopic(topic)) {
      return undefined;
    }

    return { action, stateId, topic };
  }

  if (action === "confirm" || action === "cancel") {
    return { action, stateId };
  }

  return undefined;
}

export function isSelectableSubscriptionTopic(topic: string | undefined): topic is (typeof selectableSubscriptionTopics)[number] {
  return selectableSubscriptionTopics.includes(topic as (typeof selectableSubscriptionTopics)[number]);
}

export function selectableTopicsFromExisting(topics: SubscriptionTopic[]): SubscriptionTopic[] {
  const selected = new Set<SubscriptionTopic>();

  for (const topic of topics) {
    if (topic === "all") {
      selectableSubscriptionTopics.forEach((selectableTopic) => selected.add(selectableTopic));
      continue;
    }

    if (topic === "metals") {
      selected.add("gold");
      continue;
    }

    if (topic === "oil") {
      selected.add("fuel");
      continue;
    }

    if (isSelectableSubscriptionTopic(topic)) {
      selected.add(topic);
    }
  }

  return selectableSubscriptionTopics.filter((topic) => selected.has(topic));
}

function callbackData(action: "toggle" | "confirm" | "cancel", stateId: string, topic?: SubscriptionTopic): string {
  return ["sub", action, stateId, topic].filter(Boolean).join(":");
}

function topicButtonLabel(topic: (typeof selectableSubscriptionTopics)[number], selected: Set<SubscriptionTopic>): string {
  return `${selected.has(topic) ? "✅" : "⬜"} ${buttonLabels[topic]}`;
}
