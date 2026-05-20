import axios from "axios";
import { env } from "../../config/env.js";
import type { CommoditySymbol, PriceQuote } from "../../types/domain.js";
import { instruments } from "../instrument-registry.js";

type UnknownRecord = Record<string, unknown>;

export class GoldApiProvider {
  async fetchQuote(symbol: CommoditySymbol): Promise<PriceQuote> {
    const instrument = instruments[symbol];

    if (instrument.provider !== "gold-api") {
      throw new Error(`${symbol} is not served by Gold API`);
    }

    const baseUrl = env.GOLD_API_BASE_URL.replace(/\/+$/, "");
    const url = `${baseUrl}/price/${instrument.providerSymbol}`;
    const headers: Record<string, string> = {};

    if (env.GOLD_API_KEY) {
      headers[env.GOLD_API_KEY_HEADER] = env.GOLD_API_KEY;
    }

    const response = await axios.get<unknown>(url, {
      headers,
      timeout: env.HTTP_TIMEOUT_MS,
    });

    const data = asRecord(response.data);
    const price = readNumber(data, ["price", "ask", "mid"]);

    return {
      symbol,
      name: instrument.displayName,
      price,
      currency: readString(data, ["currency"], instrument.currency),
      unit: instrument.unit,
      source: instrument.sourceName,
      sourceUrl: url,
      observedAt: readTimestamp(data, ["timestamp", "updated_at", "updatedAt", "time"]),
      change: readOptionalNumber(data, ["change", "ch", "change_price"]),
      changePercent: readOptionalNumber(data, ["changePercent", "change_percent", "chp"]),
    };
  }
}

function asRecord(value: unknown): UnknownRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Gold API returned an invalid response");
  }

  return value as UnknownRecord;
}

function readNumber(data: UnknownRecord, keys: string[]): number {
  const value = readOptionalNumber(data, keys);

  if (value === undefined) {
    throw new Error(`Gold API response is missing numeric field ${keys.join("/")}`);
  }

  return value;
}

function readOptionalNumber(data: UnknownRecord, keys: string[]): number | undefined {
  for (const key of keys) {
    const value = data[key];

    if (value === null || value === undefined || value === "") {
      continue;
    }

    const numberValue = Number(value);

    if (Number.isFinite(numberValue)) {
      return numberValue;
    }
  }

  return undefined;
}

function readString(data: UnknownRecord, keys: string[], fallback: string): string {
  for (const key of keys) {
    const value = data[key];

    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim().toUpperCase();
    }
  }

  return fallback;
}

function readTimestamp(data: UnknownRecord, keys: string[]): string {
  for (const key of keys) {
    const value = data[key];

    if (typeof value === "number" && Number.isFinite(value)) {
      const milliseconds = value < 10_000_000_000 ? value * 1000 : value;
      return new Date(milliseconds).toISOString();
    }

    if (typeof value === "string" && value.trim().length > 0) {
      const numeric = Number(value);

      if (Number.isFinite(numeric)) {
        const milliseconds = numeric < 10_000_000_000 ? numeric * 1000 : numeric;
        return new Date(milliseconds).toISOString();
      }

      const parsed = new Date(value);

      if (!Number.isNaN(parsed.getTime())) {
        return parsed.toISOString();
      }
    }
  }

  return new Date().toISOString();
}
