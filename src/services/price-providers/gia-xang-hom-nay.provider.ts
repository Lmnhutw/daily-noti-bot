import axios from "axios";
import { env } from "../../config/env.js";
import type { CommoditySymbol, PriceQuote } from "../../types/domain.js";
import { dateKeyForTimeZone } from "../../utils/date.js";

type UnknownRecord = Record<string, unknown>;

interface FuelPriceItem {
  title: string;
  price: number;
  region: string;
  date?: string;
  updatedAt?: string;
  raw: UnknownRecord;
}

const fuelMatchers = {
  gasoline: ["xang ron 95-iii", "xang ron 95", "xang e5 ron 92"],
  diesel: ["do 0,05s-ii", "dau do 0,05s-ii", "do 0,001s-v"],
} satisfies Partial<Record<CommoditySymbol, string[]>>;

export class GiaXangHomNayProvider {
  private cache?: {
    expiresAt: number;
    dateKey: string;
    items: FuelPriceItem[];
    sourceUrl: string;
  };

  async fetchQuote(symbol: CommoditySymbol): Promise<PriceQuote> {
    if (symbol !== "gasoline" && symbol !== "diesel") {
      throw new Error(`${symbol} is not served by Gia Xang Hom Nay`);
    }

    const dateKey = dateKeyForTimeZone(new Date(), env.FUEL_PRICE_TIMEZONE);
    const { items, sourceUrl } = await this.fetchItems(dateKey);
    const item = findFuelItem(items, symbol);

    if (!item) {
      throw new Error(`Gia Xang Hom Nay returned no ${symbol} price for ${dateKey}`);
    }

    return {
      symbol,
      name: item.title,
      price: item.price,
      currency: "VND",
      unit: "l\u00edt",
      source: "Gi\u00e1 X\u0103ng H\u00f4m Nay",
      sourceUrl,
      observedAt: parseVietnameseDateTime(item.date ?? item.updatedAt) ?? new Date().toISOString(),
    };
  }

  private async fetchItems(dateKey: string): Promise<{ items: FuelPriceItem[]; sourceUrl: string }> {
    const cached = this.cache;
    const now = Date.now();

    if (cached && cached.dateKey === dateKey && cached.expiresAt > now) {
      return {
        items: cached.items,
        sourceUrl: cached.sourceUrl,
      };
    }

    const sourceUrl = buildFuelApiUrl(env.FUEL_PRICE_API_URL_TEMPLATE, dateKey);
    const response = await axios.get<unknown>(sourceUrl, {
      timeout: env.HTTP_TIMEOUT_MS,
      headers: {
        accept: "application/json",
      },
    });
    const items = normalizeGiaXangResponse(response.data);

    this.cache = {
      dateKey,
      sourceUrl,
      items,
      expiresAt: now + env.PRICE_CACHE_TTL_SECONDS * 1000,
    };

    return { items, sourceUrl };
  }
}

export function buildFuelApiUrl(template: string, dateKey: string): string {
  const [year, month, day] = dateKey.split("-");

  return template
    .replaceAll("{{date}}", dateKey)
    .replaceAll("{{YYYY}-{MM}-{DD}}", dateKey)
    .replaceAll("{{YYYY}}", year)
    .replaceAll("{{MM}}", month)
    .replaceAll("{{DD}}", day);
}

export function normalizeGiaXangResponse(payload: unknown): FuelPriceItem[] {
  const parsed = parseJsonPayload(payload);
  const groups = Array.isArray(parsed) ? parsed : asRecord(parsed).value;

  if (!Array.isArray(groups)) {
    throw new Error("Gia Xang Hom Nay response is missing value groups");
  }

  return groups
    .flatMap((group) => (Array.isArray(group) ? group : []))
    .map(asRecord)
    .map(toFuelPriceItem)
    .filter((item): item is FuelPriceItem => item !== undefined);
}

function parseJsonPayload(payload: unknown): unknown {
  if (typeof payload !== "string") {
    return payload;
  }

  return JSON.parse(payload) as unknown;
}

function toFuelPriceItem(row: UnknownRecord): FuelPriceItem | undefined {
  const title = readString(row, "title");
  const price = readNumber(row, "zone1_price") ?? readNumber(row, "price");

  if (!title || price === undefined) {
    return undefined;
  }

  return {
    title,
    price,
    region: row.zone1_price !== undefined ? "VN-zone-1" : "VN",
    date: readString(row, "date"),
    updatedAt: readString(row, "updated_at") ?? readString(row, "created_at"),
    raw: row,
  };
}

function findFuelItem(items: FuelPriceItem[], symbol: "gasoline" | "diesel"): FuelPriceItem | undefined {
  const matchers = fuelMatchers[symbol];

  for (const matcher of matchers) {
    const item = items.find((candidate) => normalizeText(candidate.title).includes(matcher));

    if (item) {
      return item;
    }
  }

  return undefined;
}

function asRecord(value: unknown): UnknownRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Gia Xang Hom Nay returned an invalid response");
  }

  return value as UnknownRecord;
}

function readString(row: UnknownRecord, key: string): string | undefined {
  const value = row[key];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function readNumber(row: UnknownRecord, key: string): number | undefined {
  const value = row[key];

  if (value === null || value === undefined || value === "") {
    return undefined;
  }

  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : undefined;
}

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function parseVietnameseDateTime(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  const normalized = value.trim().replace(" ", "T");
  const parsed = new Date(`${normalized}+07:00`);

  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
}
