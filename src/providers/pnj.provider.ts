import { env } from "../config/env.js";
import type { GoldPriceProvider, NormalizedGoldPrice } from "../interfaces/gold.interface.js";
import { fetchGoldPriceFromSources, sourceUrls, withRetry } from "./provider-utils.js";

export class PnjProvider implements GoldPriceProvider {
  readonly id = "pnj";
  readonly name = "PNJ";

  async fetchGoldPrice(): Promise<NormalizedGoldPrice> {
    return withRetry(this.name, env.GOLD_PROVIDER_RETRY_COUNT, () =>
      fetchGoldPriceFromSources({
        providerId: this.id,
        provider: this.name,
        sourceUrls: sourceUrls(env.PNJ_GOLD_API_URL, env.PNJ_GOLD_SOURCE_URLS, env.PNJ_GOLD_HTML_URL),
        preferredLabels: ["pnj", "pqh nvm", "pqhnvm", "pqhn24ntt"],
        currency: "VND",
        unit: "luong",
        market: "domestic",
      }),
    );
  }
}
