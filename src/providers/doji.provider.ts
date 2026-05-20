import { env } from "../config/env.js";
import type { GoldPriceProvider, NormalizedGoldPrice } from "../interfaces/gold.interface.js";
import {
  fetchHtml,
  fetchJson,
  normalizeApiGoldPrice,
  normalizeHtmlGoldPrice,
  readOptionalEnvUrl,
  withRetry,
} from "./provider-utils.js";

export class DojiProvider implements GoldPriceProvider {
  readonly id = "doji";
  readonly name = "DOJI";

  async fetchGoldPrice(): Promise<NormalizedGoldPrice> {
    try {
      return await withRetry(this.name, env.GOLD_PROVIDER_RETRY_COUNT, () => this.fetchFromApi());
    } catch (apiError) {
      return withRetry(this.name, env.GOLD_PROVIDER_RETRY_COUNT, () => this.fetchFromHtml(apiError));
    }
  }

  private async fetchFromApi(): Promise<NormalizedGoldPrice> {
    const sourceUrl = readOptionalEnvUrl(env.DOJI_GOLD_API_URL);

    if (!sourceUrl) {
      throw new Error("DOJI_GOLD_API_URL is not configured");
    }

    const payload = await fetchJson(sourceUrl, this.id);

    return normalizeApiGoldPrice(payload, {
      providerId: this.id,
      provider: this.name,
      sourceUrl,
      preferredLabels: ["sjc", "doji"],
      currency: "VND",
      unit: "luong",
      market: "domestic",
    });
  }

  private async fetchFromHtml(apiError: unknown): Promise<NormalizedGoldPrice> {
    const sourceUrl = env.DOJI_GOLD_HTML_URL;
    const html = await fetchHtml(sourceUrl, this.id);
    const price = normalizeHtmlGoldPrice(html, {
      providerId: this.id,
      provider: this.name,
      sourceUrl,
      preferredLabels: ["sjc", "doji"],
      currency: "VND",
      unit: "luong",
      market: "domestic",
    });

    return {
      ...price,
      metadata: {
        ...price.metadata,
        apiError: apiError instanceof Error ? apiError.message : String(apiError),
      },
    };
  }
}
