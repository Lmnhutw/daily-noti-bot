import type { PriceQuote } from "../types/domain.js";

export type GoldProviderId = "sjc" | "mihong" | "doji" | "pnj" | "global";

export interface NormalizedGoldPrice {
  provider: string;
  buyPrice: number;
  sellPrice: number;
  updatedAt: string;
  metadata?: Record<string, unknown>;
}

export interface GoldPriceProvider {
  id: GoldProviderId;
  name: string;
  fetchGoldPrice: () => Promise<NormalizedGoldPrice>;
}

export interface GoldProviderFailure {
  providerId: GoldProviderId;
  provider: string;
  message: string;
}

export interface GoldProviderResult {
  providerId: GoldProviderId;
  provider: string;
  price?: NormalizedGoldPrice;
  failure?: GoldProviderFailure;
}

export interface GoldPriceComparison {
  highestBuyPrice?: NormalizedGoldPrice;
  lowestSellPrice?: NormalizedGoldPrice;
  localPrices: NormalizedGoldPrice[];
  otherPrices: NormalizedGoldPrice[];
}

export interface GoldAggregationResult {
  providerResults: GoldProviderResult[];
  prices: NormalizedGoldPrice[];
  failures: GoldProviderFailure[];
  comparison: GoldPriceComparison;
  fetchedAt: string;
  fromCache: boolean;
}

export interface GoldFallbackResult {
  price: NormalizedGoldPrice;
  quote: PriceQuote;
}
