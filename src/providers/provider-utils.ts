import axios, { type AxiosRequestConfig } from "axios";
import * as cheerio from "cheerio";
import { env } from "../config/env.js";
import type { GoldProviderId, NormalizedGoldPrice } from "../interfaces/gold.interface.js";

type UnknownRecord = Record<string, unknown>;

interface NormalizeOptions {
  providerId: GoldProviderId;
  provider: string;
  sourceUrl: string;
  preferredLabels?: string[];
  currency?: string;
  unit?: string;
  market?: string;
}

interface SourceFetchOptions extends Omit<NormalizeOptions, "sourceUrl"> {
  sourceUrls: string[];
}

const buyKeys = [
  "buyPrice",
  "buy_price",
  "buy",
  "mua",
  "giaMua",
  "gia_mua",
  "buying",
  "buyingPrice",
  "buying_price",
  "purchasePrice",
  "purchase_price",
];

const sellKeys = [
  "sellPrice",
  "sell_price",
  "sell",
  "ban",
  "giaBan",
  "gia_ban",
  "selling",
  "sellingPrice",
  "selling_price",
  "salePrice",
  "sale_price",
];

const labelKeys = ["name", "type", "type_code", "product", "productName", "goldType", "brand", "code", "symbol"];
const updatedAtKeys = [
  "updatedAt",
  "updated_at",
  "updateTime",
  "update_time",
  "time",
  "timestamp",
  "date",
  "dateTime",
];

export async function withRetry<T>(provider: string, attempts: number, operation: () => Promise<T>): Promise<T> {
  let lastError: unknown;

  for (let index = 0; index < Math.max(1, attempts); index += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      if (index < attempts - 1) {
        await delay(250 * (index + 1));
      }
    }
  }

  throw new Error(`${provider} request failed after ${attempts} attempt${attempts === 1 ? "" : "s"}`, {
    cause: lastError,
  });
}

export async function fetchJson(url: string, providerId: GoldProviderId, config: AxiosRequestConfig = {}): Promise<unknown> {
  const response = await axios.get<unknown>(url, {
    ...config,
    timeout: env.HTTP_TIMEOUT_MS,
    headers: {
      ...browserHeaders(),
      ...providerHeaders(providerId),
      ...config.headers,
    },
  });

  return response.data;
}

