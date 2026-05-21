export const commoditySymbols = [
  "gold",
  "silver",
  "platinum",
  "palladium",
  "copper",
  "gasoline",
  "diesel",
  "crude_oil",
] as const;

export type CommoditySymbol = (typeof commoditySymbols)[number];

export const subscriptionTopics = ["gold", "fuel", "exchange_rates", "crypto", "stocks", "metals", "oil", "all"] as const;
export type SubscriptionTopic = (typeof subscriptionTopics)[number];

export const alertDirections = ["above", "below"] as const;
export type AlertDirection = (typeof alertDirections)[number];

export interface PriceQuote {
  symbol: CommoditySymbol;
  name: string;
  price: number;
  currency: string;
  unit: string;
  source: string;
  sourceUrl: string;
  observedAt: string;
  change?: number;
  changePercent?: number;
}

export interface TelegramUser {
  telegramId: number;
  chatId: number;
  username?: string;
  firstName?: string;
  lastName?: string;
  languageCode?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Subscription {
  id: number;
  telegramId: number;
  chatId: number;
  topic: SubscriptionTopic;
  createdAt: string;
}

export interface SubscriptionTarget {
  chatId: number;
  topic: SubscriptionTopic;
}

export interface PriceAlert {
  id: number;
  telegramId: number;
  chatId: number;
  symbol: CommoditySymbol;
  direction: AlertDirection;
  threshold: number;
  currency: string;
  active: boolean;
  lastPrice?: number;
  triggeredAt?: string;
  createdAt: string;
  updatedAt: string;
}
