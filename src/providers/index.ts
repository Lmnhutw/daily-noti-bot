import { env } from "../config/env.js";
import type { GoldPriceProvider, GoldProviderId } from "../interfaces/gold.interface.js";
import { DojiProvider } from "./doji.provider.js";
import { GlobalGoldProvider } from "./global.provider.js";
import { MihongProvider } from "./mihong.provider.js";
import { PnjProvider } from "./pnj.provider.js";
import { SjcProvider } from "./sjc.provider.js";

export function createGoldProviders(): GoldPriceProvider[] {
  const enabledProviders = parseProviderIds(env.GOLD_PROVIDERS_ENABLED);
  const providers: GoldPriceProvider[] = [
    new SjcProvider(),
    new MihongProvider(),
    new DojiProvider(),
    new PnjProvider(),
    new GlobalGoldProvider(),
  ];

  return providers.filter((provider) => enabledProviders.has(provider.id));
}

export function parseProviderIds(value: string): Set<GoldProviderId> {
  const providerIds = value
    .split(",")
    .map((provider) => provider.trim().toLowerCase())
    .filter(Boolean) as GoldProviderId[];

  return new Set(providerIds);
}