export async function fetchHtml(url: string, providerId: GoldProviderId): Promise<string> {
  const response = await axios.get<string>(url, {
    timeout: env.HTTP_TIMEOUT_MS,
    headers: {
      ...browserHeaders(),
      ...providerHeaders(providerId),
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
  });

  return response.data;
}

export async function fetchGoldPriceFromSources(options: SourceFetchOptions): Promise<NormalizedGoldPrice> {
  const errors: string[] = [];

  for (const sourceUrl of options.sourceUrls) {
    try {
      return await fetchGoldPriceFromSource(sourceUrl, options);
    } catch (error) {
      errors.push(`${sourceUrl}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  throw new Error(`${options.provider} did not return usable data from any configured source: ${errors.join("; ")}`);
}

export function sourceUrls(...values: Array<string | undefined>): string[] {
  return [
    ...new Set(
      values
        .flatMap((value) => (value ?? "").split(/[\n,]+/))
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  ];
}

async function fetchGoldPriceFromSource(
  sourceUrl: string,
  options: Omit<SourceFetchOptions, "sourceUrls">,
): Promise<NormalizedGoldPrice> {
  try {
    const payload = await fetchJson(sourceUrl, options.providerId);
    return normalizeApiGoldPrice(payload, {
      ...options,
      sourceUrl,
    });
  } catch (apiError) {
    const html = await fetchHtml(sourceUrl, options.providerId);
    const price = normalizeHtmlGoldPrice(html, {
      ...options,
      sourceUrl,
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

export function normalizeApiGoldPrice(payload: unknown, options: NormalizeOptions): NormalizedGoldPrice {
  const records = collectRecords(payload);
  const candidate =
    findPreferredRecord(records, options.preferredLabels ?? []) ?? records.find(hasBuyAndSell) ?? asRecord(payload);
  const buyPrice = readPrice(candidate, buyKeys, options.currency, options.unit);
  const sellPrice = readPrice(candidate, sellKeys, options.currency, options.unit);

  if (buyPrice === undefined || sellPrice === undefined) {
    throw new Error(`${options.provider} response did not include buy and sell prices`);
  }

  assertValidPriceRange(options.provider, buyPrice, sellPrice, options.currency, options.unit);

  return {
    provider: options.provider,
    buyPrice,
    sellPrice,
    updatedAt: readUpdatedAt(candidate) ?? new Date().toISOString(),
    metadata: {
      providerId: options.providerId,
      sourceUrl: options.sourceUrl,
      currency: options.currency ?? "VND",
      unit: options.unit ?? "luong",
      market: options.market,
      label: recordLabel(candidate),
    },
  };
}

export function normalizeHtmlGoldPrice(html: string, options: NormalizeOptions): NormalizedGoldPrice {
  const $ = cheerio.load(html);
  const candidateText = findHtmlCandidateText($, options.preferredLabels ?? [], options.currency, options.unit);

  if (!candidateText) {
    throw new Error(`${options.provider} HTML fallback did not include a recognizable gold price row`);
  }

  const prices = extractPricesFromText(candidateText, options.currency, options.unit);

  if (prices.length < 2) {
    throw new Error(`${options.provider} HTML fallback did not include enough price values`);
  }

  const [firstPrice, secondPrice] = prices;
  const buyPrice = Math.min(firstPrice, secondPrice);
  const sellPrice = Math.max(firstPrice, secondPrice);

  assertValidPriceRange(options.provider, buyPrice, sellPrice, options.currency, options.unit);

  return {
    provider: options.provider,
    buyPrice,
    sellPrice,
    updatedAt: new Date().toISOString(),
    metadata: {
      providerId: options.providerId,
      sourceUrl: options.sourceUrl,
      currency: options.currency ?? "VND",
      unit: options.unit ?? "luong",
      market: options.market,
      source: "html-fallback",
    },
  };
}

export function readOptionalEnvUrl(value: string | undefined): string | undefined {
  return value && value.trim().length > 0 ? value.trim() : undefined;
}

function collectRecords(value: unknown): UnknownRecord[] {
  if (Array.isArray(value)) {
    return value.flatMap(collectRecords);
  }

  if (!value || typeof value !== "object") {
    return [];
  }

  const record = value as UnknownRecord;
  const nestedKeys = ["data", "items", "prices", "results", "result", "rows"];
  const nested = nestedKeys.flatMap((key) => collectRecords(record[key]));

  return [record, ...nested];
}

function findPreferredRecord(records: UnknownRecord[], preferredLabels: string[]): UnknownRecord | undefined {
  const normalizedLabels = preferredLabels.map(normalizeLabel).filter(Boolean);

  if (normalizedLabels.length === 0) {
    return undefined;
  }

  return records.find((record) => {
    if (!hasBuyAndSell(record)) {
      return false;
    }

    const label = normalizeLabel(recordLabel(record));
    return normalizedLabels.some((preferredLabel) => label.includes(preferredLabel));
  });
}

function hasBuyAndSell(record: UnknownRecord): boolean {
  return readPrice(record, buyKeys, "VND", "luong") !== undefined && readPrice(record, sellKeys, "VND", "luong") !== undefined;
}

function asRecord(value: unknown): UnknownRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Gold provider returned an invalid response");
  }

  return value as UnknownRecord;
}

function readPrice(record: UnknownRecord, keys: string[], currency = "VND", unit = "luong"): number | undefined {
  for (const key of keys) {
    const parsed = parsePrice(record[key]);

    if (parsed !== undefined) {
      return currency === "VND" ? normalizeVndPrice(parsed, unit) : parsed;
    }
  }

  return undefined;
}

function parsePrice(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value !== "string") {
    return undefined;
  }

  const cleaned = value.replace(/[^\d.,-]/g, "").trim();

  if (!cleaned) {
    return undefined;
  }

  const lastComma = cleaned.lastIndexOf(",");
  const lastDot = cleaned.lastIndexOf(".");
  let normalized = cleaned;

  if (lastComma !== -1 && lastDot !== -1) {
    const decimalSeparator = lastComma > lastDot ? "," : ".";
    const thousandSeparator = decimalSeparator === "," ? "." : ",";
    normalized = cleaned.replaceAll(thousandSeparator, "").replace(decimalSeparator, ".");
  } else if (lastComma !== -1) {
    normalized = normalizeSingleSeparator(cleaned, ",");
  } else if (lastDot !== -1) {
    normalized = normalizeSingleSeparator(cleaned, ".");
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function normalizeSingleSeparator(value: string, separator: "," | "."): string {
  const parts = value.split(separator);

  if (parts.length > 2) {
    return parts.join("");
  }

  const [integerPart, decimalPart] = parts;

  if (decimalPart.length === 3 && integerPart.length <= 3) {
    return `${integerPart}${decimalPart}`;
  }

  return `${integerPart}.${decimalPart}`;
}

function normalizeVndPrice(value: number, unit = "luong"): number {
  let normalized = value;

  if (value > 0 && value < 1_000) {
    normalized = value * 1_000_000;
  } else if (value >= 1_000 && value < 1_000_000) {
    normalized = value * 1_000;
  }

  if (isVndPerLuongUnit(unit) && normalized > 0 && normalized < 50_000_000) {
    return normalized * 10;
  }

  return normalized;
}

function extractPricesFromText(text: string, currency = "VND", unit = "luong"): number[] {
  const matches = text.match(/\d{1,3}(?:[.,]\d{3})+(?:[.,]\d+)?|\d+(?:[.,]\d+)?/g) ?? [];
  const values = matches
    .map(parsePrice)
    .filter((value): value is number => value !== undefined)
    .map((value) => (currency === "VND" ? normalizeVndPrice(value, unit) : value))
    .filter((value) => (currency === "VND" ? value >= 50_000_000 && value <= 300_000_000 : value >= 100));

  return [...new Set(values)];
}

function findHtmlCandidateText(
  $: cheerio.CheerioAPI,
  preferredLabels: string[],
  currency = "VND",
  unit = "luong",
): string | undefined {
  const normalizedLabels = preferredLabels.map(normalizeLabel).filter(Boolean);
  const selectors = [
    "tr",
    "li",
    "article",
    "section",
    ".row",
    ".card",
    "[class*=item]",
    "[class*=gold]",
    "[class*=price]",
    "[class*=gia]",
  ];

  for (const selector of selectors) {
    const elements = $(selector).toArray();

    for (const element of elements) {
      const text = $(element).text().replace(/\s+/g, " ").trim();
      const normalizedText = normalizeLabel(text);

      if (text.length === 0 || extractPricesFromText(text, currency, unit).length < 2) {
        continue;
      }

      if (normalizedLabels.length === 0 || normalizedLabels.some((label) => normalizedText.includes(label))) {
        return text;
      }
    }
  }

  return undefined;
}

function readUpdatedAt(record: UnknownRecord): string | undefined {
  for (const key of updatedAtKeys) {
    const value = record[key];

    if (typeof value === "number" && Number.isFinite(value)) {
      return new Date(value < 10_000_000_000 ? value * 1000 : value).toISOString();
    }

    if (typeof value === "string" && value.trim().length > 0) {
      const numeric = Number(value);

      if (Number.isFinite(numeric)) {
        return new Date(numeric < 10_000_000_000 ? numeric * 1000 : numeric).toISOString();
      }

      const vietnameseDate = parseVietnameseDateTime(value);

      if (vietnameseDate) {
        return vietnameseDate;
      }

      const parsed = new Date(value);

      if (!Number.isNaN(parsed.getTime())) {
        return parsed.toISOString();
      }
    }
  }

  return undefined;
}

function parseVietnameseDateTime(value: string): string | undefined {
  const match = value.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{1,2}))?$/);

  if (!match) {
    return undefined;
  }

  const [, day, month, year, hour = "0", minute = "0"] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour) - 7, Number(minute)));

  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function assertValidPriceRange(
  provider: string,
  buyPrice: number,
  sellPrice: number,
  currency = "VND",
  unit = "luong",
): void {
  if (!Number.isFinite(buyPrice) || !Number.isFinite(sellPrice) || buyPrice <= 0 || sellPrice <= 0) {
    throw new Error(`${provider} returned invalid gold prices`);
  }

  if (sellPrice < buyPrice) {
    throw new Error(`${provider} returned sell price lower than buy price`);
  }

  if (currency === "VND" && isVndPerLuongUnit(unit)) {
    if (buyPrice < 50_000_000 || sellPrice > 300_000_000) {
      throw new Error(`${provider} returned prices outside expected VND-per-luong range`);
    }

    if (sellPrice - buyPrice > Math.max(15_000_000, buyPrice * 0.12)) {
      throw new Error(`${provider} returned an unrealistic buy/sell spread`);
    }
  }

  if (currency === "USD" && (buyPrice < 500 || sellPrice > 10_000)) {
    throw new Error(`${provider} returned prices outside expected USD spot range`);
  }
}

function isVndPerLuongUnit(unit: string): boolean {
  return unit === "luong" || unit === "tael";
}

function recordLabel(record: UnknownRecord): string {
  return labelKeys
    .map((key) => record[key])
    .filter((value): value is string => typeof value === "string")
    .join(" ");
}

function normalizeLabel(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function providerHeaders(providerId: GoldProviderId): Record<string, string> {
  if (!env.GOLD_PROVIDER_HEADERS_JSON) {
    return {};
  }

  const parsed = JSON.parse(env.GOLD_PROVIDER_HEADERS_JSON) as Record<string, unknown>;
  const providerSpecific = parsed[providerId];

  if (providerSpecific && typeof providerSpecific === "object" && !Array.isArray(providerSpecific)) {
    return stringRecord(providerSpecific as Record<string, unknown>);
  }

  return stringRecord(parsed);
}

function stringRecord(value: Record<string, unknown>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === "string"),
  );
}

function browserHeaders(): Record<string, string> {
  return {
    accept: "*/*",
    "accept-language": "en-US,en;q=0.9,vi;q=0.8",
    "cache-control": "no-cache",
    pragma: "no-cache",
    "user-agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36",
  };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
