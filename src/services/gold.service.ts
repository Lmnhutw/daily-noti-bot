import type { PriceHistoryRepository } from "../db/index.js";
import type {
  GoldAggregationResult,
  GoldFallbackResult,
  GoldPriceComparison,
  GoldPriceProvider,
  GoldProviderFailure,
  GoldProviderResult,
  GoldProviderId,
  NormalizedGoldPrice,
} from "../interfaces/gold.interface.js";
import type { PriceQuote } from "../types/domain.js";
import { logger } from "../utils/logger.js";

interface GoldCacheEntry {
  expiresAt: number;
  result: GoldAggregationResult;
}

export class GoldService {
  private cache?: GoldCacheEntry;

  constructor(
    private readonly providers: GoldPriceProvider[],
    private readonly cacheTtlMs: number,
    private readonly fallbackOrder: GoldProviderId[],
    private readonly priceHistory: PriceHistoryRepository,
  ) {}

  async getAllGoldPrices(forceRefresh = false): Promise<GoldAggregationResult> {
    const now = Date.now();

    if (!forceRefresh && this.cache && this.cache.expiresAt > now) {
      return {
        ...this.cache.result,
        fromCache: true,
      };
    }

    const results = await Promise.all(this.providers.map((provider) => this.fetchProvider(provider)));
    const prices = results.flatMap((result) => (result.price ? [result.price] : []));
    const failures = results.flatMap((result) => (result.failure ? [result.failure] : []));
    const result: GoldAggregationResult = {
      providerResults: results,
      prices,
      failures,
      comparison: compareGoldPrices(prices),
      fetchedAt: new Date().toISOString(),
      fromCache: false,
    };

    this.cache = {
      expiresAt: now + this.cacheTtlMs,
      result,
    };

    return result;
  }

  async getFallbackGoldPrice(): Promise<GoldFallbackResult> {
    const result = await this.getAllGoldPrices();
    const price = this.pickFallbackPrice(result.prices);

    if (!price) {
      throw new Error("All gold providers failed");
    }

    return {
      price,
      quote: toPriceQuote(price),
    };
  }

  private async fetchProvider(provider: GoldPriceProvider): Promise<GoldProviderResult> {
    try {
      const price = await provider.fetchGoldPrice();
      await this.saveFetchedPrice(price);

      return {
        providerId: provider.id,
        provider: provider.name,
        price,
      };
    } catch (error) {
      logger.warn({ error, provider: provider.id }, "Gold provider failed");

      return {
        providerId: provider.id,
        provider: provider.name,
        failure: {
          providerId: provider.id,
          provider: provider.name,
          message: error instanceof Error ? error.message : String(error),
        },
      };
    }
  }

  private async saveFetchedPrice(price: NormalizedGoldPrice): Promise<void> {
    try {
      await this.priceHistory.saveGoldPrice({
        source: price.provider,
        buyPrice: price.buyPrice,
        sellPrice: price.sellPrice,
        unit: String(price.metadata?.unit ?? "luong"),
        rawJson: price,
      });
    } catch (error) {
      logger.warn({ error, provider: price.provider }, "Failed to persist gold provider price");
    }
  }

  private pickFallbackPrice(prices: NormalizedGoldPrice[]): NormalizedGoldPrice | undefined {
    for (const providerId of this.fallbackOrder) {
      const price = prices.find((item) => item.metadata?.providerId === providerId);

      if (price) {
        return price;
      }
    }

    return prices[0];
  }
}

export function compareGoldPrices(prices: NormalizedGoldPrice[]): GoldPriceComparison {
  const localPrices = prices.filter(
    (price) =>
      price.metadata?.currency === "VND" &&
      (price.metadata?.unit === "luong" || price.metadata?.unit === "tael"),
  );
  const otherPrices = prices.filter((price) => !localPrices.includes(price));

  return {
    highestBuyPrice: maxBy(localPrices, (price) => price.buyPrice),
    lowestSellPrice: minBy(localPrices, (price) => price.sellPrice),
    localPrices,
    otherPrices,
  };
}

function toPriceQuote(price: NormalizedGoldPrice): PriceQuote {
  const currency = typeof price.metadata?.currency === "string" ? price.metadata.currency : "VND";
  const unit = typeof price.metadata?.unit === "string" ? price.metadata.unit : "luong";

  return {
    symbol: "gold",
    name: `${price.provider} gold`,
    price: price.sellPrice,
    currency,
    unit,
    source: price.provider,
    sourceUrl: typeof price.metadata?.sourceUrl === "string" ? price.metadata.sourceUrl : "",
    observedAt: price.updatedAt,
  };
}

function maxBy<T>(items: T[], selector: (item: T) => number): T | undefined {
  return items.reduce<T | undefined>((best, item) => {
    if (!best || selector(item) > selector(best)) {
      return item;
    }

    return best;
  }, undefined);
}

function minBy<T>(items: T[], selector: (item: T) => number): T | undefined {
  return items.reduce<T | undefined>((best, item) => {
    if (!best || selector(item) < selector(best)) {
      return item;
    }

    return best;
  }, undefined);
}
