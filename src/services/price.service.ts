import type { CommoditySymbol, PriceQuote } from "../types/domain.js";
import { saveFuelPrice } from "../db/index.js";
import { instruments } from "./instrument-registry.js";
import type { GoldService } from "./gold.service.js";
import type { EiaProvider } from "./price-providers/eia.provider.js";
import type { GiaXangHomNayProvider } from "./price-providers/gia-xang-hom-nay.provider.js";
import type { GoldApiProvider } from "./price-providers/gold-api.provider.js";

interface CachedQuote {
  expiresAt: number;
  quote: PriceQuote;
}

export interface AvailableQuotesResult {
  quotes: PriceQuote[];
  failures: string[];
}

export class PriceService {
  private readonly cache = new Map<CommoditySymbol, CachedQuote>();

  constructor(
    private readonly goldApiProvider: GoldApiProvider,
    private readonly eiaProvider: EiaProvider,
    private readonly giaXangHomNayProvider: GiaXangHomNayProvider,
    private readonly goldService: GoldService,
    private readonly cacheTtlMs: number,
  ) {}

  async getQuote(symbol: CommoditySymbol): Promise<PriceQuote> {
    const cached = this.cache.get(symbol);
    const now = Date.now();

    if (cached && cached.expiresAt > now) {
      return cached.quote;
    }

    const instrument = instruments[symbol];
    const quote =
      symbol === "gold"
        ? (await this.goldService.getFallbackGoldPrice()).quote
        : symbol === "gasoline" || symbol === "diesel"
          ? await this.fetchVietnamFuelQuoteWithFallback(symbol)
        : instrument.provider === "gold-api"
          ? await this.goldApiProvider.fetchQuote(symbol)
          : await this.eiaProvider.fetchQuote(symbol);

    if (symbol !== "gold") {
      this.saveFetchedQuote(quote);
    }

    this.cache.set(symbol, {
      quote,
      expiresAt: now + this.cacheTtlMs,
    });

    return quote;
  }

  async getQuotes(symbols: CommoditySymbol[]): Promise<PriceQuote[]> {
    return Promise.all([...new Set(symbols)].map((symbol) => this.getQuote(symbol)));
  }

  async getAvailableQuotes(symbols: CommoditySymbol[]): Promise<AvailableQuotesResult> {
    const uniqueSymbols = [...new Set(symbols)];
    const results = await Promise.allSettled(
      uniqueSymbols.map(async (symbol) => ({
        symbol,
        quote: await this.getQuote(symbol),
      })),
    );

    const quotes: PriceQuote[] = [];
    const failures: string[] = [];

    results.forEach((result, index) => {
      const symbol = uniqueSymbols[index];

      if (result.status === "fulfilled") {
        quotes.push(result.value.quote);
      } else {
        failures.push(instruments[symbol].displayName);
      }
    });

    return { quotes, failures };
  }

  private saveFetchedQuote(quote: PriceQuote): void {
    if (quote.symbol === "gasoline" || quote.symbol === "diesel" || quote.symbol === "crude_oil") {
      saveFuelPrice({
        source: quote.source,
        fuelType: quote.symbol,
        price: quote.price,
        region: quote.currency === "VND" ? "VN" : "US",
        rawJson: quote,
      });
    }
  }

  private async fetchVietnamFuelQuoteWithFallback(symbol: "gasoline" | "diesel"): Promise<PriceQuote> {
    try {
      return await this.giaXangHomNayProvider.fetchQuote(symbol);
    } catch {
      return this.eiaProvider.fetchQuote(symbol);
    }
  }
}
