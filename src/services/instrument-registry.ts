import type { CommoditySymbol, SubscriptionTopic } from "../types/domain.js";

export type PriceProviderKind = "gold-api" | "eia";

export interface InstrumentDefinition {
  symbol: CommoditySymbol;
  displayName: string;
  provider: PriceProviderKind;
  providerSymbol: string;
  unit: string;
  currency: string;
  sourceName: string;
}

export const instruments = {
  gold: {
    symbol: "gold",
    displayName: "Gold",
    provider: "gold-api",
    providerSymbol: "XAU",
    unit: "troy oz",
    currency: "USD",
    sourceName: "Gold API",
  },
  silver: {
    symbol: "silver",
    displayName: "Silver",
    provider: "gold-api",
    providerSymbol: "XAG",
    unit: "troy oz",
    currency: "USD",
    sourceName: "Gold API",
  },
  platinum: {
    symbol: "platinum",
    displayName: "Platinum",
    provider: "gold-api",
    providerSymbol: "XPT",
    unit: "troy oz",
    currency: "USD",
    sourceName: "Gold API",
  },
  palladium: {
    symbol: "palladium",
    displayName: "Palladium",
    provider: "gold-api",
    providerSymbol: "XPD",
    unit: "troy oz",
    currency: "USD",
    sourceName: "Gold API",
  },
  copper: {
    symbol: "copper",
    displayName: "Copper",
    provider: "gold-api",
    providerSymbol: "HG",
    unit: "pound",
    currency: "USD",
    sourceName: "Gold API",
  },
  gasoline: {
    symbol: "gasoline",
    displayName: "U.S. regular gasoline",
    provider: "eia",
    providerSymbol: "PET.EMM_EPMR_PTE_NUS_DPG.W",
    unit: "gallon",
    currency: "USD",
    sourceName: "EIA Open Data",
  },
  diesel: {
    symbol: "diesel",
    displayName: "U.S. No. 2 diesel",
    provider: "eia",
    providerSymbol: "PET.EMD_EPD2D_PTE_NUS_DPG.W",
    unit: "gallon",
    currency: "USD",
    sourceName: "EIA Open Data",
  },
  crude_oil: {
    symbol: "crude_oil",
    displayName: "WTI crude oil",
    provider: "eia",
    providerSymbol: "PET.RWTC.D",
    unit: "barrel",
    currency: "USD",
    sourceName: "EIA Open Data",
  },
} satisfies Record<CommoditySymbol, InstrumentDefinition>;

const topicSymbols = {
  gold: ["gold"],
  fuel: ["gasoline", "diesel"],
  exchange_rates: [],
  crypto: [],
  stocks: [],
  metals: ["gold", "silver", "platinum", "palladium", "copper"],
  oil: ["crude_oil"],
  all: ["gold", "silver", "platinum", "palladium", "copper", "gasoline", "diesel", "crude_oil"],
} satisfies Record<SubscriptionTopic, CommoditySymbol[]>;

const symbolAliases: Record<string, CommoditySymbol> = {
  au: "gold",
  xau: "gold",
  gold: "gold",
  ag: "silver",
  xag: "silver",
  silver: "silver",
  xpt: "platinum",
  platinum: "platinum",
  xpd: "palladium",
  palladium: "palladium",
  hg: "copper",
  copper: "copper",
  gas: "gasoline",
  gasoline: "gasoline",
  petrol: "gasoline",
  diesel: "diesel",
  oil: "crude_oil",
  crude: "crude_oil",
  crudeoil: "crude_oil",
  wti: "crude_oil",
};

const topicAliases: Record<string, SubscriptionTopic> = {
  gold: "gold",
  fuel: "fuel",
  fuels: "fuel",
  gas: "fuel",
  gasoline: "fuel",
  diesel: "fuel",
  exchangerate: "exchange_rates",
  exchangerates: "exchange_rates",
  exchange: "exchange_rates",
  fx: "exchange_rates",
  forex: "exchange_rates",
  currency: "exchange_rates",
  currencies: "exchange_rates",
  crypto: "crypto",
  cryptocurrency: "crypto",
  cryptocurrencies: "crypto",
  bitcoin: "crypto",
  btc: "crypto",
  stock: "stocks",
  stocks: "stocks",
  equity: "stocks",
  equities: "stocks",
  metal: "metals",
  metals: "metals",
  oil: "oil",
  crude: "oil",
  all: "all",
};

export function symbolsForTopic(topic: SubscriptionTopic): CommoditySymbol[] {
  return [...topicSymbols[topic]];
}

export function normalizeCommoditySymbol(input: string | undefined): CommoditySymbol | undefined {
  if (!input) {
    return undefined;
  }

  return symbolAliases[input.toLowerCase().replace(/[^a-z0-9]/g, "")];
}

export function normalizeSubscriptionTopic(input: string | undefined): SubscriptionTopic | undefined {
  if (!input) {
    return undefined;
  }

  return topicAliases[input.toLowerCase().replace(/[^a-z0-9]/g, "")];
}

export function supportedAlertSymbols(): string {
  return Object.keys(symbolAliases)
    .filter((value) => value.length > 2)
    .sort()
    .join(", ");
}
