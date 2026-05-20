import { env } from "../config/env.js";
import type { GoldPriceProvider, NormalizedGoldPrice } from "../interfaces/gold.interface.js";
import { fetchGoldPriceFromSources, sourceUrls, withRetry } from "./provider-utils.js";

export class SjcProvider implements GoldPriceProvider {
  readonly id = "sjc";
  readonly name = "SJC";

  async fetchGoldPrice(): Promise<NormalizedGoldPrice> {
    return withRetry(this.name, env.GOLD_PROVIDER_RETRY_COUNT, () =>
      fetchGoldPriceFromSources({
        providerId: this.id,
        provider: this.name,
        sourceUrls: sourceUrls(env.SJC_GOLD_API_URL, env.SJC_GOLD_SOURCE_URLS, env.SJC_GOLD_HTML_URL),
        preferredLabels: ["sjc", "sjl1l10", "vangmiengsjc", "vàngmiếngsjc"],
        currency: "VND",
        unit: "luong",
        market: "domestic",
      }),
    );
  }
}
