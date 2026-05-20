import { env } from "../config/env.js";
import type { GoldPriceProvider, NormalizedGoldPrice } from "../interfaces/gold.interface.js";
import { fetchHtml, fetchJson, normalizeApiGoldPrice, normalizeHtmlGoldPrice, withRetry } from "./provider-utils.js";

export class MihongProvider implements GoldPriceProvider {
  readonly id = "mihong";
  readonly name = "Mi Hong";

  async fetchGoldPrice(): Promise<NormalizedGoldPrice> {
    try {
      return await withRetry(this.name, env.GOLD_PROVIDER_RETRY_COUNT, () => this.fetchFromApi());
    } catch (apiError) {
      return withRetry(this.name, env.GOLD_PROVIDER_RETRY_COUNT, () => this.fetchFromHtml(apiError));
    }
  }

  private async fetchFromApi(): Promise<NormalizedGoldPrice> {
    const sourceUrl = env.MIHONG_DOMESTIC_GOLD_API_URL;
    const payload = await fetchJson(sourceUrl, this.id, {
      headers: {
        "content-type": "application/json",
        "x-market": "mihong",
        Referer: "https://www.mihong.vn/",
      },
    });

    return normalizeApiGoldPrice(payload, {
      providerId: this.id,
      provider: this.name,
      sourceUrl,
      preferredLabels: ["sjc", "mihong", "mi hong"],
      currency: "VND",
      unit: "luong",
      market: "domestic",
    });
  }

  private async fetchFromHtml(apiError: unknown): Promise<NormalizedGoldPrice> {
    const sourceUrl = env.MIHONG_GOLD_HTML_URL;
    const html = await fetchHtml(sourceUrl, this.id);
    const price = normalizeHtmlGoldPrice(html, {
      providerId: this.id,
      provider: this.name,
      sourceUrl,
      preferredLabels: ["sjc", "mihong", "mi hong"],
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
